mod commands;
mod crypto;
mod db;
mod error;
mod grpc;
mod lightwalletd;
mod models;
mod notify;
mod state;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // `tauri-plugin-single-instance` MUST be registered first. With the
    // `deep-link` feature it catches a `pendrake://` URI that arrives as a CLI arg
    // to a freshly-spawned process (Windows/Linux) and forwards it to the running
    // instance, which then surfaces it through the deep-link plugin. We also focus
    // the window so a notification click brings the GUI to the front.
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            use tauri::Manager;
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }));
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            use tauri::Manager;
            // Register the `pendrake://` scheme at runtime so deep links work in
            // `tauri dev`. Bundled builds also get it from
            // `plugins.deep-link.desktop.schemes` in tauri.conf.json.
            #[cfg(any(target_os = "windows", target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                let _ = app.deep_link().register_all();
            }
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
            commands::settings::get_app_settings,
            commands::settings::set_setting,
            commands::settings::set_endpoint,
            commands::settings::list_default_endpoints,
            commands::settings::validate_endpoint_live,
            commands::notify::notify_test,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
