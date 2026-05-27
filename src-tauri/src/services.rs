use std::fs::{self, File};
use std::io::{BufReader, BufWriter, Read};
use std::net::IpAddr;
use std::path::{Path, PathBuf};

use anyhow::{anyhow, bail, Context};
use hickory_resolver::Resolver;
use image::codecs::jpeg::JpegEncoder;
use image::codecs::png::{CompressionType, FilterType as PngFilterType, PngEncoder};
use image::{imageops::FilterType, DynamicImage, ImageEncoder, ImageReader, Rgb, RgbImage};
use regex::Regex;
use reqwest::{redirect, Client, Url};
use serde_json::Value;
use sha1::{Digest as _, Sha1};
use sha2::Sha256;
use tauri::{Emitter, Manager};
use tokio::net::TcpStream;
use tokio::process::Command as TokioCommand;
use tokio::time::{timeout, Duration, Instant};

use crate::models::{
    AppBootstrapPayload, AppModuleSummary, ConvertImagesOptionsPayload, DnsLookupPayload,
    HashProgressPayload, HashResultPayload, HttpStatusPayload, ImageConversionFileResultPayload,
    ImageConversionProgressPayload, ImageConversionResponsePayload, ImageOutputFormatPayload,
    ImageResizeOptionsPayload, LocalIpPayload, PingHostPayload, PortCheckPayload,
    SystemInfoPayload,
};

const DEFAULT_JPG_QUALITY: u8 = 88;
const HASH_CHUNK_SIZE: usize = 256 * 1024;
const HASH_PROGRESS_EVENT: &str = "hash-progress";
const IMAGE_CONVERSION_PROGRESS_EVENT: &str = "image-conversion-progress";
const DNS_LOOKUP_TIMEOUT: Duration = Duration::from_secs(5);
const WINDOWS_NETWORK_QUERY_TIMEOUT: Duration = Duration::from_secs(5);
const PING_TIMEOUT: Duration = Duration::from_secs(4);
const PORT_CHECK_TIMEOUT: Duration = Duration::from_secs(3);
const HTTP_CONNECT_TIMEOUT: Duration = Duration::from_secs(4);
const HTTP_REQUEST_TIMEOUT: Duration = Duration::from_secs(8);

#[derive(Debug, Clone, Default)]
struct NetworkInterfaceDetails {
    subnet_mask: Option<String>,
    default_gateway: Option<String>,
    preferred_dns_server: Option<String>,
    alternate_dns_server: Option<String>,
    address_mode: String,
}

pub async fn build_bootstrap_payload() -> AppBootstrapPayload {
    let modules = vec![
        AppModuleSummary {
            id: "dashboard".into(),
            title: "Dashboard".into(),
            area: "Overview".into(),
            status: "Scaffolded".into(),
        },
        AppModuleSummary {
            id: "qr-generator".into(),
            title: "QR Generator".into(),
            area: "Data encoding".into(),
            status: "Stage 3".into(),
        },
        AppModuleSummary {
            id: "image-converter".into(),
            title: "Image Converter".into(),
            area: "Media tools".into(),
            status: "Stage 6".into(),
        },
        AppModuleSummary {
            id: "pdf-tools".into(),
            title: "PDF Tools".into(),
            area: "Document tools".into(),
            status: "Stage 8".into(),
        },
        AppModuleSummary {
            id: "text-utilities".into(),
            title: "Text Utilities".into(),
            area: "String transforms".into(),
            status: "Stage 4".into(),
        },
        AppModuleSummary {
            id: "hash-checker".into(),
            title: "Hash Checker".into(),
            area: "Integrity checks".into(),
            status: "Stage 5".into(),
        },
        AppModuleSummary {
            id: "network-toolkit".into(),
            title: "Network Toolkit".into(),
            area: "Diagnostics".into(),
            status: "Stage 7".into(),
        },
        AppModuleSummary {
            id: "developer-tools".into(),
            title: "Developer Tools".into(),
            area: "Payload helpers".into(),
            status: "Stage 9".into(),
        },
        AppModuleSummary {
            id: "settings".into(),
            title: "Settings".into(),
            area: "System".into(),
            status: "Stage 10".into(),
        },
    ];

    AppBootstrapPayload {
        app_name: "Orion Utility Suite".into(),
        version: env!("CARGO_PKG_VERSION").into(),
        backend_mode: "Local Tauri commands".into(),
        platform_label: std::env::consts::OS.into(),
        runtime_status: "Stage 10 settings, polish, and build-readiness ready".into(),
        offline_ready: true,
        modules,
    }
}

pub async fn build_system_info_payload() -> SystemInfoPayload {
    SystemInfoPayload {
        os: std::env::consts::OS.into(),
        architecture: std::env::consts::ARCH.into(),
        app_version: env!("CARGO_PKG_VERSION").into(),
    }
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

pub async fn dns_lookup_payload(domain: String) -> anyhow::Result<DnsLookupPayload> {
    let validated_domain = validate_host_input(&domain)?;
    let resolver = Resolver::builder_tokio()
        .context("Failed to create the DNS resolver with host system configuration.")?
        .build();

    let lookup = timeout(
        DNS_LOOKUP_TIMEOUT,
        resolver.lookup_ip(validated_domain.as_str()),
    )
    .await
    .map_err(|_| {
        anyhow!(
            "DNS lookup timed out after {} seconds.",
            DNS_LOOKUP_TIMEOUT.as_secs()
        )
    })?
    .with_context(|| format!("DNS lookup failed for {validated_domain}."))?;

    let mut addresses = lookup
        .iter()
        .map(|address| address.to_string())
        .collect::<Vec<_>>();

    addresses.sort();
    addresses.dedup();

    if addresses.is_empty() {
        bail!("No A or AAAA records were returned for {validated_domain}.");
    }

    Ok(DnsLookupPayload {
        domain: validated_domain,
        addresses,
    })
}

pub async fn ping_host_payload(host: String) -> anyhow::Result<PingHostPayload> {
    let validated_host = validate_host_input(&host)?;
    let mut command = TokioCommand::new("ping");
    let command_arguments = build_ping_arguments(validated_host.as_str());

    command.args(command_arguments).arg(validated_host.as_str());
    #[cfg(target_os = "windows")]
    {
        command.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    command.kill_on_drop(true);

    let started_at = Instant::now();
    let output = timeout(PING_TIMEOUT, command.output())
        .await
        .map_err(|_| anyhow!("Ping timed out after {} seconds.", PING_TIMEOUT.as_secs()))?
        .with_context(|| format!("Failed to run the system ping command for {validated_host}."))?;
    let duration_ms = started_at.elapsed().as_millis() as u64;
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let combined_output = if stdout.is_empty() {
        stderr.clone()
    } else if stderr.is_empty() {
        stdout.clone()
    } else {
        format!("{stdout}\n{stderr}")
    };
    let reachable = output.status.success();
    let summary = if reachable {
        format!("{validated_host} responded to one ping probe.")
    } else {
        format!("{validated_host} did not respond to the ping probe.")
    };

    Ok(PingHostPayload {
        host: validated_host,
        reachable,
        exit_code: output.status.code(),
        duration_ms,
        summary,
        output: combined_output,
    })
}

pub async fn check_port_payload(host: String, port: u16) -> anyhow::Result<PortCheckPayload> {
    let validated_host = validate_host_input(&host)?;
    validate_port(port)?;

    let started_at = Instant::now();
    let is_open = match timeout(
        PORT_CHECK_TIMEOUT,
        TcpStream::connect((validated_host.as_str(), port)),
    )
    .await
    {
        Ok(Ok(_stream)) => true,
        Ok(Err(_)) => false,
        Err(_) => false,
    };
    let duration_ms = started_at.elapsed().as_millis() as u64;
    let summary = if is_open {
        format!("TCP connection to {validated_host}:{port} succeeded.")
    } else if duration_ms >= PORT_CHECK_TIMEOUT.as_millis() as u64 {
        format!("TCP connection to {validated_host}:{port} timed out.")
    } else {
        format!("TCP connection to {validated_host}:{port} was refused or unreachable.")
    };

    Ok(PortCheckPayload {
        host: validated_host,
        port,
        is_open,
        duration_ms,
        summary,
    })
}

pub async fn check_http_status_payload(url: String) -> anyhow::Result<HttpStatusPayload> {
    let normalized_url = normalize_http_url_input(&url)?;
    let client = Client::builder()
        .connect_timeout(HTTP_CONNECT_TIMEOUT)
        .timeout(HTTP_REQUEST_TIMEOUT)
        .redirect(redirect::Policy::limited(5))
        .build()
        .context("Failed to initialize the HTTP client for status checking.")?;

    let response = client
        .get(normalized_url.clone())
        .send()
        .await
        .with_context(|| format!("HTTP request failed for {normalized_url}."))?;
    let status_code = response.status();
    let final_url = response.url().to_string();
    let ok = status_code.is_success();
    let summary = if ok {
        format!(
            "HTTP request completed successfully with status {}.",
            status_code.as_u16()
        )
    } else {
        format!(
            "HTTP request completed with status {}.",
            status_code.as_u16()
        )
    };

    Ok(HttpStatusPayload {
        url: normalized_url,
        final_url,
        status_code: status_code.as_u16(),
        ok,
        summary,
    })
}

pub async fn convert_images_payload(
    window: tauri::Window,
    options: ConvertImagesOptionsPayload,
) -> anyhow::Result<ImageConversionResponsePayload> {
    let app_handle = window.app_handle().clone();
    let window_label = window.label().to_string();

    tokio::task::spawn_blocking(move || {
        validate_convert_options(&options)?;

        let output_folder = PathBuf::from(&options.output_folder_path);

        if output_folder.exists() {
            if !output_folder.is_dir() {
                bail!(
                    "Output target is not a directory: {}",
                    output_folder.display()
                );
            }
        } else {
            fs::create_dir_all(&output_folder).map_err(|error| {
                map_file_io_error(error, &output_folder, "create output folder")
            })?;
        }

        let total_files = options.input_paths.len();
        let mut results = Vec::with_capacity(total_files);
        let mut success_count = 0_usize;
        let mut failed_count = 0_usize;

        emit_image_conversion_progress(
            &app_handle,
            &window_label,
            "",
            "Batch queue",
            0,
            total_files,
            success_count,
            failed_count,
            "Preparing image conversion batch",
        )?;

        for (index, input_path) in options.input_paths.iter().enumerate() {
            let current_file_name = get_base_name(input_path);
            let start_status = format!(
                "Converting {current_file_name} ({}/{total_files})",
                index + 1
            );

            emit_image_conversion_progress(
                &app_handle,
                &window_label,
                input_path,
                &current_file_name,
                index,
                total_files,
                success_count,
                failed_count,
                &start_status,
            )?;

            let conversion_result = convert_single_image(
                input_path,
                &output_folder,
                &options.output_format,
                options.quality,
                &options.resize,
                options.compress,
            );

            let (result_row, end_status) = match conversion_result {
                Ok(output_path) => {
                    success_count += 1;
                    (
                        ImageConversionFileResultPayload {
                            input_path: input_path.clone(),
                            output_path: Some(output_path.to_string_lossy().into_owned()),
                            status: "success".into(),
                            error_message: None,
                        },
                        format!("Converted {current_file_name}"),
                    )
                }
                Err(error) => {
                    failed_count += 1;
                    (
                        ImageConversionFileResultPayload {
                            input_path: input_path.clone(),
                            output_path: None,
                            status: "failed".into(),
                            error_message: Some(error.to_string()),
                        },
                        format!("Failed {current_file_name}"),
                    )
                }
            };

            results.push(result_row);

            emit_image_conversion_progress(
                &app_handle,
                &window_label,
                input_path,
                &current_file_name,
                index + 1,
                total_files,
                success_count,
                failed_count,
                &end_status,
            )?;
        }

        Ok(ImageConversionResponsePayload {
            output_folder_path: options.output_folder_path,
            total_files,
            success_count,
            failed_count,
            results,
        })
    })
    .await
    .context("Image conversion worker panicked before completing.")?
}

pub async fn generate_hash_payload(
    window: tauri::Window,
    file_path: String,
) -> anyhow::Result<HashResultPayload> {
    let app_handle = window.app_handle().clone();
    let window_label = window.label().to_string();

    tokio::task::spawn_blocking(move || {
        let path = PathBuf::from(&file_path);
        let metadata = std::fs::metadata(&path)
            .map_err(|error| map_file_io_error(error, &path, "read metadata for"))?;

        if !metadata.is_file() {
            bail!("Selected path is not a file: {}", path.display());
        }

        let file_name = path
            .file_name()
            .and_then(|value| value.to_str())
            .map(ToOwned::to_owned)
            .unwrap_or_else(|| "unknown-file".into());
        let total_bytes = metadata.len();

        emit_hash_progress(
            &app_handle,
            &window_label,
            &file_path,
            &file_name,
            0,
            total_bytes,
            "Opening file",
        )?;

        let file = File::open(&path).map_err(|error| map_file_io_error(error, &path, "open"))?;
        let mut reader = BufReader::with_capacity(HASH_CHUNK_SIZE, file);
        let mut buffer = vec![0_u8; HASH_CHUNK_SIZE];
        let mut md5_context = md5::Context::new();
        let mut sha1_hasher = Sha1::new();
        let mut sha256_hasher = Sha256::new();
        let mut bytes_processed = 0_u64;
        let mut last_progress = 0_u8;

        loop {
            let bytes_read = reader
                .read(&mut buffer)
                .map_err(|error| map_file_io_error(error, &path, "read"))?;

            if bytes_read == 0 {
                break;
            }

            let chunk = &buffer[..bytes_read];
            md5_context.consume(chunk);
            sha1_hasher.update(chunk);
            sha256_hasher.update(chunk);

            bytes_processed += bytes_read as u64;
            let progress_percent = compute_progress_percent(bytes_processed, total_bytes);

            if progress_percent > last_progress || bytes_processed == total_bytes {
                last_progress = progress_percent;
                emit_hash_progress(
                    &app_handle,
                    &window_label,
                    &file_path,
                    &file_name,
                    bytes_processed,
                    total_bytes,
                    "Hashing file",
                )?;
            }
        }

        emit_hash_progress(
            &app_handle,
            &window_label,
            &file_path,
            &file_name,
            total_bytes,
            total_bytes,
            "Finalizing hash digests",
        )?;

        let result = HashResultPayload {
            file_name,
            file_size: total_bytes,
            md5: format!("{:x}", md5_context.compute()),
            sha1: format!("{:x}", sha1_hasher.finalize()),
            sha256: format!("{:x}", sha256_hasher.finalize()),
        };

        emit_hash_progress(
            &app_handle,
            &window_label,
            &file_path,
            &result.file_name,
            total_bytes,
            total_bytes,
            "Completed",
        )?;

        Ok(result)
    })
    .await
    .context("Hash worker panicked before completing.")?
}

fn validate_convert_options(options: &ConvertImagesOptionsPayload) -> anyhow::Result<()> {
    if options.input_paths.is_empty() {
        bail!("Select at least one image before starting conversion.");
    }

    if options.output_folder_path.trim().is_empty() {
        bail!("Choose an output folder before starting conversion.");
    }

    if let Some(quality) = options.quality {
        if !(1..=100).contains(&quality) {
            bail!("JPG quality must be between 1 and 100.");
        }
    }

    if options.resize.enabled {
        if options.resize.width.is_none() && options.resize.height.is_none() {
            bail!("Resize is enabled, but width and height are both empty.");
        }

        if matches!(options.resize.width, Some(0)) || matches!(options.resize.height, Some(0)) {
            bail!("Resize width and height must be greater than 0.");
        }
    }

    Ok(())
}

fn convert_single_image(
    input_path: &str,
    output_folder: &Path,
    output_format: &ImageOutputFormatPayload,
    quality: Option<u8>,
    resize: &ImageResizeOptionsPayload,
    compress: bool,
) -> anyhow::Result<PathBuf> {
    let source_path = PathBuf::from(input_path);
    let metadata = fs::metadata(&source_path)
        .map_err(|error| map_file_io_error(error, &source_path, "read metadata for"))?;

    if !metadata.is_file() {
        bail!("Selected path is not a file: {}", source_path.display());
    }

    normalize_image_extension(&source_path).ok_or_else(|| {
        anyhow!(
            "Unsupported image extension for {}. Supported extensions: PNG, JPG, JPEG, WEBP.",
            source_path.display()
        )
    })?;

    let decoded_image = ImageReader::open(&source_path)
        .map_err(|error| map_file_io_error(error, &source_path, "open"))?
        .with_guessed_format()
        .context("Failed to detect image format from the selected file.")?
        .decode()
        .with_context(|| {
            format!(
                "Failed to decode image data from {}.",
                source_path.display()
            )
        })?;

    let resized_image = apply_resize(decoded_image, resize);
    let output_path = build_output_path(output_folder, &source_path, output_format)?;

    save_converted_image(
        &resized_image,
        &output_path,
        output_format,
        quality,
        compress,
    )?;

    Ok(output_path)
}

fn apply_resize(image: DynamicImage, resize: &ImageResizeOptionsPayload) -> DynamicImage {
    if !resize.enabled {
        return image;
    }

    let Some((target_width, target_height)) =
        calculate_resize_dimensions(image.width(), image.height(), resize.width, resize.height)
    else {
        return image;
    };

    if target_width == image.width() && target_height == image.height() {
        return image;
    }

    image.resize(target_width, target_height, FilterType::Lanczos3)
}

fn calculate_resize_dimensions(
    current_width: u32,
    current_height: u32,
    requested_width: Option<u32>,
    requested_height: Option<u32>,
) -> Option<(u32, u32)> {
    match (requested_width, requested_height) {
        (None, None) => None,
        (Some(width), None) => Some((
            width.max(1),
            ((current_height as f64 * width as f64) / current_width as f64).round() as u32,
        )),
        (None, Some(height)) => Some((
            ((current_width as f64 * height as f64) / current_height as f64).round() as u32,
            height.max(1),
        )),
        (Some(width), Some(height)) => {
            let width_ratio = width as f64 / current_width as f64;
            let height_ratio = height as f64 / current_height as f64;
            let scale = width_ratio.min(height_ratio);

            Some((
                ((current_width as f64 * scale).round() as u32).max(1),
                ((current_height as f64 * scale).round() as u32).max(1),
            ))
        }
    }
}

fn build_output_path(
    output_folder: &Path,
    source_path: &Path,
    output_format: &ImageOutputFormatPayload,
) -> anyhow::Result<PathBuf> {
    let stem = source_path
        .file_stem()
        .and_then(|value| value.to_str())
        .filter(|value| !value.is_empty())
        .unwrap_or("image");
    let extension = resolve_output_extension(output_format);
    let mut candidate = output_folder.join(format!("{stem}.{extension}"));

    if candidate == source_path || candidate.exists() {
        candidate = output_folder.join(format!("{stem}-orion-converted.{extension}"));
        let mut suffix = 2_u32;

        while candidate == source_path || candidate.exists() {
            candidate = output_folder.join(format!("{stem}-orion-converted-{suffix}.{extension}"));
            suffix += 1;
        }
    }

    Ok(candidate)
}

fn save_converted_image(
    image: &DynamicImage,
    output_path: &Path,
    output_format: &ImageOutputFormatPayload,
    quality: Option<u8>,
    compress: bool,
) -> anyhow::Result<()> {
    let file = File::create(output_path)
        .map_err(|error| map_file_io_error(error, output_path, "create"))?;
    let mut writer = BufWriter::new(file);

    match output_format {
        ImageOutputFormatPayload::Jpg => {
            let rgb_image = flatten_image_for_jpeg(image);
            let mut encoder =
                JpegEncoder::new_with_quality(&mut writer, sanitize_jpg_quality(quality));
            encoder
                .encode_image(&DynamicImage::ImageRgb8(rgb_image))
                .with_context(|| format!("Failed to encode JPEG for {}.", output_path.display()))?;
        }
        ImageOutputFormatPayload::Png => {
            let rgba_image = image.to_rgba8();
            let compression = if compress {
                CompressionType::Best
            } else {
                CompressionType::Fast
            };
            let filter = if compress {
                PngFilterType::Adaptive
            } else {
                PngFilterType::NoFilter
            };

            PngEncoder::new_with_quality(&mut writer, compression, filter)
                .write_image(
                    rgba_image.as_raw(),
                    rgba_image.width(),
                    rgba_image.height(),
                    image::ExtendedColorType::Rgba8,
                )
                .with_context(|| format!("Failed to encode PNG for {}.", output_path.display()))?;
        }
    }

    Ok(())
}

fn flatten_image_for_jpeg(image: &DynamicImage) -> RgbImage {
    let rgba_image = image.to_rgba8();
    let (width, height) = rgba_image.dimensions();
    let mut rgb_image = RgbImage::new(width, height);

    for (x, y, pixel) in rgba_image.enumerate_pixels() {
        let [red, green, blue, alpha] = pixel.0;
        let alpha_ratio = alpha as f32 / 255.0;
        let blend_channel = |value: u8| -> u8 {
            ((value as f32 * alpha_ratio) + (255.0 * (1.0 - alpha_ratio))).round() as u8
        };

        rgb_image.put_pixel(
            x,
            y,
            Rgb([
                blend_channel(red),
                blend_channel(green),
                blend_channel(blue),
            ]),
        );
    }

    rgb_image
}

fn normalize_image_extension(path: &Path) -> Option<&'static str> {
    let extension = path.extension()?.to_str()?.to_ascii_lowercase();

    match extension.as_str() {
        "png" => Some("png"),
        "jpg" | "jpeg" => Some("jpg"),
        "webp" => Some("webp"),
        _ => None,
    }
}

fn resolve_output_extension(format: &ImageOutputFormatPayload) -> &'static str {
    match format {
        ImageOutputFormatPayload::Jpg => "jpg",
        ImageOutputFormatPayload::Png => "png",
    }
}

fn sanitize_jpg_quality(quality: Option<u8>) -> u8 {
    quality.unwrap_or(DEFAULT_JPG_QUALITY).clamp(1, 100)
}

fn get_base_name(path: &str) -> String {
    Path::new(path)
        .file_name()
        .and_then(|value| value.to_str())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| "image-file".into())
}

fn validate_host_input(value: &str) -> anyhow::Result<String> {
    let trimmed = value.trim();

    if trimmed.is_empty() {
        bail!("Host cannot be empty.");
    }

    if trimmed.contains(char::is_whitespace) {
        bail!("Host cannot contain spaces.");
    }

    if trimmed.len() > 255 {
        bail!("Host is too long.");
    }

    if trimmed.parse::<IpAddr>().is_ok() {
        return Ok(trimmed.to_string());
    }

    let hostname_pattern = Regex::new(
        r"(?i)^(localhost|[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*)\.?$",
    )
    .expect("hostname validation regex should be valid");

    if hostname_pattern.is_match(trimmed) {
        return Ok(trimmed.to_string());
    }

    bail!("Invalid host or domain format.");
}

fn validate_port(port: u16) -> anyhow::Result<()> {
    if port == 0 {
        bail!("Port must be between 1 and 65535.");
    }

    Ok(())
}

fn normalize_http_url_input(value: &str) -> anyhow::Result<String> {
    let trimmed = value.trim();

    if trimmed.is_empty() {
        bail!("URL cannot be empty.");
    }

    let candidate = if trimmed.contains("://") {
        trimmed.to_string()
    } else {
        format!("https://{trimmed}")
    };

    let parsed = Url::parse(&candidate).with_context(|| format!("Invalid URL: {trimmed}."))?;

    match parsed.scheme() {
        "http" | "https" => {}
        scheme => bail!("Unsupported URL scheme: {scheme}. Use http or https."),
    }

    if parsed.host_str().is_none() {
        bail!("URL must include a valid host.");
    }

    Ok(parsed.to_string())
}

fn build_ping_arguments(_host: &str) -> Vec<&'static str> {
    if cfg!(target_os = "windows") {
        vec!["-n", "1"]
    } else {
        vec!["-c", "1"]
    }
}

fn emit_hash_progress(
    app_handle: &tauri::AppHandle,
    window_label: &str,
    file_path: &str,
    file_name: &str,
    bytes_processed: u64,
    total_bytes: u64,
    status: &str,
) -> anyhow::Result<()> {
    let payload = HashProgressPayload {
        file_path: file_path.into(),
        file_name: file_name.into(),
        bytes_processed,
        total_bytes,
        progress_percent: compute_progress_percent(bytes_processed, total_bytes),
        status: status.into(),
    };

    app_handle
        .emit_to(window_label, HASH_PROGRESS_EVENT, payload)
        .map_err(|error| anyhow!("Failed to emit hash progress event: {error}"))?;

    Ok(())
}

fn emit_image_conversion_progress(
    app_handle: &tauri::AppHandle,
    window_label: &str,
    current_file_path: &str,
    current_file_name: &str,
    processed_files: usize,
    total_files: usize,
    success_count: usize,
    failed_count: usize,
    status: &str,
) -> anyhow::Result<()> {
    let payload = ImageConversionProgressPayload {
        current_file_name: current_file_name.into(),
        current_file_path: current_file_path.into(),
        processed_files,
        total_files,
        success_count,
        failed_count,
        progress_percent: compute_progress_percent(processed_files as u64, total_files as u64),
        status: status.into(),
    };

    app_handle
        .emit_to(window_label, IMAGE_CONVERSION_PROGRESS_EVENT, payload)
        .map_err(|error| anyhow!("Failed to emit image conversion progress event: {error}"))?;

    Ok(())
}

fn compute_progress_percent(bytes_processed: u64, total_bytes: u64) -> u8 {
    if total_bytes == 0 {
        return 100;
    }

    let progress = ((bytes_processed as f64 / total_bytes as f64) * 100.0).round() as u8;
    progress.clamp(0, 100)
}

fn map_file_io_error(error: std::io::Error, path: &Path, action: &str) -> anyhow::Error {
    match error.kind() {
        std::io::ErrorKind::NotFound => anyhow!("File not found: {}", path.display()),
        std::io::ErrorKind::PermissionDenied => {
            anyhow!(
                "Permission denied while trying to {action} {}.",
                path.display()
            )
        }
        _ => anyhow!("Failed to {action} {}: {error}", path.display()),
    }
}

// ==========================================
// Subnet Scanner & Wi-Fi Analyzer Implementations
// ==========================================

use crate::models::{ActiveWifiInterface, DiscoveredDevice, SubnetScanResponse, WifiNetwork, WifiNetworkBssid};
use std::net::Ipv4Addr;

const MAC_VENDORS: &[(&str, &str)] = &[
    ("00:00:0C", "Cisco"),
    ("00:03:93", "Apple"),
    ("00:05:cd", "Denon"),
    ("00:06:86", "FiberHome"),
    ("00:06:25", "Linksys"),
    ("00:09:5B", "Netgear"),
    ("00:0F:3D", "D-Link"),
    ("00:11:24", "Apple"),
    ("00:14:22", "Dell"),
    ("00:15:EB", "ZTE"),
    ("00:16:3E", "Xen / Virtual Machine"),
    ("00:18:39", "Linksys"),
    ("00:19:C6", "ZTE"),
    ("00:19:E3", "TP-Link"),
    ("00:1A:11", "Google"),
    ("00:1B:FC", "ASUS"),
    ("00:1C:42", "Parallels / Virtual Machine"),
    ("00:1D:C9", "Garmin"),
    ("00:1E:10", "Huawei"),
    ("00:21:27", "TP-Link"),
    ("00:21:70", "Dell"),
    ("00:22:93", "ZTE"),
    ("00:22:A1", "Huawei"),
    ("00:23:CD", "TP-Link"),
    ("00:24:8C", "ASUS"),
    ("00:25:90", "Supermicro"),
    ("00:26:BB", "Apple"),
    ("00:50:56", "VMware / Virtual Machine"),
    ("00:B0:0C", "Tenda"),
    ("00:E0:FC", "Oppo"),
    ("00:e0:4c", "Realtek"),
    ("00:F0:8A", "Vivo"),
    ("04:18:B6", "Ubiquiti"),
    ("04:D4:C4", "Samsung"),
    ("08:00:27", "VirtualBox / Virtual Machine"),
    ("0C:80:63", "TP-Link"),
    ("0C:9D:92", "Xiaomi"),
    ("0C:A6:94", "Realme"),
    ("10:D0:7A", "Intel"),
    ("10:D5:61", "Tuya Smart"),
    ("14:3E:BF", "Oppo"),
    ("14:CF:92", "TP-Link"),
    ("18:E8:29", "Ubiquiti"),
    ("1C:3B:F3", "Intel"),
    ("1C:73:E2", "Huawei"),
    ("1C:87:2C", "ASUS"),
    ("1C:8E:5C", "ZTE"),
    ("20:28:BC", "Hikvision"),
    ("24:0A:C4", "Espressif"),
    ("24:A0:74", "Apple"),
    ("24:DF:6A", "Huawei"),
    ("28:D2:44", "Intel"),
    ("2C:22:8B", "Vivo"),
    ("30:30:F2", "Espressif"),
    ("30:5A:3A", "ASUS"),
    ("30:86:2C", "Huawei"),
    ("30:AE:A4", "Espressif"),
    ("3C:5A:B4", "Google"),
    ("3C:D9:2B", "Hewlett Packard"),
    ("3C:DF:BD", "ZTE"),
    ("3C:E1:A1", "Intel"),
    ("40:40:A7", "Vivo"),
    ("40:8D:5C", "Apple"),
    ("44:19:B6", "Hikvision"),
    ("48:2C:6A", "TP-Link"),
    ("4C:1F:CC", "Huawei"),
    ("4C:5E:0C", "Huawei"),
    ("50:2F:9B", "TP-Link"),
    ("50:78:B3", "Apple"),
    ("50:8A:06", "Tuya Smart"),
    ("50:C7:BF", "TP-Link"),
    ("54:39:DF", "Huawei"),
    ("54:5A:A6", "Espressif"),
    ("54:A5:1B", "Huawei"),
    ("54:B8:0A", "Lenovo"),
    ("5C:C9:D3", "Sony"),
    ("5C:F6:DC", "Realme"),
    ("60:03:08", "Apple"),
    ("60:38:E0", "Samsung"),
    ("64:09:80", "Apple"),
    ("68:57:2D", "Tuya Smart"),
    ("70:89:76", "Tuya Smart"),
    ("70:8B:CD", "ASUS"),
    ("74:DA:38", "TP-Link"),
    ("78:3E:5D", "Vivo"),
    ("7C:60:97", "Huawei"),
    ("7C:78:B2", "Oppo"),
    ("7C:8B:CA", "Intel"),
    ("7C:C5:37", "Xiaomi"),
    ("80:7A:BF", "Raspberry Pi"),
    ("84:1E:19", "Realme"),
    ("84:74:12", "ZTE"),
    ("84:F3:EB", "TP-Link"),
    ("88:66:5A", "Apple"),
    ("88:81:4A", "Vivo"),
    ("8c:85:90", "Apple"),
    ("90:02:A9", "Dahua"),
    ("90:09:D0", "Xiaomi"),
    ("90:48:9A", "Intel"),
    ("9C:20:7B", "Intel"),
    ("9C:C1:21", "ZTE"),
    ("9C:CB:83", "Oppo"),
    ("A0:20:A6", "Espressif"),
    ("A0:9E:1A", "Oppo"),
    ("A0:BD:1D", "Hikvision"),
    ("A0:C5:89", "Intel"),
    ("A0:F3:C1", "TP-Link"),
    ("A4:2B:B0", "Linksys"),
    ("A4:3E:51", "Huawei"),
    ("A8:42:E3", "Espressif"),
    ("A8:57:4E", "TP-Link"),
    ("A8:5E:45", "ASUS"),
    ("B0:C5:54", "Intel"),
    ("B4:12:F1", "Vivo"),
    ("B4:2E:99", "Intel"),
    ("B4:8B:C9", "Intel"),
    ("B8:27:EB", "Raspberry Pi"),
    ("B8:85:84", "Intel"),
    ("BC:32:AC", "Dahua"),
    ("BC:62:0E", "Hikvision"),
    ("BC:EC:5D", "Hikvision"),
    ("C0:3E:BA", "Intel"),
    ("C0:49:EF", "Espressif"),
    ("C0:56:E3", "Apple"),
    ("C0:84:7D", "Oppo"),
    ("C0:A7:27", "Huawei"),
    ("C4:9E:C8", "Intel"),
    ("C8:2B:96", "Espressif"),
    ("C8:3A:35", "Realme"),
    ("C8:D7:19", "Intel"),
    ("CC:50:E3", "Espressif"),
    ("D0:5B:A8", "ZTE"),
    ("D4:3B:04", "Huawei"),
    ("D4:5D:64", "Intel"),
    ("D8:13:99", "Oppo"),
    ("D8:1C:2A", "Tuya Smart"),
    ("D8:3B:BF", "Intel"),
    ("D8:49:0B", "Huawei"),
    ("D8:50:E6", "ASUS"),
    ("D8:EC:5E", "Intel"),
    ("DC:A6:32", "Raspberry Pi"),
    ("E0:41:38", "Oppo"),
    ("E0:50:8B", "Dahua"),
    ("E0:D5:5E", "Intel"),
    ("E4:E4:AB", "Intel"),
    ("E4:F8:9C", "Intel"),
    ("E8:07:BF", "Vivo"),
    ("E8:86:14", "Realme"),
    ("E8:DB:84", "Espressif"),
    ("EC:08:6B", "Intel"),
    ("EC:2C:E2", "Intel"),
    ("EC:8E:B5", "Intel"),
    ("EC:E7:A2", "Apple"),
    ("EC:F3:42", "ZTE"),
    ("F0:18:98", "Apple"),
    ("F4:3F:61", "Intel"),
    ("F4:F2:6D", "Intel"),
    ("F8:32:E4", "Intel"),
    ("FC:34:97", "ASUS"),
    ("FC:AA:14", "Intel"),
    ("FC:E5:57", "Vivo"),
];

fn to_title_case(s: &str) -> String {
    let mut result = String::new();
    let mut capitalize_next = true;
    
    for c in s.chars() {
        if c.is_alphanumeric() {
            if capitalize_next {
                result.push(c.to_ascii_uppercase());
                capitalize_next = false;
            } else {
                result.push(c.to_ascii_lowercase());
            }
        } else {
            result.push(c);
            capitalize_next = true;
        }
    }
    result
}

fn lookup_vendor(mac: &str) -> String {
    use std::collections::HashMap;
    use std::sync::OnceLock;

    static OUI_DATABASE: OnceLock<HashMap<String, String>> = OnceLock::new();

    let normalized: String = mac
        .replace(&[':', '-'][..], "")
        .to_ascii_lowercase();
        
    if normalized.len() < 6 {
        return "Unknown".to_string();
    }
    
    // Explicit protection for local loopback / active system references
    if normalized.contains("loopback") || normalized == "self" {
        return "Self".to_string();
    }
    
    // Check if it is a locally administered / randomized Private MAC address.
    // By IEEE networking standards, randomized unicast MACs always end their first byte
    // with binary '10', meaning the second character of the MAC string is '2', '6', 'a', or 'e'.
    if normalized.len() >= 2 {
        let second_char = normalized.chars().nth(1).unwrap_or('0');
        if second_char == '2' || second_char == '6' || second_char == 'a' || second_char == 'e' {
            return "Private MAC (Randomized)".to_string();
        }
    }
    
    let prefix = &normalized[0..6];
    
    let db = OUI_DATABASE.get_or_init(|| {
        let mut map = HashMap::new();
        
        // 1. Populate with the curated manual list first as a baseline
        for &(oui, vendor) in MAC_VENDORS {
            let oui_clean = oui.replace(&[':', '-'][..], "").to_ascii_lowercase();
            map.insert(oui_clean, to_title_case(vendor));
        }
        
        // 2. Dynamically parse the complete official IEEE OUI registry file embedded at compile time.
        // The file is located in the `resources` directory relative to this source file.
        const OUI_DATA: &str = include_str!("../resources/standards-oui.ieee.org.txt");
        for line in OUI_DATA.lines() {
            if line.contains("(hex)") {
                let parts: Vec<&str> = line.split("(hex)").collect();
                if parts.len() >= 2 {
                    let oui = parts[0].replace(&[':', '-'][..], "").trim().to_ascii_lowercase();
                    let vendor = parts[1].trim().to_string();
                    if !oui.is_empty() && !vendor.is_empty() {
                        map.insert(oui, to_title_case(&vendor));
                    }
                }
            }
        }
        
        map
    });
    
    if let Some(vendor) = db.get(prefix) {
        vendor.clone()
    } else {
        "Unknown".to_string()
    }
}

#[link(name = "iphlpapi")]
#[cfg(target_os = "windows")]
extern "system" {
    fn GetIpNetTable(
        pIpNetTable: *mut u8,
        pdwSize: *mut u32,
        bOrder: i32,
    ) -> u32;
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
    let ret = unsafe {
        GetIpNetTable(buffer.as_mut_ptr(), &mut size, 0)
    };
    
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
    let local_ip_parsed: Ipv4Addr = local_ip_payload.local_ip.parse().context("Invalid local IP format")?;
    let subnet_mask_parsed: Ipv4Addr = local_ip_payload.subnet_mask
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
    
    let my_mac = local_ip_payload.default_gateway.as_ref()
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
                    Err(_) => "Unknown".to_string()
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
        _ => "24"
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
                    ssid: if ssid.is_empty() { "<Hidden SSID>".to_string() } else { ssid },
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
    interfaces.into_iter().find(|iface| iface.state == "connected")
}





#[cfg(test)]
mod tests {
    use std::env;

    use super::*;

    #[test]
    fn normalize_image_extension_supports_expected_inputs() {
        assert_eq!(
            normalize_image_extension(Path::new("cover.PNG")),
            Some("png")
        );
        assert_eq!(
            normalize_image_extension(Path::new("photo.jpeg")),
            Some("jpg")
        );
        assert_eq!(
            normalize_image_extension(Path::new("icon.webp")),
            Some("webp")
        );
        assert_eq!(normalize_image_extension(Path::new("notes.txt")), None);
    }

    #[test]
    fn calculate_resize_dimensions_from_width_preserves_aspect_ratio() {
        assert_eq!(
            calculate_resize_dimensions(2400, 1600, Some(1200), None),
            Some((1200, 800))
        );
    }

    #[test]
    fn calculate_resize_dimensions_from_bounding_box_uses_fit_strategy() {
        assert_eq!(
            calculate_resize_dimensions(2400, 1600, Some(1000), Some(1000)),
            Some((1000, 667))
        );
    }

    #[test]
    fn build_output_path_avoids_overwriting_source_file() {
        let output_folder = env::temp_dir().join("orion-image-converter-tests");
        let source_path = output_folder.join("sample.png");
        let output_path =
            build_output_path(&output_folder, &source_path, &ImageOutputFormatPayload::Png)
                .expect("output path should be generated");

        let file_name = output_path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or_default();

        assert_ne!(output_path, source_path);
        assert!(file_name.starts_with("sample-orion-converted"));
    }

    #[test]
    fn validate_convert_options_rejects_empty_resize_dimensions() {
        let options = ConvertImagesOptionsPayload {
            input_paths: vec!["C:\\temp\\sample.png".into()],
            output_folder_path: "C:\\temp\\exports".into(),
            output_format: ImageOutputFormatPayload::Jpg,
            quality: Some(85),
            resize: ImageResizeOptionsPayload {
                enabled: true,
                width: None,
                height: None,
            },
            compress: true,
        };

        let error = validate_convert_options(&options).expect_err("validation should fail");
        assert!(error
            .to_string()
            .contains("width and height are both empty"));
    }

    #[test]
    fn validate_host_input_accepts_domains_and_ip_addresses() {
        assert_eq!(
            validate_host_input("example.com").expect("domain should be valid"),
            "example.com"
        );
        assert_eq!(
            validate_host_input("127.0.0.1").expect("ipv4 should be valid"),
            "127.0.0.1"
        );
        assert_eq!(
            validate_host_input("::1").expect("ipv6 should be valid"),
            "::1"
        );
    }

    #[test]
    fn validate_host_input_rejects_whitespace_and_shell_like_strings() {
        assert!(validate_host_input("example.com && whoami").is_err());
        assert!(validate_host_input("bad host").is_err());
    }

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

    #[test]
    fn normalize_http_url_input_adds_https_scheme_when_missing() {
        assert_eq!(
            normalize_http_url_input("example.com").expect("url should normalize"),
            "https://example.com/"
        );
    }

    #[test]
    fn normalize_http_url_input_rejects_unsupported_scheme() {
        let error =
            normalize_http_url_input("ftp://example.com").expect_err("ftp should be rejected");
        assert!(error.to_string().contains("Unsupported URL scheme"));
    }
}