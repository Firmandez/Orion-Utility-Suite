use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppModuleSummary {
    pub id: String,
    pub title: String,
    pub area: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppBootstrapPayload {
    pub app_name: String,
    pub version: String,
    pub backend_mode: String,
    pub platform_label: String,
    pub runtime_status: String,
    pub offline_ready: bool,
    pub modules: Vec<AppModuleSummary>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfoPayload {
    pub os: String,
    pub architecture: String,
    pub app_version: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalIpPayload {
    pub local_ip: String,
    pub subnet_mask: Option<String>,
    pub default_gateway: Option<String>,
    pub preferred_dns_server: Option<String>,
    pub alternate_dns_server: Option<String>,
    pub address_mode: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HashResultPayload {
    pub file_name: String,
    pub file_size: u64,
    pub md5: String,
    pub sha1: String,
    pub sha256: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HashProgressPayload {
    pub file_path: String,
    pub file_name: String,
    pub bytes_processed: u64,
    pub total_bytes: u64,
    pub progress_percent: u8,
    pub status: String,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ImageOutputFormatPayload {
    Jpg,
    Png,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageResizeOptionsPayload {
    pub enabled: bool,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConvertImagesOptionsPayload {
    pub input_paths: Vec<String>,
    pub output_folder_path: String,
    pub output_format: ImageOutputFormatPayload,
    pub quality: Option<u8>,
    pub resize: ImageResizeOptionsPayload,
    pub compress: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageConversionFileResultPayload {
    pub input_path: String,
    pub output_path: Option<String>,
    pub status: String,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageConversionResponsePayload {
    pub output_folder_path: String,
    pub total_files: usize,
    pub success_count: usize,
    pub failed_count: usize,
    pub results: Vec<ImageConversionFileResultPayload>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageConversionProgressPayload {
    pub current_file_name: String,
    pub current_file_path: String,
    pub processed_files: usize,
    pub total_files: usize,
    pub success_count: usize,
    pub failed_count: usize,
    pub progress_percent: u8,
    pub status: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DnsLookupPayload {
    pub domain: String,
    pub addresses: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PingHostPayload {
    pub host: String,
    pub reachable: bool,
    pub exit_code: Option<i32>,
    pub duration_ms: u64,
    pub summary: String,
    pub output: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PortCheckPayload {
    pub host: String,
    pub port: u16,
    pub is_open: bool,
    pub duration_ms: u64,
    pub summary: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpStatusPayload {
    pub url: String,
    pub final_url: String,
    pub status_code: u16,
    pub ok: bool,
    pub summary: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfMergeResponsePayload {
    pub output_path: String,
    pub merged_files: usize,
    pub total_pages: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfSplitResponsePayload {
    pub output_dir: String,
    pub generated_files: Vec<String>,
    pub total_pages: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageToPdfResponsePayload {
    pub output_path: String,
    pub source_files: usize,
    pub total_pages: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfToImagesResponsePayload {
    pub output_dir: String,
    pub generated_files: Vec<String>,
    pub total_pages: usize,
    pub status: String,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfToolsProgressPayload {
    pub operation: String,
    pub current_item_name: String,
    pub processed_items: usize,
    pub total_items: usize,
    pub progress_percent: u8,
    pub status: String,
}
