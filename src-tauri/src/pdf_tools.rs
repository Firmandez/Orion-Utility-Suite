use std::collections::BTreeMap;
use std::fs::{self, File};
use std::io::BufWriter;
use std::path::{Path, PathBuf};

use anyhow::{Context, anyhow, bail};
use lopdf::{Document, Object, ObjectId};
use printpdf::{
    Mm, Op, PdfDocument, PdfPage, PdfSaveOptions, PdfWarnMsg, Px, RawImage,
    XObjectTransform,
};
use tauri::{Emitter, Manager};

use crate::models::{
    ImageToPdfResponsePayload, PdfMergeResponsePayload, PdfSplitResponsePayload,
    PdfToImagesResponsePayload, PdfToolsProgressPayload,
};

const PDF_TOOLS_PROGRESS_EVENT: &str = "pdf-tools-progress";
const DEFAULT_IMAGE_DPI: f32 = 300.0;

pub async fn merge_pdfs_payload(
    window: tauri::Window,
    files: Vec<String>,
    output_path: String,
) -> anyhow::Result<PdfMergeResponsePayload> {
    let app_handle = window.app_handle().clone();
    let window_label = window.label().to_string();

    tokio::task::spawn_blocking(move || {
        validate_pdf_input_files(&files, 2)?;
        validate_output_pdf_path(&output_path)?;

        let total_files = files.len();
        let mut max_id = 1_u32;
        let mut total_pages = 0_usize;
        let mut documents_pages = BTreeMap::new();
        let mut documents_objects = BTreeMap::new();
        let mut merged_document = Document::with_version("1.5");

        emit_pdf_tools_progress(
            &app_handle,
            &window_label,
            "merge",
            "Preparing merge queue",
            0,
            total_files,
            "Validating PDF files",
        )?;

        for (index, file_path) in files.iter().enumerate() {
            let file_name = get_base_name(file_path);
            let mut document = load_pdf_document(file_path)?;

            document.renumber_objects_with(max_id);
            max_id = document.max_id + 1;

            for object_id in document.get_pages().into_values() {
                let object = document
                    .get_object(object_id)
                    .with_context(|| format!("Failed to read page object in {file_name}."))?
                    .to_owned();
                documents_pages.insert(object_id, object);
            }

            total_pages += document.get_pages().len();
            documents_objects.extend(document.objects);

            emit_pdf_tools_progress(
                &app_handle,
                &window_label,
                "merge",
                &file_name,
                index + 1,
                total_files,
                &format!("Merged {file_name}"),
            )?;
        }

        let mut catalog_object: Option<(ObjectId, Object)> = None;
        let mut pages_object: Option<(ObjectId, Object)> = None;

        for (object_id, object) in documents_objects {
            match object.type_name().unwrap_or(b"") {
                b"Catalog" => {
                    if catalog_object.is_none() {
                        catalog_object = Some((object_id, object));
                    }
                }
                b"Pages" => {
                    if let Ok(dictionary) = object.as_dict() {
                        let mut dictionary = dictionary.clone();

                        if let Some((_, existing_object)) = &pages_object {
                            if let Ok(existing_dictionary) = existing_object.as_dict() {
                                dictionary.extend(existing_dictionary);
                            }
                        }

                        let retained_id = pages_object
                            .as_ref()
                            .map(|(id, _)| *id)
                            .unwrap_or(object_id);
                        pages_object = Some((retained_id, Object::Dictionary(dictionary)));
                    }
                }
                b"Page" | b"Outlines" | b"Outline" => {}
                _ => {
                    merged_document.objects.insert(object_id, object);
                }
            }
        }

        let (pages_id, pages_object) = pages_object
            .ok_or_else(|| anyhow!("Pages root not found while merging PDF documents."))?;
        let (catalog_id, catalog_object) = catalog_object
            .ok_or_else(|| anyhow!("Catalog root not found while merging PDF documents."))?;

        for (object_id, object) in &documents_pages {
            if let Ok(dictionary) = object.as_dict() {
                let mut dictionary = dictionary.clone();
                dictionary.set("Parent", pages_id);
                merged_document
                    .objects
                    .insert(*object_id, Object::Dictionary(dictionary));
            }
        }

        if let Ok(dictionary) = pages_object.as_dict() {
            let mut dictionary = dictionary.clone();
            dictionary.set("Count", documents_pages.len() as u32);
            dictionary.set(
                "Kids",
                documents_pages
                    .keys()
                    .copied()
                    .map(Object::Reference)
                    .collect::<Vec<_>>(),
            );
            merged_document
                .objects
                .insert(pages_id, Object::Dictionary(dictionary));
        }

        if let Ok(dictionary) = catalog_object.as_dict() {
            let mut dictionary = dictionary.clone();
            dictionary.set("Pages", pages_id);
            dictionary.remove(b"Outlines");
            merged_document
                .objects
                .insert(catalog_id, Object::Dictionary(dictionary));
        }

        merged_document.trailer.set("Root", catalog_id);
        merged_document.max_id = merged_document.objects.len() as u32;
        merged_document.renumber_objects();

        let output_path_buf = PathBuf::from(&output_path);
        ensure_parent_directory(&output_path_buf)?;
        merged_document
            .save(&output_path_buf)
            .with_context(|| format!("Failed to save merged PDF to {}.", output_path_buf.display()))?;

        Ok(PdfMergeResponsePayload {
            output_path,
            merged_files: total_files,
            total_pages,
        })
    })
    .await
    .context("PDF merge worker panicked before completing.")?
}

pub async fn split_pdf_payload(
    window: tauri::Window,
    file: String,
    output_dir: String,
) -> anyhow::Result<PdfSplitResponsePayload> {
    let app_handle = window.app_handle().clone();
    let window_label = window.label().to_string();

    tokio::task::spawn_blocking(move || {
        validate_pdf_input_file(&file)?;
        let source_document = load_pdf_document(&file)?;
        let pages = source_document.get_pages();

        if pages.is_empty() {
            bail!("The selected PDF does not contain any pages to split.");
        }

        let output_dir_path = PathBuf::from(&output_dir);
        ensure_directory(&output_dir_path)?;

        let total_pages = pages.len();
        let digits = total_pages.to_string().len().max(3);
        let source_stem = get_file_stem(&file, "document");
        let mut generated_files = Vec::with_capacity(total_pages);

        emit_pdf_tools_progress(
            &app_handle,
            &window_label,
            "split",
            &get_base_name(&file),
            0,
            total_pages,
            "Preparing PDF split",
        )?;

        for page_number in pages.keys().copied() {
            let mut split_document = source_document.clone();
            let pages_to_delete = split_document
                .get_pages()
                .keys()
                .copied()
                .filter(|candidate| *candidate != page_number)
                .collect::<Vec<_>>();

            split_document.delete_pages(&pages_to_delete);
            split_document.prune_objects();
            split_document.renumber_objects();

            let output_path = build_split_output_path(
                &output_dir_path,
                &source_stem,
                page_number,
                digits,
            );

            split_document
                .save(&output_path)
                .with_context(|| format!("Failed to save split page to {}.", output_path.display()))?;

            generated_files.push(output_path.to_string_lossy().into_owned());

            emit_pdf_tools_progress(
                &app_handle,
                &window_label,
                "split",
                &format!("Page {page_number}"),
                page_number as usize,
                total_pages,
                &format!("Saved page {page_number}"),
            )?;
        }

        Ok(PdfSplitResponsePayload {
            output_dir,
            generated_files,
            total_pages,
        })
    })
    .await
    .context("PDF split worker panicked before completing.")?
}

pub async fn image_to_pdf_payload(
    window: tauri::Window,
    files: Vec<String>,
    output_path: String,
) -> anyhow::Result<ImageToPdfResponsePayload> {
    let app_handle = window.app_handle().clone();
    let window_label = window.label().to_string();

    tokio::task::spawn_blocking(move || {
        validate_image_input_files(&files)?;
        validate_output_pdf_path(&output_path)?;

        let mut document = PdfDocument::new("Orion Utility Suite - Image to PDF");
        let mut pages = Vec::with_capacity(files.len());
        let mut warnings = Vec::<PdfWarnMsg>::new();
        let total_files = files.len();

        emit_pdf_tools_progress(
            &app_handle,
            &window_label,
            "image-to-pdf",
            "Preparing image queue",
            0,
            total_files,
            "Validating source images",
        )?;

        for (index, file_path) in files.iter().enumerate() {
            let file_name = get_base_name(file_path);
            let page = create_pdf_page_from_image(&mut document, file_path, &mut warnings)?;
            pages.push(page);

            emit_pdf_tools_progress(
                &app_handle,
                &window_label,
                "image-to-pdf",
                &file_name,
                index + 1,
                total_files,
                &format!("Added {file_name} to PDF"),
            )?;
        }

        document.with_pages(pages);

        let output_path_buf = PathBuf::from(&output_path);
        ensure_parent_directory(&output_path_buf)?;
        let file = File::create(&output_path_buf)
            .map_err(|error| map_file_io_error(error, &output_path_buf, "create"))?;
        let mut writer = BufWriter::new(file);
        document.save_writer(&mut writer, &PdfSaveOptions::default(), &mut warnings);

        Ok(ImageToPdfResponsePayload {
            output_path,
            source_files: total_files,
            total_pages: total_files,
        })
    })
    .await
    .context("Image to PDF worker panicked before completing.")?
}

fn create_pdf_page_from_image(
    document: &mut PdfDocument,
    file_path: &str,
    warnings: &mut Vec<PdfWarnMsg>,
) -> anyhow::Result<PdfPage> {
    let file_name = get_base_name(file_path);
    let image_bytes = fs::read(file_path)
        .map_err(|error| map_file_io_error(error, Path::new(file_path), "read"))?;
    let raw_image = RawImage::decode_from_bytes(&image_bytes, warnings)
        .map_err(|error| anyhow!("Failed to decode image {file_name}: {error}"))?;

    if raw_image.width == 0 || raw_image.height == 0 {
        bail!("Image {file_name} has invalid dimensions.");
    }

    let image_id = document.add_image(&raw_image);
    let width = Mm::from(Px(raw_image.width).into_pt(DEFAULT_IMAGE_DPI));
    let height = Mm::from(Px(raw_image.height).into_pt(DEFAULT_IMAGE_DPI));

    Ok(PdfPage::new(
        width,
        height,
        vec![Op::UseXobject {
            id: image_id,
            transform: XObjectTransform {
                dpi: Some(DEFAULT_IMAGE_DPI),
                ..Default::default()
            },
        }],
    ))
}

pub async fn pdf_to_images_payload(
    window: tauri::Window,
    file: String,
    output_dir: String,
) -> anyhow::Result<PdfToImagesResponsePayload> {
    let app_handle = window.app_handle().clone();
    let window_label = window.label().to_string();

    tokio::task::spawn_blocking(move || {
        validate_pdf_input_file(&file)?;
        let document = load_pdf_document(&file)?;
        let total_pages = document.get_pages().len();
        let output_dir_path = PathBuf::from(&output_dir);
        ensure_directory(&output_dir_path)?;

        emit_pdf_tools_progress(
            &app_handle,
            &window_label,
            "pdf-to-images",
            &get_base_name(&file),
            0,
            total_pages.max(1),
            "Checking PDF to image availability",
        )?;

        Ok(PdfToImagesResponsePayload {
            output_dir,
            generated_files: Vec::new(),
            total_pages,
            status: "placeholder".into(),
            note: Some(
                "PDF page to image belum diaktifkan. pdfium-render membutuhkan binary PDFium native per platform dan wiring tambahan sebelum stabil dipakai lintas OS."
                    .into(),
            ),
        })
    })
    .await
    .context("PDF to image availability worker panicked before completing.")?
}

fn validate_pdf_input_files(files: &[String], min_count: usize) -> anyhow::Result<()> {
    if files.len() < min_count {
        bail!("Select at least {min_count} PDF file(s) before starting this operation.");
    }

    for file in files {
        validate_pdf_input_file(file)?;
    }

    Ok(())
}

fn validate_pdf_input_file(file: &str) -> anyhow::Result<()> {
    if file.trim().is_empty() {
        bail!("PDF file path cannot be empty.");
    }

    let path = Path::new(file);

    if normalize_extension(path).as_deref() != Some("pdf") {
        bail!("Unsupported PDF file: {}. Only .pdf files are allowed.", path.display());
    }

    if !path.is_file() {
        bail!("PDF file not found: {}", path.display());
    }

    Ok(())
}

fn validate_image_input_files(files: &[String]) -> anyhow::Result<()> {
    if files.is_empty() {
        bail!("Select at least one image before creating a PDF.");
    }

    for file in files {
        let path = Path::new(file);

        if !matches!(
            normalize_extension(path).as_deref(),
            Some("png" | "jpg" | "jpeg" | "webp")
        ) {
            bail!(
                "Unsupported image file: {}. Allowed extensions: PNG, JPG, JPEG, WEBP.",
                path.display()
            );
        }

        if !path.is_file() {
            bail!("Image file not found: {}", path.display());
        }
    }

    Ok(())
}

fn validate_output_pdf_path(output_path: &str) -> anyhow::Result<()> {
    let trimmed = output_path.trim();

    if trimmed.is_empty() {
        bail!("Output PDF path cannot be empty.");
    }

    let output = Path::new(trimmed);

    if normalize_extension(output).as_deref() != Some("pdf") {
        bail!("Output file must use the .pdf extension.");
    }

    Ok(())
}

fn load_pdf_document(file_path: &str) -> anyhow::Result<Document> {
    let path = Path::new(file_path);

    Document::load(path)
        .with_context(|| format!("Failed to open or parse PDF file {}.", path.display()))
}

fn ensure_directory(path: &Path) -> anyhow::Result<()> {
    if path.exists() {
        if !path.is_dir() {
            bail!("Output target is not a directory: {}", path.display());
        }
        return Ok(());
    }

    fs::create_dir_all(path)
        .map_err(|error| map_file_io_error(error, path, "create directory"))?;
    Ok(())
}

fn ensure_parent_directory(path: &Path) -> anyhow::Result<()> {
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            ensure_directory(parent)?;
        }
    }

    Ok(())
}

fn build_split_output_path(
    output_dir: &Path,
    source_stem: &str,
    page_number: u32,
    digits: usize,
) -> PathBuf {
    output_dir.join(format!(
        "{source_stem}-page-{page_number:0digits$}.pdf",
        digits = digits
    ))
}

fn emit_pdf_tools_progress(
    app_handle: &tauri::AppHandle,
    window_label: &str,
    operation: &str,
    current_item_name: &str,
    processed_items: usize,
    total_items: usize,
    status: &str,
) -> anyhow::Result<()> {
    let total_items = total_items.max(1);
    let payload = PdfToolsProgressPayload {
        operation: operation.into(),
        current_item_name: current_item_name.into(),
        processed_items,
        total_items,
        progress_percent: (((processed_items as f64 / total_items as f64) * 100.0).round() as u8)
            .clamp(0, 100),
        status: status.into(),
    };

    app_handle
        .emit_to(window_label, PDF_TOOLS_PROGRESS_EVENT, payload)
        .map_err(|error| anyhow!("Failed to emit PDF tools progress event: {error}"))?;

    Ok(())
}

fn normalize_extension(path: &Path) -> Option<String> {
    path.extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
}

fn get_base_name(path: &str) -> String {
    Path::new(path)
        .file_name()
        .and_then(|value| value.to_str())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| "file".into())
}

fn get_file_stem(path: &str, fallback: &str) -> String {
    Path::new(path)
        .file_stem()
        .and_then(|value| value.to_str())
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| fallback.into())
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
    use std::io::Write;

    use super::*;
    use uuid::Uuid;

    #[test]
    fn validate_output_pdf_path_requires_pdf_extension() {
        let error = validate_output_pdf_path("report.txt").expect_err("non-pdf output must fail");
        assert!(error.to_string().contains(".pdf"));
    }

    #[test]
    fn build_split_output_path_formats_page_numbers() {
        let output_dir = env::temp_dir();
        let output = build_split_output_path(&output_dir, "report", 7, 4);

        assert!(output
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or_default()
            .contains("report-page-0007.pdf"));
    }

    #[test]
    fn validate_image_input_files_rejects_invalid_extensions() {
        let error = validate_image_input_files(&["C:\\temp\\not-image.txt".into()])
            .expect_err("invalid image should fail");
        assert!(error.to_string().contains("Unsupported image file"));
    }

    #[test]
    fn create_pdf_page_from_image_writes_a_valid_pdf() {
        let temp_dir = env::temp_dir().join(format!("orion-pdf-tools-{}", Uuid::new_v4()));
        fs::create_dir_all(&temp_dir).expect("temp dir should be created");

        let image_path = temp_dir.join("sample.png");
        let output_path = temp_dir.join("sample.pdf");

        let mut image = ::image::RgbaImage::new(4, 3);
        for (index, pixel) in image.pixels_mut().enumerate() {
            *pixel = ::image::Rgba([(index * 10) as u8, 120, 200, 255]);
        }

        ::image::DynamicImage::ImageRgba8(image)
            .save(&image_path)
            .expect("png should be saved");

        let mut document = PdfDocument::new("test-image-to-pdf");
        let mut warnings = Vec::<PdfWarnMsg>::new();
        let page = create_pdf_page_from_image(
            &mut document,
            image_path.to_string_lossy().as_ref(),
            &mut warnings,
        )
        .expect("image should decode into a PDF page");

        document.with_pages(vec![page]);

        let mut writer = BufWriter::new(File::create(&output_path).expect("pdf file should be created"));
        document.save_writer(&mut writer, &PdfSaveOptions::default(), &mut warnings);
        writer.flush().expect("writer should flush to disk");

        let loaded_pdf = Document::load(&output_path).expect("generated pdf should be readable");
        assert_eq!(loaded_pdf.get_pages().len(), 1);

        let _ = fs::remove_file(&image_path);
        let _ = fs::remove_file(&output_path);
        let _ = fs::remove_dir_all(&temp_dir);
    }
}
