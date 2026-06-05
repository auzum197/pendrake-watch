mod commands;
mod crypto;
mod db;
mod error;
mod models;
mod state;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            use tauri::Manager;
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            let conn = db::open(&dir.join("wallet.db"))?;
            app.manage(state::AppState::new(conn));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::system::ping,
            commands::wallet::get_balance,
            commands::wallet::get_sync_status,
            commands::wallet::get_transactions,
            commands::wallet::get_accounts,
            commands::auth::wallet_status,
            commands::auth::setup_wallet,
            commands::auth::unlock_wallet,
            commands::auth::lock_wallet,
            commands::auth::change_password,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
