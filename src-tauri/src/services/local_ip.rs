use anyhow::Context;
use serde_json::Value;
use tokio::process::Command as TokioCommand;
use tokio::time::{timeout, Duration};

use crate::models::LocalIpPayload;

const WINDOWS_NETWORK_QUERY_TIMEOUT: Duration = Duration::from_secs(5);

#[derive(Debug, Clone, Default)]
struct NetworkInterfaceDetails {
    subnet_mask: Option<String>,
    default_gateway: Option<String>,
    preferred_dns_server: Option<String>,
    alternate_dns_server: Option<String>,
    address_mode: String,
}

pub async fn build_local_ip_payload() -> anyhow::Result<LocalIpPayload> {
    let ip_address = local_ip_address::local_ip()
        .context("Failed to resolve the local IP address from this machine.")?;
    let local_ip = ip_address.to_string();
    let interface_details = load_network_interface_details(&local_ip).await;

    Ok(LocalIpPayload {
        local_ip,
        subnet_mask: interface_details.subnet_mask,
        default_gateway: interface_details.default_gateway,
        preferred_dns_server: interface_details.preferred_dns_server,
        alternate_dns_server: interface_details.alternate_dns_server,
        address_mode: interface_details.address_mode,
    })
}

async fn load_network_interface_details(local_ip: &str) -> NetworkInterfaceDetails {
    if !cfg!(target_os = "windows") {
        return unknown_network_details();
    }

    let query = r#"$ErrorActionPreference = 'Stop'; Get-CimInstance Win32_NetworkAdapterConfiguration -Filter "IPEnabled = True" | Select-Object Description, DHCPEnabled, IPAddress, IPSubnet, DefaultIPGateway, DNSServerSearchOrder | ConvertTo-Json -Compress -Depth 4"#;
    let mut command = TokioCommand::new("powershell.exe");
    command.args([
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        query,
    ]);
    #[cfg(target_os = "windows")]
    {
        command.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    command.kill_on_drop(true);

    let output = match timeout(WINDOWS_NETWORK_QUERY_TIMEOUT, command.output()).await {
        Ok(Ok(output)) => output,
        _ => return unknown_network_details(),
    };

    if !output.status.success() {
        return unknown_network_details();
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    parse_windows_network_config(local_ip, stdout.trim()).unwrap_or_else(unknown_network_details)
}

fn unknown_network_details() -> NetworkInterfaceDetails {
    NetworkInterfaceDetails {
        address_mode: "Unknown".into(),
        ..Default::default()
    }
}

fn parse_windows_network_config(local_ip: &str, raw_json: &str) -> Option<NetworkInterfaceDetails> {
    let parsed: Value = serde_json::from_str(raw_json).ok()?;
    let adapters = match &parsed {
        Value::Array(values) => values.iter().collect::<Vec<_>>(),
        Value::Object(_) => vec![&parsed],
        _ => return None,
    };

    adapters
        .iter()
        .find_map(|adapter| {
            if adapter_contains_ip(adapter, local_ip) {
                parse_windows_adapter_details(adapter, Some(local_ip))
            } else {
                None
            }
        })
        .or_else(|| {
            adapters
                .iter()
                .find_map(|adapter| parse_windows_adapter_details(adapter, None))
        })
}

fn adapter_contains_ip(adapter: &Value, local_ip: &str) -> bool {
    value_to_string_array(adapter.get("IPAddress"))
        .iter()
        .any(|address| address == local_ip)
}

fn parse_windows_adapter_details(
    adapter: &Value,
    preferred_ip: Option<&str>,
) -> Option<NetworkInterfaceDetails> {
    let ip_addresses = value_to_string_array(adapter.get("IPAddress"));

    if ip_addresses.is_empty() {
        return None;
    }

    let ip_index = preferred_ip
        .and_then(|ip| ip_addresses.iter().position(|address| address == ip))
        .or_else(|| {
            ip_addresses
                .iter()
                .position(|address| is_ipv4_address(address))
        })
        .unwrap_or(0);
    let subnet_values = value_to_string_array(adapter.get("IPSubnet"));
    let subnet_mask = subnet_values
        .get(ip_index)
        .cloned()
        .filter(|value| !value.is_empty())
        .or_else(|| {
            subnet_values
                .iter()
                .find(|value| value.contains('.'))
                .cloned()
        })
        .or_else(|| first_non_empty_value(&subnet_values));
    let gateways = value_to_string_array(adapter.get("DefaultIPGateway"));
    let default_gateway = gateways
        .iter()
        .find(|value| is_ipv4_address(value))
        .cloned()
        .or_else(|| first_non_empty_value(&gateways));
    let mut dns_servers = value_to_string_array(adapter.get("DNSServerSearchOrder"))
        .into_iter()
        .filter(|value| !value.is_empty());

    Some(NetworkInterfaceDetails {
        subnet_mask,
        default_gateway,
        preferred_dns_server: dns_servers.next(),
        alternate_dns_server: dns_servers.next(),
        address_mode: adapter_address_mode(adapter),
    })
}

fn value_to_string_array(value: Option<&Value>) -> Vec<String> {
    match value {
        Some(Value::Array(items)) => items.iter().filter_map(json_value_to_string).collect(),
        Some(value) => json_value_to_string(value).into_iter().collect(),
        None => Vec::new(),
    }
}

fn json_value_to_string(value: &Value) -> Option<String> {
    let text = match value {
        Value::String(text) => text.trim().to_string(),
        Value::Number(number) => number.to_string(),
        Value::Bool(flag) => flag.to_string(),
        _ => return None,
    };

    (!text.is_empty()).then_some(text)
}

fn first_non_empty_value(values: &[String]) -> Option<String> {
    values.iter().find(|value| !value.is_empty()).cloned()
}

fn is_ipv4_address(value: &str) -> bool {
    value.parse::<std::net::Ipv4Addr>().is_ok()
}

fn adapter_address_mode(adapter: &Value) -> String {
    match adapter.get("DHCPEnabled") {
        Some(Value::Bool(true)) => "DHCP".into(),
        Some(Value::Bool(false)) => "Static".into(),
        Some(Value::String(value)) => match value.trim().to_ascii_lowercase().as_str() {
            "true" | "yes" | "enabled" => "DHCP".into(),
            "false" | "no" | "disabled" => "Static".into(),
            _ => "Unknown".into(),
        },
        _ => "Unknown".into(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_windows_network_config_extracts_matching_adapter_details() {
        let raw_json = r#"
        [
          {
            "Description": "Virtual Adapter",
            "DHCPEnabled": false,
            "IPAddress": ["10.0.0.5"],
            "IPSubnet": ["255.255.255.0"],
            "DefaultIPGateway": ["10.0.0.1"],
            "DNSServerSearchOrder": ["9.9.9.9"]
          },
          {
            "Description": "Wi-Fi",
            "DHCPEnabled": true,
            "IPAddress": ["192.168.1.24", "fe80::3c57:abcd"],
            "IPSubnet": ["255.255.255.0", "64"],
            "DefaultIPGateway": ["192.168.1.1"],
            "DNSServerSearchOrder": ["1.1.1.1", "8.8.8.8"]
          }
        ]
        "#;

        let details = parse_windows_network_config("192.168.1.24", raw_json)
            .expect("network details should be parsed from the matching adapter");

        assert_eq!(details.subnet_mask.as_deref(), Some("255.255.255.0"));
        assert_eq!(details.default_gateway.as_deref(), Some("192.168.1.1"));
        assert_eq!(details.preferred_dns_server.as_deref(), Some("1.1.1.1"));
        assert_eq!(details.alternate_dns_server.as_deref(), Some("8.8.8.8"));
        assert_eq!(details.address_mode, "DHCP");
    }

    #[test]
    fn parse_windows_network_config_handles_single_static_adapter() {
        let raw_json = r#"
        {
          "Description": "Ethernet",
          "DHCPEnabled": false,
          "IPAddress": "172.16.0.9",
          "IPSubnet": "255.255.0.0",
          "DefaultIPGateway": "172.16.0.1",
          "DNSServerSearchOrder": "8.8.4.4"
        }
        "#;

        let details = parse_windows_network_config("172.16.0.9", raw_json)
            .expect("single adapter JSON should be parsed");

        assert_eq!(details.subnet_mask.as_deref(), Some("255.255.0.0"));
        assert_eq!(details.default_gateway.as_deref(), Some("172.16.0.1"));
        assert_eq!(details.preferred_dns_server.as_deref(), Some("8.8.4.4"));
        assert_eq!(details.alternate_dns_server, None);
        assert_eq!(details.address_mode, "Static");
    }
}
