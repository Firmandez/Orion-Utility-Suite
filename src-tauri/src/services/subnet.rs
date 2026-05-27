use std::net::Ipv4Addr;

use anyhow::Context;
use hickory_resolver::Resolver;

use crate::models::{DiscoveredDevice, SubnetScanResponse};

use super::local_ip::build_local_ip_payload;
use super::vendor::lookup_vendor;

#[link(name = "iphlpapi")]
#[cfg(target_os = "windows")]
extern "system" {
    fn GetIpNetTable(pIpNetTable: *mut u8, pdwSize: *mut u32, bOrder: i32) -> u32;
}

#[cfg(target_os = "windows")]
fn get_native_arp_table() -> anyhow::Result<Vec<(Ipv4Addr, String, String)>> {
    let mut size: u32 = 0;
    unsafe {
        GetIpNetTable(std::ptr::null_mut(), &mut size, 0);
    }

    if size == 0 {
        return Ok(Vec::new());
    }

    let mut buffer = vec![0u8; size as usize];
    let ret = unsafe { GetIpNetTable(buffer.as_mut_ptr(), &mut size, 0) };

    if ret != 0 {
        anyhow::bail!("GetIpNetTable failed with exit code: {}", ret);
    }

    if buffer.len() < 4 {
        return Ok(Vec::new());
    }

    let num_entries = u32::from_ne_bytes(buffer[0..4].try_into().unwrap()) as usize;
    let entry_size = 24;

    let mut entries = Vec::new();
    for i in 0..num_entries {
        let offset = 4 + i * entry_size;
        if offset + entry_size > buffer.len() {
            break;
        }

        let row_bytes = &buffer[offset..offset + entry_size];

        let phys_addr_len = u32::from_ne_bytes(row_bytes[4..8].try_into().unwrap()) as usize;
        let mac_bytes = &row_bytes[8..8 + phys_addr_len.min(8)];
        let ip_bytes = &row_bytes[16..20];
        let dw_type = u32::from_ne_bytes(row_bytes[20..24].try_into().unwrap());

        if dw_type == 2 {
            continue;
        }

        let ip = Ipv4Addr::new(ip_bytes[0], ip_bytes[1], ip_bytes[2], ip_bytes[3]);

        let mac = mac_bytes
            .iter()
            .map(|b| format!("{:02X}", b))
            .collect::<Vec<_>>()
            .join(":");

        let device_type = match dw_type {
            3 => "Dynamic".to_string(),
            4 => "Static".to_string(),
            _ => "Other".to_string(),
        };

        if mac == "00:00:00:00:00:00" || mac.is_empty() {
            continue;
        }

        entries.push((ip, mac, device_type));
    }

    Ok(entries)
}

#[cfg(not(target_os = "windows"))]
fn get_native_arp_table() -> anyhow::Result<Vec<(Ipv4Addr, String, String)>> {
    anyhow::bail!("Subnet scanning is currently only supported on Windows. Support for Linux and macOS is planned for a future release.")
}

pub async fn scan_subnet_payload() -> anyhow::Result<SubnetScanResponse> {
    let local_ip_payload = build_local_ip_payload().await?;
    let local_ip_parsed: Ipv4Addr = local_ip_payload
        .local_ip
        .parse()
        .context("Invalid local IP format")?;
    let subnet_mask_parsed: Ipv4Addr = local_ip_payload
        .subnet_mask
        .as_deref()
        .unwrap_or("255.255.255.0")
        .parse()
        .unwrap_or(Ipv4Addr::new(255, 255, 255, 0));

    let local_ip_u32 = u32::from(local_ip_parsed);
    let mask_u32 = u32::from(subnet_mask_parsed);
    let network_u32 = local_ip_u32 & mask_u32;
    let mut num_hosts = !mask_u32;

    if num_hosts > 512 {
        num_hosts = 255;
    }

    let mut ips = Vec::new();
    for i in 1..num_hosts {
        ips.push(Ipv4Addr::from(network_u32 + i));
    }

    if cfg!(target_os = "windows") {
        if let Ok(socket) = tokio::net::UdpSocket::bind("0.0.0.0:0").await {
            for &ip in &ips {
                let target = std::net::SocketAddr::new(std::net::IpAddr::V4(ip), 9);
                let _ = socket.send_to(&[0], target).await;
            }
        }
        tokio::time::sleep(tokio::time::Duration::from_millis(800)).await;
    }

    let arp_entries = get_native_arp_table()?;

    let resolver = Resolver::builder_tokio()
        .context("Failed to construct DNS resolver")?
        .build();

    let mut devices = Vec::new();

    let my_mac = local_ip_payload
        .default_gateway
        .as_ref()
        .map(|_| "Local Loopback".to_string())
        .unwrap_or_else(|| "00:00:00:00:00:00".to_string());

    let mut set = tokio::task::JoinSet::new();
    for (ip, mac, dev_type) in arp_entries {
        let ip_u32 = u32::from(ip);
        if (ip_u32 & mask_u32) == network_u32 {
            let resolver_clone = resolver.clone();
            let default_gateway_clone = local_ip_payload.default_gateway.clone();
            let local_ip_str = local_ip_payload.local_ip.clone();
            set.spawn(async move {
                let ip_addr = std::net::IpAddr::V4(ip);
                let hostname = match resolver_clone.reverse_lookup(ip_addr).await {
                    Ok(lookup) => {
                        if let Some(name) = lookup.iter().next() {
                            name.to_utf8().trim_end_matches('.').to_string()
                        } else {
                            "Unknown".to_string()
                        }
                    }
                    Err(_) => "Unknown".to_string(),
                };

                let is_gateway = Some(ip.to_string()) == default_gateway_clone;
                let is_local = ip.to_string() == local_ip_str;

                let custom_type = if is_local {
                    "Local PC".to_string()
                } else if is_gateway {
                    "Gateway".to_string()
                } else {
                    dev_type
                };

                let vendor = lookup_vendor(&mac);

                DiscoveredDevice {
                    ip: ip.to_string(),
                    mac,
                    device_type: custom_type,
                    vendor,
                    hostname,
                    is_alive: true,
                }
            });
        }
    }

    while let Some(res) = set.join_next().await {
        if let Ok(device) = res {
            devices.push(device);
        }
    }

    if !devices.iter().any(|d| d.ip == local_ip_payload.local_ip) {
        devices.push(DiscoveredDevice {
            ip: local_ip_payload.local_ip.clone(),
            mac: my_mac,
            device_type: "Local PC".to_string(),
            vendor: "Self".to_string(),
            hostname: "localhost".to_string(),
            is_alive: true,
        });
    }

    devices.sort_by(|a, b| {
        let ip_a: Result<Ipv4Addr, _> = a.ip.parse();
        let ip_b: Result<Ipv4Addr, _> = b.ip.parse();
        match (ip_a, ip_b) {
            (Ok(a_parsed), Ok(b_parsed)) => a_parsed.cmp(&b_parsed),
            _ => a.ip.cmp(&b.ip),
        }
    });

    let cidr = match subnet_mask_parsed.to_string().as_str() {
        "255.255.255.0" => "24",
        "255.255.0.0" => "16",
        "255.0.0.0" => "8",
        _ => "24",
    };

    let base_ip = if let Some(dot_idx) = local_ip_payload.local_ip.rfind('.') {
        &local_ip_payload.local_ip[0..dot_idx]
    } else {
        "192.168.1"
    };

    Ok(SubnetScanResponse {
        subnet: format!("{}.0/{}", base_ip, cidr),
        local_ip: local_ip_payload.local_ip,
        devices,
    })
}
