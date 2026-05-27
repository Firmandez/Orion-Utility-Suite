use crate::error::AppError;
use crate::models::{
    ActiveWifiInterface, AppBootstrapPayload, ConvertImagesOptionsPayload, DnsLookupPayload,
    HashResultPayload, HttpStatusPayload, ImageConversionResponsePayload,
    ImageToPdfResponsePayload, LocalIpPayload, PdfMergeResponsePayload, PdfSplitResponsePayload,
    PdfToImagesResponsePayload, PingHostPayload, PortCheckPayload, SubnetScanResponse,
    SystemInfoPayload, WifiNetwork,
};
use crate::pdf_tools::{
    image_to_pdf_payload, merge_pdfs_payload, pdf_to_images_payload, split_pdf_payload,
};
use crate::services::{
    build_bootstrap_payload, build_local_ip_payload, build_system_info_payload,
    check_http_status_payload, check_port_payload, convert_images_payload, dns_lookup_payload,
    generate_hash_payload, ping_host_payload,
};

#[tauri::command]
pub async fn bootstrap_app() -> Result<AppBootstrapPayload, AppError> {
    Ok(build_bootstrap_payload().await)
}

#[tauri::command]
pub async fn get_system_info() -> Result<SystemInfoPayload, AppError> {
    Ok(build_system_info_payload().await)
}

#[tauri::command]
pub async fn get_local_ip() -> Result<LocalIpPayload, AppError> {
    build_local_ip_payload().await.map_err(Into::into)
}

#[tauri::command]
pub async fn dns_lookup(domain: String) -> Result<DnsLookupPayload, AppError> {
    dns_lookup_payload(domain).await.map_err(Into::into)
}

#[tauri::command]
pub async fn ping_host(host: String) -> Result<PingHostPayload, AppError> {
    ping_host_payload(host).await.map_err(Into::into)
}

#[tauri::command]
pub async fn check_port(host: String, port: u16) -> Result<PortCheckPayload, AppError> {
    check_port_payload(host, port).await.map_err(Into::into)
}

#[tauri::command]
pub async fn check_http_status(url: String) -> Result<HttpStatusPayload, AppError> {
    check_http_status_payload(url).await.map_err(Into::into)
}

#[tauri::command]
pub async fn merge_pdfs(
    window: tauri::Window,
    files: Vec<String>,
    output_path: String,
) -> Result<PdfMergeResponsePayload, AppError> {
    merge_pdfs_payload(window, files, output_path)
        .await
        .map_err(Into::into)
}

#[tauri::command]
pub async fn split_pdf(
    window: tauri::Window,
    file: String,
    output_dir: String,
) -> Result<PdfSplitResponsePayload, AppError> {
    split_pdf_payload(window, file, output_dir)
        .await
        .map_err(Into::into)
}

#[tauri::command]
pub async fn image_to_pdf(
    window: tauri::Window,
    files: Vec<String>,
    output_path: String,
) -> Result<ImageToPdfResponsePayload, AppError> {
    image_to_pdf_payload(window, files, output_path)
        .await
        .map_err(Into::into)
}

#[tauri::command]
pub async fn pdf_to_images(
    window: tauri::Window,
    file: String,
    output_dir: String,
) -> Result<PdfToImagesResponsePayload, AppError> {
    pdf_to_images_payload(window, file, output_dir)
        .await
        .map_err(Into::into)
}

#[tauri::command]
pub async fn generate_hash(
    window: tauri::Window,
    file_path: String,
) -> Result<HashResultPayload, AppError> {
    generate_hash_payload(window, file_path)
        .await
        .map_err(Into::into)
}

#[tauri::command]
pub async fn convert_images(
    window: tauri::Window,
    options: ConvertImagesOptionsPayload,
) -> Result<ImageConversionResponsePayload, AppError> {
    convert_images_payload(window, options)
        .await
        .map_err(Into::into)
}

#[tauri::command]
pub async fn validate_text_input(value: String) -> Result<bool, AppError> {
    let trimmed = value.trim();

    if trimmed.is_empty() {
        return Err(AppError::Message("Input cannot be empty.".into()));
    }

    Ok(true)
}

#[tauri::command]
pub async fn scan_subnet() -> Result<SubnetScanResponse, AppError> {
    crate::services::scan_subnet_payload()
        .await
        .map_err(Into::into)
}

#[tauri::command]
pub async fn get_wifi_networks() -> Result<Vec<WifiNetwork>, AppError> {
    crate::services::get_wifi_networks_payload()
        .await
        .map_err(Into::into)
}

#[tauri::command]
pub async fn get_active_wifi_interface() -> Result<Option<ActiveWifiInterface>, AppError> {
    crate::services::get_active_wifi_interface_payload()
        .await
        .map_err(Into::into)
}

#[tauri::command]
pub fn open_external_url(url: String) -> Result<(), AppError> {
    open::that(&url).map_err(|err| AppError::Message(err.to_string()))
}
