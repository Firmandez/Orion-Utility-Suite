use std::fs::File;
use std::io::{BufReader, Read};
use std::path::PathBuf;

use anyhow::{bail, Context};
use sha1::{Digest as _, Sha1};
use sha2::Sha256;
use tauri::Manager;

use crate::models::HashResultPayload;

use super::file_io::map_file_io_error;
use super::progress::{compute_progress_percent, emit_hash_progress};

const HASH_CHUNK_SIZE: usize = 256 * 1024;

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
