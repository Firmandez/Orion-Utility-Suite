use std::path::Path;

use anyhow::anyhow;

pub(super) fn map_file_io_error(error: std::io::Error, path: &Path, action: &str) -> anyhow::Error {
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
