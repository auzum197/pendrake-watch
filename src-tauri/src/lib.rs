//! Tauri GUI backend: a thin client over the Pendrake daemon.
//!
//! The `pendraked` daemon owns the wallet file. This process never links the
//! engine. It probes the daemon's Unix socket, spawns it if nothing answers
//! following the SPEC's probe-and-spawn rule, then forwards request and response
//! JSON between the webview and the socket.

use std::path::PathBuf;
use std::sync::LazyLock;
use std::time::Duration;

use serde_json::Value;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::UnixStream;
use tokio::sync::Mutex;

/// Serializes the connect-or-spawn path so the webview's concurrent requests
/// (status, balance, history on mount) don't each spawn a daemon.
static SPAWN_GUARD: LazyLock<Mutex<()>> = LazyLock::new(|| Mutex::new(()));

/// Mirrors `pendrake_core::Paths`: same `PENDRAKE_DATA_DIR` override, same
/// default location, so client and daemon agree on the socket path. A spawned
/// daemon inherits this process's environment, keeping the override in sync.
fn socket_path() -> Result<PathBuf, String> {
    let root = match std::env::var_os("PENDRAKE_DATA_DIR") {
        Some(dir) => PathBuf::from(dir),
        None => dirs::data_dir()
            .ok_or("could not determine OS data directory")?
            .join("pendrake-watch"),
    };
    Ok(root.join("daemon.sock"))
}

/// The `pendraked` binary to spawn: `PENDRAKED_BIN` if set, otherwise a dev build
/// from the workspace target dir (release preferred over debug), probed both from
/// the repo root and from the `src-tauri/` directory Tauri runs in.
fn daemon_bin() -> Option<PathBuf> {
    if let Some(path) = std::env::var_os("PENDRAKED_BIN") {
        return Some(PathBuf::from(path));
    }
    [
        "crates/target/release/pendraked",
        "../crates/target/release/pendraked",
        "crates/target/debug/pendraked",
        "../crates/target/debug/pendraked",
    ]
    .into_iter()
    .map(PathBuf::from)
    .find(|p| p.exists())
}

#[cfg(target_os = "macos")]
fn pendrake_sync_app() -> Option<PathBuf> {
    [
        "platform/macos/PendrakeSync/build/PendrakeSync.app",
        "../platform/macos/PendrakeSync/build/PendrakeSync.app",
    ]
    .into_iter()
    .map(PathBuf::from)
    .find(|p| p.exists())
}

fn spawn_bin(bin: &PathBuf) -> Result<(), String> {
    std::process::Command::new(bin)
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("failed to spawn {}: {e}", bin.display()))
}

#[cfg(target_os = "macos")]
fn open_app(app: &PathBuf) -> Result<(), String> {
    std::process::Command::new("open")
        .arg(app)
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("failed to launch {}: {e}", app.display()))
}

async fn connect() -> Result<UnixStream, std::io::Error> {
    UnixStream::connect(socket_path().map_err(std::io::Error::other)?).await
}

/// Launch the background engine. Preference, in order: an explicit
/// `PENDRAKE_SYNC_APP`; then the `pendraked` binary you're iterating on (a dev
/// checkout always has one under `crates/target`, or via `PENDRAKED_BIN`); then a
/// discovered dev `.app`. A packaged build has no workspace binary, so it falls
/// through to the Swift `PendrakeSync.app`. This keeps probe-and-spawn from
/// silently swapping a stale bundled app in for the engine you're developing —
/// independent of whether the GUI itself was built debug or `--release`.
fn spawn_engine() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        if let Some(app) = std::env::var_os("PENDRAKE_SYNC_APP")
            .map(PathBuf::from)
            .filter(|p| p.exists())
        {
            return open_app(&app);
        }
        if let Some(bin) = daemon_bin() {
            return spawn_bin(&bin);
        }
        if let Some(app) = pendrake_sync_app() {
            return open_app(&app);
        }
        Err("could not start the background process — set PENDRAKED_BIN to a \
             pendraked binary, or build the macOS helper (scripts/build-macos-helper.sh)"
            .into())
    }
    #[cfg(not(target_os = "macos"))]
    {
        let bin = daemon_bin().unwrap_or_else(|| PathBuf::from("pendraked"));
        spawn_bin(&bin)
    }
}

/// Connect to the daemon, spawning it and waiting for the socket if nothing answers.
async fn ensure_daemon() -> Result<UnixStream, String> {
    if let Ok(stream) = connect().await {
        return Ok(stream);
    }

    let _guard = SPAWN_GUARD.lock().await;
    // Another request may have spawned the daemon while we waited for the lock.
    if let Ok(stream) = connect().await {
        return Ok(stream);
    }

    spawn_engine()?;

    for _ in 0..50 {
        tokio::time::sleep(Duration::from_millis(100)).await;
        if let Ok(stream) = connect().await {
            return Ok(stream);
        }
    }
    Err("daemon did not come up within 5s".into())
}

/// Hold one subscription open to the daemon and re-emit each pushed event to the
/// webview as a `sync-event`. Reconnects with capped backoff when the daemon
/// restarts, so a probe-and-spawn cycle re-establishes the feed on its own.
async fn run_event_bridge(app: tauri::AppHandle) {
    let mut backoff = Duration::from_millis(500);
    loop {
        match subscribe_once(&app).await {
            Ok(()) => backoff = Duration::from_millis(500),
            Err(e) => eprintln!("event bridge: {e}"),
        }
        tokio::time::sleep(backoff).await;
        backoff = (backoff * 2).min(Duration::from_secs(10));
    }
}

/// Connect, subscribe, and forward events until the connection drops. The leading
/// ack reply carries `ok`; only lines carrying `event` are real pushes.
async fn subscribe_once(app: &tauri::AppHandle) -> Result<(), String> {
    use tauri::Emitter;

    let stream = ensure_daemon().await?;
    let (read_half, mut write_half) = stream.into_split();

    let req = serde_json::json!({ "id": 1, "method": "subscribeEvents", "params": null });
    let mut line = serde_json::to_vec(&req).map_err(|e| e.to_string())?;
    line.push(b'\n');
    write_half.write_all(&line).await.map_err(|e| e.to_string())?;

    let mut reader = BufReader::new(read_half);
    let mut buf = String::new();
    loop {
        buf.clear();
        let n = reader.read_line(&mut buf).await.map_err(|e| e.to_string())?;
        if n == 0 {
            return Err("daemon closed the event stream".into());
        }
        let Ok(value) = serde_json::from_str::<Value>(&buf) else {
            continue;
        };
        if value.get("event").is_some() {
            let _ = app.emit("sync-event", value);
        }
    }
}

async fn request(method: &str, params: Value) -> Result<Value, String> {
    let stream = ensure_daemon().await?;
    let (read_half, mut write_half) = stream.into_split();

    let req = serde_json::json!({ "id": 1, "method": method, "params": params });
    let mut line = serde_json::to_vec(&req).map_err(|e| e.to_string())?;
    line.push(b'\n');
    write_half.write_all(&line).await.map_err(|e| e.to_string())?;

    let mut reader = BufReader::new(read_half);
    let mut reply = String::new();
    reader.read_line(&mut reply).await.map_err(|e| e.to_string())?;

    let resp: Value = serde_json::from_str(&reply).map_err(|e| e.to_string())?;
    if resp["ok"].as_bool() == Some(true) {
        Ok(resp.get("result").cloned().unwrap_or(Value::Null))
    } else {
        Err(resp["error"].as_str().unwrap_or("daemon error").to_string())
    }
}

#[tauri::command]
async fn import_ufvk(
    ufvk: String,
    birthday: u32,
    indexer_uri: String,
    network: String,
) -> Result<Value, String> {
    request(
        "importUfvk",
        serde_json::json!({
            "ufvk": ufvk,
            "birthday": birthday,
            "indexerUri": indexer_uri,
            "network": network,
        }),
    )
    .await
}

#[tauri::command]
async fn get_wallet_state() -> Result<Value, String> {
    request("getWalletState", Value::Null).await
}

#[tauri::command]
async fn get_addresses() -> Result<Value, String> {
    request("getAddresses", Value::Null).await
}

#[tauri::command]
async fn get_sync_status() -> Result<Value, String> {
    request("getSyncStatus", Value::Null).await
}

#[tauri::command]
async fn get_balance() -> Result<Value, String> {
    request("getBalance", Value::Null).await
}

#[tauri::command]
async fn get_transactions() -> Result<Value, String> {
    request("getTransactions", Value::Null).await
}

#[tauri::command]
async fn get_transaction(txid: String) -> Result<Value, String> {
    request("getTransaction", serde_json::json!({ "txid": txid })).await
}

#[tauri::command]
async fn forget_wallet() -> Result<Value, String> {
    request("forgetWallet", Value::Null).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // Single-instance must be registered first. Its deep-link feature forwards a
    // pendrake:// URL to the already-running window instead of opening a second.
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
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
            // Register the scheme at runtime so non-installed dev builds on
            // Linux/Windows still receive pendrake:// URLs. macOS uses the
            // Info.plist registration from tauri.conf.json.
            #[cfg(any(windows, target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                let _ = app.deep_link().register_all();
            }
            // Hold a live subscription to the daemon and re-emit sync events to
            // the webview, so the UI updates on push instead of polling.
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(run_event_bridge(handle));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            import_ufvk,
            get_wallet_state,
            get_addresses,
            get_sync_status,
            get_balance,
            get_transactions,
            get_transaction,
            forget_wallet,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
