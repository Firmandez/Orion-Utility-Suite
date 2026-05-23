mod commands;
mod error;
mod models;
mod pdf_tools;
mod services;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
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
            commands::convert_images,
            commands::generate_hash,
            commands::validate_text_input
        ])
        .run(tauri::generate_context!())
        .expect("error while running Orion Utility Suite");
}
