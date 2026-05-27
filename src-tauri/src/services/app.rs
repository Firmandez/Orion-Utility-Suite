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
        let mut product_name = "Windows".to_string();
        let mut build_number = 0;
        
        if let Ok(output) = std::process::Command::new("reg")
            .args(&["query", "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion", "/v", "ProductName"])
            .output()
        {
            if let Ok(stdout) = String::from_utf8(output.stdout) {
                for line in stdout.lines() {
                    if line.contains("ProductName") {
                        let parts: Vec<&str> = line.split("REG_SZ").collect();
                        if parts.len() >= 2 {
                            product_name = parts[1].trim().to_string();
                        }
                    }
                }
            }
        }
        
        if let Ok(output) = std::process::Command::new("reg")
            .args(&["query", "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion", "/v", "CurrentBuild"])
            .output()
        {
            if let Ok(stdout) = String::from_utf8(output.stdout) {
                for line in stdout.lines() {
                    if line.contains("CurrentBuild") {
                        let parts: Vec<&str> = line.split("REG_SZ").collect();
                        if parts.len() >= 2 {
                            if let Ok(build) = parts[1].trim().parse::<u32>() {
                                build_number = build;
                            }
                        }
                    }
                }
            }
        }
        
        if build_number >= 22000 {
            product_name = product_name.replace("Windows 10", "Windows 11");
        }
        
        product_name
    }
    
    #[cfg(target_os = "linux")]
    {
        if let Ok(content) = std::fs::read_to_string("/etc/os-release") {
            for line in content.lines() {
                if line.starts_with("PRETTY_NAME=") {
                    return line.trim_start_matches("PRETTY_NAME=").trim_matches('"').to_string();
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
