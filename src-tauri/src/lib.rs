mod commands;
mod error;
mod models;
mod pdf_tools;
mod services;

use services::YtdlpState;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(YtdlpState::default())
        .invoke_handler(tauri::generate_handler![
            commands::bootstrap_app,
            commands::get_system_info,
            commands::get_local_ip,
            commands::dns_lookup,
            commands::ping_host,
            commands::check_port,
            commands::check_http_status,
            commands::merge_pdfs,
            commands::split_pdf,
            commands::image_to_pdf,
            commands::pdf_to_images,
            commands::read_pdf_metadata,
            commands::write_pdf_metadata,
            commands::clear_pdf_metadata,
            commands::convert_images,
            commands::generate_hash,
            commands::validate_text_input,
            commands::save_qr_export,
            commands::scan_subnet,
            commands::get_wifi_networks,
            commands::get_active_wifi_interface,
            commands::open_external_url,
            commands::check_ytdlp_available,
            commands::fetch_ytdlp_info,
            commands::start_ytdlp_download,
            commands::cancel_ytdlp_download,
            commands::update_ytdlp
        ])
        .run(tauri::generate_context!())
        .expect("error while running Orion Utility Suite");
}
