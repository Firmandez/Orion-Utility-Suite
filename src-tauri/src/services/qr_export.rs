use std::fs;
use std::path::{Path, PathBuf};

use anyhow::{anyhow, Context};
use base64::{engine::general_purpose::STANDARD, Engine as _};

use super::file_io::map_file_io_error;

pub async fn save_qr_export_payload(
    output_path: String,
    extension: String,
    data_base64: String,
) -> anyhow::Result<String> {
    tokio::task::spawn_blocking(move || {
        let output_path = validate_qr_output_path(&output_path, &extension)?;
        let bytes = STANDARD
            .decode(data_base64)
            .context("QR export data could not be decoded.")?;

        if bytes.is_empty() {
            return Err(anyhow!("QR export data is empty."));
        }

        if let Some(parent) = output_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| map_file_io_error(error, parent, "create directory"))?;
        }

        fs::write(&output_path, bytes)
            .map_err(|error| map_file_io_error(error, &output_path, "write"))?;

        Ok(output_path.to_string_lossy().into_owned())
    })
    .await
    .context("QR export task could not be completed.")?
}

fn validate_qr_output_path(output_path: &str, extension: &str) -> anyhow::Result<PathBuf> {
    let normalized_extension = extension.trim().to_ascii_lowercase();

    if !matches!(normalized_extension.as_str(), "png" | "svg") {
        return Err(anyhow!("QR export format must be PNG or SVG."));
    }

    let output_path = Path::new(output_path.trim());

    if output_path.as_os_str().is_empty() {
        return Err(anyhow!("Choose a location for the QR export."));
    }

    let actual_extension = output_path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    if actual_extension != normalized_extension {
        return Err(anyhow!(
            "QR export file must use the .{normalized_extension} extension."
        ));
    }

    Ok(output_path.to_path_buf())
}

#[cfg(test)]
mod tests {
    use std::env;

    use super::*;
    use uuid::Uuid;

    #[tokio::test]
    async fn save_qr_export_writes_decoded_bytes() {
        let temp_dir = env::temp_dir().join(format!("orion-qr-export-{}", Uuid::new_v4()));
        let output_path = temp_dir.join("sample.svg");
        let svg = b"<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>";

        let saved_path = save_qr_export_payload(
            output_path.to_string_lossy().into_owned(),
            "svg".into(),
            STANDARD.encode(svg),
        )
        .await
        .expect("QR export should be saved");

        assert_eq!(PathBuf::from(saved_path), output_path);
        assert_eq!(
            fs::read(&output_path).expect("export should be readable"),
            svg
        );

        let _ = fs::remove_dir_all(temp_dir);
    }

    #[test]
    fn validate_qr_output_path_rejects_mismatched_extension() {
        let error =
            validate_qr_output_path("qr.svg", "png").expect_err("mismatched extension should fail");

        assert!(error.to_string().contains(".png"));
    }
}
