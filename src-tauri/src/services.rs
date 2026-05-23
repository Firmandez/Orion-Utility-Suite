use std::fs::{self, File};
use std::io::{BufReader, BufWriter, Read};
use std::net::IpAddr;
use std::path::{Path, PathBuf};

use anyhow::{Context, anyhow, bail};
use hickory_resolver::Resolver;
use image::codecs::jpeg::JpegEncoder;
use image::codecs::png::{CompressionType, FilterType as PngFilterType, PngEncoder};
use image::{DynamicImage, ImageEncoder, ImageReader, Rgb, RgbImage, imageops::FilterType};
use regex::Regex;
use reqwest::{Client, Url, redirect};
use sha1::{Digest as _, Sha1};
use sha2::Sha256;
use tauri::{Emitter, Manager};
use tokio::net::TcpStream;
use tokio::process::Command as TokioCommand;
use tokio::time::{Duration, Instant, timeout};

use crate::models::{
    AppBootstrapPayload, AppModuleSummary, ConvertImagesOptionsPayload,
    DnsLookupPayload, HashProgressPayload, HashResultPayload, HttpStatusPayload,
    ImageConversionFileResultPayload, ImageConversionProgressPayload,
    ImageConversionResponsePayload, ImageOutputFormatPayload,
    ImageResizeOptionsPayload, LocalIpPayload, PingHostPayload, PortCheckPayload,
    SystemInfoPayload,
};

const DEFAULT_JPG_QUALITY: u8 = 88;
const HASH_CHUNK_SIZE: usize = 256 * 1024;
const HASH_PROGRESS_EVENT: &str = "hash-progress";
const IMAGE_CONVERSION_PROGRESS_EVENT: &str = "image-conversion-progress";
const DNS_LOOKUP_TIMEOUT: Duration = Duration::from_secs(5);
const PING_TIMEOUT: Duration = Duration::from_secs(4);
const PORT_CHECK_TIMEOUT: Duration = Duration::from_secs(3);
const HTTP_CONNECT_TIMEOUT: Duration = Duration::from_secs(4);
const HTTP_REQUEST_TIMEOUT: Duration = Duration::from_secs(8);

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

    Ok(LocalIpPayload {
        local_ip: ip_address.to_string(),
    })
}

pub async fn dns_lookup_payload(domain: String) -> anyhow::Result<DnsLookupPayload> {
    let validated_domain = validate_host_input(&domain)?;
    let resolver = Resolver::builder_tokio()
        .context("Failed to create the DNS resolver with host system configuration.")?
        .build();

    let lookup = timeout(DNS_LOOKUP_TIMEOUT, resolver.lookup_ip(validated_domain.as_str()))
        .await
        .map_err(|_| anyhow!("DNS lookup timed out after {} seconds.", DNS_LOOKUP_TIMEOUT.as_secs()))?
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
    let is_open = match timeout(PORT_CHECK_TIMEOUT, TcpStream::connect((validated_host.as_str(), port))).await {
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
        format!("HTTP request completed successfully with status {}.", status_code.as_u16())
    } else {
        format!("HTTP request completed with status {}.", status_code.as_u16())
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
            fs::create_dir_all(&output_folder)
                .map_err(|error| map_file_io_error(error, &output_folder, "create output folder"))?;
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
            let start_status = format!("Converting {current_file_name} ({}/{total_files})", index + 1);

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
        .with_context(|| format!("Failed to decode image data from {}.", source_path.display()))?;

    let resized_image = apply_resize(decoded_image, resize);
    let output_path = build_output_path(output_folder, &source_path, output_format)?;

    save_converted_image(&resized_image, &output_path, output_format, quality, compress)?;

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
            candidate = output_folder.join(format!(
                "{stem}-orion-converted-{suffix}.{extension}"
            ));
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
            let mut encoder = JpegEncoder::new_with_quality(&mut writer, sanitize_jpg_quality(quality));
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
            anyhow!("Permission denied while trying to {action} {}.", path.display())
        }
        _ => anyhow!("Failed to {action} {}: {error}", path.display()),
    }
}

#[cfg(test)]
mod tests {
    use std::env;

    use super::*;

    #[test]
    fn normalize_image_extension_supports_expected_inputs() {
        assert_eq!(normalize_image_extension(Path::new("cover.PNG")), Some("png"));
        assert_eq!(normalize_image_extension(Path::new("photo.jpeg")), Some("jpg"));
        assert_eq!(normalize_image_extension(Path::new("icon.webp")), Some("webp"));
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
        assert!(error.to_string().contains("width and height are both empty"));
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
    fn normalize_http_url_input_adds_https_scheme_when_missing() {
        assert_eq!(
            normalize_http_url_input("example.com").expect("url should normalize"),
            "https://example.com/"
        );
    }

    #[test]
    fn normalize_http_url_input_rejects_unsupported_scheme() {
        let error = normalize_http_url_input("ftp://example.com").expect_err("ftp should be rejected");
        assert!(error.to_string().contains("Unsupported URL scheme"));
    }
}
