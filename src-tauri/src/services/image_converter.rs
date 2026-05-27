use std::fs::{self, File};
use std::io::BufWriter;
use std::path::{Path, PathBuf};

use anyhow::{anyhow, bail, Context};
use image::codecs::jpeg::JpegEncoder;
use image::codecs::png::{CompressionType, FilterType as PngFilterType, PngEncoder};
use image::{imageops::FilterType, DynamicImage, ImageEncoder, ImageReader, Rgb, RgbImage};
use tauri::Manager;

use crate::models::{
    ConvertImagesOptionsPayload, ImageConversionFileResultPayload, ImageConversionResponsePayload,
    ImageOutputFormatPayload, ImageResizeOptionsPayload,
};

use super::file_io::map_file_io_error;
use super::progress::{emit_image_conversion_progress, ImageConversionProgressUpdate};

const DEFAULT_JPG_QUALITY: u8 = 88;

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
            ImageConversionProgressUpdate {
                current_file_path: "",
                current_file_name: "Batch queue",
                processed_files: 0,
                total_files,
                success_count,
                failed_count,
                status: "Preparing image conversion batch",
            },
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
                ImageConversionProgressUpdate {
                    current_file_path: input_path,
                    current_file_name: &current_file_name,
                    processed_files: index,
                    total_files,
                    success_count,
                    failed_count,
                    status: &start_status,
                },
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
                ImageConversionProgressUpdate {
                    current_file_path: input_path,
                    current_file_name: &current_file_name,
                    processed_files: index + 1,
                    total_files,
                    success_count,
                    failed_count,
                    status: &end_status,
                },
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
}
