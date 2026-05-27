use anyhow::anyhow;
use tokio::process::Command as TokioCommand;
use tokio::time::{timeout, Duration};

use crate::models::{ActiveWifiInterface, WifiNetwork, WifiNetworkBssid};

use super::vendor::lookup_vendor;

pub async fn get_wifi_networks_payload() -> anyhow::Result<Vec<WifiNetwork>> {
    if !cfg!(target_os = "windows") {
        anyhow::bail!("Wi-Fi scanning is currently only supported on Windows. Support for Linux and macOS is planned for a future release.");
    }

    let mut command = TokioCommand::new("netsh");
    command.args(["wlan", "show", "networks", "mode=bssid"]);
    #[cfg(target_os = "windows")]
    {
        command.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    command.kill_on_drop(true);

    let output = timeout(Duration::from_secs(5), command.output())
        .await
        .map_err(|_| anyhow!("Wi-Fi sweep timed out"))??;

    if !output.status.success() {
        anyhow::bail!("Wi-Fi sweep failed: ensure Wi-Fi adapter is enabled.");
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let networks = parse_netsh_wlan_networks(&stdout);
    Ok(networks)
}

pub async fn get_active_wifi_interface_payload() -> anyhow::Result<Option<ActiveWifiInterface>> {
    if !cfg!(target_os = "windows") {
        anyhow::bail!("Wi-Fi diagnostics are currently only supported on Windows. Support for Linux and macOS is planned for a future release.");
    }

    let mut command = TokioCommand::new("netsh");
    command.args(["wlan", "show", "interfaces"]);
    #[cfg(target_os = "windows")]
    {
        command.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    command.kill_on_drop(true);

    let output = timeout(Duration::from_secs(5), command.output())
        .await
        .map_err(|_| anyhow!("Wi-Fi interface details lookup timed out"))??;

    if !output.status.success() {
        return Ok(None);
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let interface = parse_netsh_wlan_interface(&stdout);
    Ok(interface)
}

fn parse_netsh_wlan_networks(output: &str) -> Vec<WifiNetwork> {
    let mut networks = Vec::new();
    let mut current_network: Option<WifiNetwork> = None;
    let mut current_bssid: Option<WifiNetworkBssid> = None;

    for line in output.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        if line.starts_with("SSID ") {
            if let Some(mut net) = current_network.take() {
                if let Some(bssid) = current_bssid.take() {
                    net.bssids.push(bssid);
                }
                finalize_network(&mut net);
                networks.push(net);
            }

            let parts: Vec<&str> = line.splitn(2, ':').collect();
            if parts.len() == 2 {
                let ssid = parts[1].trim().to_string();
                current_network = Some(WifiNetwork {
                    ssid: if ssid.is_empty() {
                        "<Hidden SSID>".to_string()
                    } else {
                        ssid
                    },
                    authentication: "Unknown".to_string(),
                    encryption: "Unknown".to_string(),
                    signal: 0,
                    band: "Unknown".to_string(),
                    bssids: Vec::new(),
                });
            }
        } else if let Some(ref mut net) = current_network {
            let parts: Vec<&str> = line.splitn(2, ':').collect();
            if parts.len() == 2 {
                let key = parts[0].trim().to_ascii_lowercase();
                let val = parts[1].trim().to_string();

                if key.starts_with("bssid ") {
                    if let Some(bssid) = current_bssid.take() {
                        net.bssids.push(bssid);
                    }
                    current_bssid = Some(WifiNetworkBssid {
                        bssid: val.to_ascii_uppercase(),
                        signal: 0,
                        channel: 0,
                        frequency: "Unknown".to_string(),
                        vendor: lookup_vendor(&val),
                    });
                } else if let Some(ref mut bssid) = current_bssid {
                    if key == "signal" {
                        let sig_str = val.trim_end_matches('%').trim();
                        bssid.signal = sig_str.parse().unwrap_or(0);
                    } else if key == "channel" {
                        bssid.channel = val.parse().unwrap_or(0);
                        bssid.frequency = if bssid.channel >= 36 {
                            "5 GHz".to_string()
                        } else {
                            "2.4 GHz".to_string()
                        };
                    }
                } else {
                    if key.contains("authentication") {
                        net.authentication = val;
                    } else if key.contains("encryption") {
                        net.encryption = val;
                    }
                }
            }
        }
    }

    if let Some(mut net) = current_network.take() {
        if let Some(bssid) = current_bssid.take() {
            net.bssids.push(bssid);
        }
        finalize_network(&mut net);
        networks.push(net);
    }

    networks
}

fn finalize_network(net: &mut WifiNetwork) {
    if net.bssids.is_empty() {
        return;
    }

    // De-duplicate BSSIDs by MAC address, keeping the one with higher signal strength
    // This cleans up historic cached records in Windows WLAN service during channel changes
    let mut unique_bssids: Vec<WifiNetworkBssid> = Vec::new();
    for b in net.bssids.drain(..) {
        if let Some(existing) = unique_bssids.iter_mut().find(|x| x.bssid == b.bssid) {
            if b.signal > existing.signal {
                *existing = b;
            }
        } else {
            unique_bssids.push(b);
        }
    }
    net.bssids = unique_bssids;

    net.signal = net.bssids.iter().map(|b| b.signal).max().unwrap_or(0);

    let has_2g = net.bssids.iter().any(|b| b.channel < 36);
    let has_5g = net.bssids.iter().any(|b| b.channel >= 36);

    net.band = match (has_2g, has_5g) {
        (true, true) => "Mixed".to_string(),
        (true, false) => "2.4 GHz".to_string(),
        (false, true) => "5 GHz".to_string(),
        _ => "Unknown".to_string(),
    };
}

fn parse_netsh_wlan_interface(output: &str) -> Option<ActiveWifiInterface> {
    let mut interfaces = Vec::new();
    let mut current_interface: Option<ActiveWifiInterface> = None;

    for line in output.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        let parts: Vec<&str> = line.splitn(2, ':').collect();
        if parts.len() == 2 {
            let key = parts[0].trim().to_ascii_lowercase();
            let val = parts[1].trim().to_string();

            if key == "name" {
                if let Some(iface) = current_interface.take() {
                    interfaces.push(iface);
                }
                current_interface = Some(ActiveWifiInterface {
                    name: val,
                    description: String::new(),
                    mac: String::new(),
                    state: String::new(),
                    ssid: String::new(),
                    bssid: String::new(),
                    signal: 0,
                    channel: 0,
                    receive_rate: 0,
                    transmit_rate: 0,
                    vendor: String::new(),
                });
            } else if let Some(ref mut iface) = current_interface {
                if key == "description" {
                    iface.description = val;
                } else if key == "physical address" {
                    iface.mac = val.to_ascii_uppercase();
                } else if key == "state" {
                    iface.state = val;
                } else if key == "ssid" {
                    iface.ssid = val;
                } else if key == "bssid" || key == "ap bssid" {
                    iface.bssid = val.to_ascii_uppercase();
                } else if key == "signal" {
                    let sig_str = val.trim_end_matches('%').trim();
                    iface.signal = sig_str.parse().unwrap_or(0);
                } else if key == "channel" {
                    iface.channel = val.parse().unwrap_or(0);
                } else if key == "receive rate (mbps)" {
                    iface.receive_rate = val.parse::<f32>().map(|f| f.round() as u32).unwrap_or(0);
                } else if key == "transmit rate (mbps)" {
                    iface.transmit_rate = val.parse::<f32>().map(|f| f.round() as u32).unwrap_or(0);
                }
            }
        }
    }

    if let Some(iface) = current_interface.take() {
        interfaces.push(iface);
    }

    // Resolve OUI vendors for BSSIDs of discovered active interfaces
    for iface in &mut interfaces {
        if !iface.bssid.is_empty() {
            iface.vendor = lookup_vendor(&iface.bssid);
        }
    }

    // Always locate and return the active interface that is physically "connected"
    interfaces
        .into_iter()
        .find(|iface| iface.state == "connected")
}
