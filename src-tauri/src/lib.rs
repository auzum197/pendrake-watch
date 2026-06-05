mod commands;
mod error;
mod models;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::system::ping,
            commands::wallet::get_balance,
            commands::wallet::get_sync_status,
            commands::wallet::get_transactions,
            commands::wallet::get_accounts,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
