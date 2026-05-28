use crate::models::{AppBootstrapPayload, AppModuleSummary, SystemInfoPayload};

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
        platform_label: get_specific_os_name(),
        runtime_status: "Stage 10 settings, polish, and build-readiness ready".into(),
        offline_ready: true,
        modules,
    }
}

pub async fn build_system_info_payload() -> SystemInfoPayload {
    SystemInfoPayload {
        os: get_specific_os_name(),
        architecture: std::env::consts::ARCH.into(),
        app_version: env!("CARGO_PKG_VERSION").into(),
    }
}

fn get_specific_os_name() -> String {
    #[cfg(target_os = "windows")]
    {
        windows_product_name_from_registry().unwrap_or_else(|| "Windows".to_string())
    }

    #[cfg(target_os = "linux")]
    {
        if let Ok(content) = std::fs::read_to_string("/etc/os-release") {
            for line in content.lines() {
                if line.starts_with("PRETTY_NAME=") {
                    return line
                        .trim_start_matches("PRETTY_NAME=")
                        .trim_matches('"')
                        .to_string();
                }
            }
        }
        "Linux".to_string()
    }

    #[cfg(target_os = "macos")]
    {
        let mut version = String::new();
        if let Ok(output) = std::process::Command::new("sw_vers")
            .arg("-productVersion")
            .output()
        {
            if let Ok(stdout) = String::from_utf8(output.stdout) {
                version = stdout.trim().to_string();
            }
        }

        if version.is_empty() {
            "macOS".to_string()
        } else {
            format!("macOS {}", version)
        }
    }

    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    {
        std::env::consts::OS.to_string()
    }
}

#[cfg(target_os = "windows")]
fn windows_product_name_from_registry() -> Option<String> {
    use winreg::enums::HKEY_LOCAL_MACHINE;
    use winreg::RegKey;

    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let current_version = hklm
        .open_subkey("SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion")
        .ok()?;
    let product_name = current_version.get_value::<String, _>("ProductName").ok()?;
    let build_number = current_version
        .get_value::<String, _>("CurrentBuild")
        .ok()
        .and_then(|value| parse_windows_build_number(&value));

    Some(normalize_windows_product_name(product_name, build_number))
}

#[cfg(any(target_os = "windows", test))]
fn normalize_windows_product_name(product_name: String, build_number: Option<u32>) -> String {
    let mut normalized_name = match product_name.trim() {
        "" => "Windows".to_string(),
        value => value.to_string(),
    };

    if build_number.is_some_and(|build| build >= 22000) {
        normalized_name = normalized_name.replace("Windows 10", "Windows 11");
    }

    normalized_name
}

#[cfg(any(target_os = "windows", test))]
fn parse_windows_build_number(value: &str) -> Option<u32> {
    value.trim().parse().ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_windows_product_name_promotes_windows_11_builds() {
        assert_eq!(
            normalize_windows_product_name("Windows 10 Pro".to_string(), Some(22631)),
            "Windows 11 Pro"
        );
    }

    #[test]
    fn normalize_windows_product_name_preserves_windows_10_builds() {
        assert_eq!(
            normalize_windows_product_name("Windows 10 Pro".to_string(), Some(19045)),
            "Windows 10 Pro"
        );
    }

    #[test]
    fn parse_windows_build_number_rejects_invalid_values() {
        assert_eq!(parse_windows_build_number("22631"), Some(22631));
        assert_eq!(parse_windows_build_number("not-a-build"), None);
    }
}
