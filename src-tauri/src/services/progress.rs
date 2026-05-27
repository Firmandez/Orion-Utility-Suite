use anyhow::anyhow;
use tauri::Emitter;

use crate::models::{HashProgressPayload, ImageConversionProgressPayload};

const HASH_PROGRESS_EVENT: &str = "hash-progress";
const IMAGE_CONVERSION_PROGRESS_EVENT: &str = "image-conversion-progress";

pub(super) struct ImageConversionProgressUpdate<'a> {
    pub current_file_path: &'a str,
    pub current_file_name: &'a str,
    pub processed_files: usize,
    pub total_files: usize,
    pub success_count: usize,
    pub failed_count: usize,
    pub status: &'a str,
}

pub(super) fn emit_hash_progress(
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

pub(super) fn emit_image_conversion_progress(
    app_handle: &tauri::AppHandle,
    window_label: &str,
    update: ImageConversionProgressUpdate<'_>,
) -> anyhow::Result<()> {
    let payload = ImageConversionProgressPayload {
        current_file_name: update.current_file_name.into(),
        current_file_path: update.current_file_path.into(),
        processed_files: update.processed_files,
        total_files: update.total_files,
        success_count: update.success_count,
        failed_count: update.failed_count,
        progress_percent: compute_progress_percent(
            update.processed_files as u64,
            update.total_files as u64,
        ),
        status: update.status.into(),
    };

    app_handle
        .emit_to(window_label, IMAGE_CONVERSION_PROGRESS_EVENT, payload)
        .map_err(|error| anyhow!("Failed to emit image conversion progress event: {error}"))?;

    Ok(())
}

pub(super) fn compute_progress_percent(bytes_processed: u64, total_bytes: u64) -> u8 {
    if total_bytes == 0 {
        return 100;
    }

    let progress = ((bytes_processed as f64 / total_bytes as f64) * 100.0).round() as u8;
    progress.clamp(0, 100)
}
