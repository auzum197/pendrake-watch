//! Tauri GUI backend: a thin client over the Pendrake daemon.
//!
//! The `pendraked` daemon owns the wallet file. This process never links
//! pendrake-core. It probes the daemon's local socket (a Unix socket on Unix, a named
//! pipe on Windows), spawns it if nothing answers following the SPEC's
//! probe-and-spawn rule, then forwards request and response JSON between the
//! webview and the socket.

use std::path::PathBuf;
use std::sync::LazyLock;
use std::time::{Duration, Instant};

use serde_json::Value;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::sync::Mutex;

/// The daemon connection: a Unix socket stream on Unix, a named-pipe client on
/// Windows. Both are `AsyncRead + AsyncWrite`, so the JSON-lines code is shared.
#[cfg(unix)]
type Conn = tokio::net::UnixStream;
#[cfg(windows)]
type Conn = tokio::net::windows::named_pipe::NamedPipeClient;

/// Serializes the connect-or-spawn path (so concurrent mount requests don't each
/// spawn) and carries when the daemon was last spawned, so a startup that's slow or
/// that exits on the single-instance lock doesn't draw a fresh `open` per request.
static SPAWN_GATE: LazyLock<Mutex<Option<Instant>>> = LazyLock::new(|| Mutex::new(None));

/// The shortest gap between two spawn attempts. Longer than the 5s we wait for a
/// spawn to bind, so a daemon that never comes up is retried at a slow cadence
/// rather than launched again on every request.
const SPAWN_COOLDOWN: Duration = Duration::from_secs(10);

/// Whether enough time has elapsed since the last spawn to attempt another. Never
/// having spawned always permits one.
fn spawn_due(last: Option<Instant>, now: Instant, cooldown: Duration) -> bool {
    last.map_or(true, |t| now.duration_since(t) >= cooldown)
}

/// Mirrors `pendrake_core::Paths`: same `PENDRAKE_DATA_DIR` override, same default
/// location, so client and daemon agree on the data root. A spawned daemon inherits
/// this process's environment, keeping the override in sync.
fn data_root() -> Result<PathBuf, String> {
    match std::env::var_os("PENDRAKE_DATA_DIR") {
        Some(dir) => Ok(PathBuf::from(dir)),
        None => dirs::data_dir()
            .ok_or_else(|| "could not determine OS data directory".to_string())
            .map(|d| d.join("pendrake-watch")),
    }
}

/// The IPC endpoint, derived from the data root. Mirrors
/// `pendrake_core::transport::endpoint` (same FNV-1a pipe name on Windows) so the
/// client and daemon meet at the same socket without sharing a crate.
fn endpoint() -> Result<String, String> {
    let root = data_root()?;
    #[cfg(unix)]
    {
        Ok(root.join("daemon.sock").to_string_lossy().into_owned())
    }
    #[cfg(windows)]
    {
        let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
        for byte in root.to_string_lossy().as_bytes() {
            hash ^= u64::from(*byte);
            hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
        }
        Ok(format!(r"\\.\pipe\pendrake-{hash:016x}"))
    }
}

/// The `pendraked` binary to spawn: `PENDRAKED_BIN` if set, otherwise a dev build
/// from the workspace target dir (release preferred over debug), probed both from
/// the repo root and from the `src-tauri/` directory Tauri runs in.
fn daemon_bin() -> Option<PathBuf> {
    if let Some(path) = std::env::var_os("PENDRAKED_BIN") {
        return Some(PathBuf::from(path));
    }
    let exe = std::env::consts::EXE_SUFFIX;
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(dir) = exe_path.parent() {
            // Installed package: the bundled sidecar sits next to the GUI binary.
            let bundled = dir.join(format!("pendraked{exe}"));
            if bundled.exists() {
                return Some(bundled);
            }
            // Dev build: the GUI binary lives at src-tauri/target/<profile>/, three
            // levels under the repo root, so the workspace daemon is a fixed hop away.
            // Resolve it relative to this binary, not the working directory, so a
            // launcher that starts the GUI from elsewhere (`just` under Git Bash)
            // still finds it.
            let found = [
                format!("../../../crates/target/release/pendraked{exe}"),
                format!("../../../crates/target/debug/pendraked{exe}"),
            ]
            .into_iter()
            .map(|rel| dir.join(rel))
            .find(|p| p.exists());
            if found.is_some() {
                return found;
            }
        }
    }
    [
        format!("crates/target/release/pendraked{exe}"),
        format!("../crates/target/release/pendraked{exe}"),
        format!("crates/target/debug/pendraked{exe}"),
        format!("../crates/target/debug/pendraked{exe}"),
    ]
    .into_iter()
    .map(PathBuf::from)
    .find(|p| p.exists())
}

#[cfg(target_os = "macos")]
fn pendrake_sync_app() -> Option<PathBuf> {
    const REL: &str = "platform/macos/PendrakeSync/build/PendrakeSync.app";
    // Resolve from the GUI binary, not the working directory: `just macos run`
    // launches the bundle through `open`, which gives it CWD `/`, so CWD-relative
    // probing never finds the helper and the daemon fallback (an unclickable
    // pendraked toast) wins. Walking the binary's ancestors finds the repo helper
    // whether the GUI runs from `tauri dev` (src-tauri/target/<profile>/) or the
    // bundle it's nested several levels deeper in.
    if let Ok(exe) = std::env::current_exe() {
        if let Some(app) = exe
            .ancestors()
            .map(|dir| dir.join(REL))
            .find(|p| p.exists())
        {
            return Some(app);
        }
    }
    PathBuf::from(REL).exists().then(|| PathBuf::from(REL))
}

fn spawn_bin(bin: &PathBuf) -> Result<(), String> {
    let mut cmd = std::process::Command::new(bin);
    // Don't hand the daemon the launcher's stdio. A background process has no use
    // for it, and inheriting it breaks the spawn when the GUI was started from Git
    // Bash: its stdio are MSYS pseudo-terminal handles (emulated pipes), which a
    // CREATE_NO_WINDOW child can't take over. Launched from cmd the inherited
    // handles are real console handles and the spawn works, which is why this only
    // bit under `just`.
    cmd.stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null());
    // pendraked is a console binary, so spawning it from the GUI would flash a
    // terminal window. Detach it from any console on Windows.
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd.spawn()
        .map(|_| ())
        .map_err(|e| format!("failed to spawn {}: {e}", bin.display()))
}

/// Args for `open` that launch the helper in the background. `-g` keeps it from
/// being brought to the foreground, so spawning the windowless daemon host never
/// steals focus from the GUI window.
#[cfg(target_os = "macos")]
fn background_open_args(app: &std::path::Path) -> [&std::ffi::OsStr; 2] {
    [std::ffi::OsStr::new("-g"), app.as_os_str()]
}

#[cfg(target_os = "macos")]
fn open_app(app: &PathBuf) -> Result<(), String> {
    std::process::Command::new("open")
        .args(background_open_args(app))
        .spawn()
        .map(|_| ())
        .map_err(|e| format!("failed to launch {}: {e}", app.display()))
}

async fn connect() -> Result<Conn, std::io::Error> {
    let endpoint = endpoint().map_err(std::io::Error::other)?;
    #[cfg(unix)]
    {
        tokio::net::UnixStream::connect(&endpoint).await
    }
    #[cfg(windows)]
    {
        tokio::net::windows::named_pipe::ClientOptions::new().open(&endpoint)
    }
}

/// Launch the background service. On macOS an explicit override wins first
/// (`PENDRAKE_SYNC_APP`, then `PENDRAKED_BIN`, which lets `just dev` pin the core
/// you're editing), then a discovered Swift `PendrakeSync.app` (the only host that
/// delivers clickable deep-linking notifications), then the `pendraked` binary. The
/// app's embedded core is frozen at the last `scripts/build-macos-helper.sh` run,
/// so we log when we spawn it to keep a stale app from silently standing in for a
/// changed `pendrake-core`.
fn spawn_daemon() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        if let Some(app) = std::env::var_os("PENDRAKE_SYNC_APP")
            .map(PathBuf::from)
            .filter(|p| p.exists())
        {
            return open_app(&app);
        }
        if let Some(bin) = std::env::var_os("PENDRAKED_BIN").map(PathBuf::from) {
            return spawn_bin(&bin);
        }
        if let Some(app) = pendrake_sync_app() {
            eprintln!(
                "pendrake: launching {}. Its core is only as current as your last \
                 scripts/build-macos-helper.sh run, so rerun that after pendrake-core changes",
                app.display()
            );
            return open_app(&app);
        }
        if let Some(bin) = daemon_bin() {
            eprintln!(
                "pendrake: PendrakeSync.app not found, spawning {} \
                 (macOS notifications won't be clickable, build the helper for those)",
                bin.display()
            );
            return spawn_bin(&bin);
        }
        Err(
            "could not start the background process. Build the macOS helper \
             (scripts/build-macos-helper.sh), or set PENDRAKED_BIN to a pendraked binary"
                .into(),
        )
    }
    #[cfg(not(target_os = "macos"))]
    {
        let bin = daemon_bin().unwrap_or_else(|| PathBuf::from("pendraked"));
        spawn_bin(&bin)
    }
}

/// Connect to the daemon, spawning it and waiting for the socket if nothing answers.
async fn ensure_daemon() -> Result<Conn, String> {
    if let Ok(stream) = connect().await {
        return Ok(stream);
    }

    let mut last_spawn = SPAWN_GATE.lock().await;
    // Another request may have spawned the daemon while we waited for the lock.
    if let Ok(stream) = connect().await {
        return Ok(stream);
    }

    // Spawn at most once per cooldown. A daemon that's still binding, or a duplicate
    // that exits on the single-instance lock, would otherwise draw a fresh `open` on
    // every request; here a recent spawn means we wait for it instead of launching another.
    if spawn_due(*last_spawn, Instant::now(), SPAWN_COOLDOWN) {
        spawn_daemon()?;
        *last_spawn = Some(Instant::now());
    }

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
/// ack reply carries `ok`, so only lines carrying `event` are real pushes.
async fn subscribe_once(app: &tauri::AppHandle) -> Result<(), String> {
    use tauri::Emitter;

    let stream = ensure_daemon().await?;
    let (read_half, mut write_half) = tokio::io::split(stream);

    let req = serde_json::json!({ "id": 1, "method": "subscribeEvents", "params": null });
    let mut line = serde_json::to_vec(&req).map_err(|e| e.to_string())?;
    line.push(b'\n');
    write_half
        .write_all(&line)
        .await
        .map_err(|e| e.to_string())?;

    let mut reader = BufReader::new(read_half);
    let mut buf = String::new();
    loop {
        buf.clear();
        let n = reader
            .read_line(&mut buf)
            .await
            .map_err(|e| e.to_string())?;
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
    let (read_half, mut write_half) = tokio::io::split(stream);

    let req = serde_json::json!({ "id": 1, "method": method, "params": params });
    let mut line = serde_json::to_vec(&req).map_err(|e| e.to_string())?;
    line.push(b'\n');
    write_half
        .write_all(&line)
        .await
        .map_err(|e| e.to_string())?;

    let mut reader = BufReader::new(read_half);
    let mut reply = String::new();
    reader
        .read_line(&mut reply)
        .await
        .map_err(|e| e.to_string())?;

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
    // The user's raw Birthday choice (a tagged height/date/default). The daemon's
    // resolver settles it into a height, so the bridge just forwards it (AUZ-95).
    birthday: Value,
    indexer_uri: String,
    network: String,
    passphrase: Option<String>,
) -> Result<Value, String> {
    // A post-Replace import omits the passphrase: the daemon reuses the one it held
    // across the wipe (docs/adr/0004), so leave the field out rather than send null.
    let mut params = serde_json::json!({
        "ufvk": ufvk,
        "birthday": birthday,
        "indexerUri": indexer_uri,
        "network": network,
    });
    if let Some(passphrase) = passphrase {
        params["passphrase"] = Value::String(passphrase);
    }
    request("importUfvk", params).await
}

#[tauri::command]
async fn parse_ufvk(ufvk: String) -> Result<Value, String> {
    request("parseUfvk", serde_json::json!({ "ufvk": ufvk })).await
}

#[tauri::command]
async fn unlock(passphrase: String) -> Result<Value, String> {
    request("unlock", serde_json::json!({ "passphrase": passphrase })).await
}

/// Lock the GUI session. The daemon keeps the wallet open and syncing, but the next
/// session must re-enter the passphrase. Sign Out calls this.
#[tauri::command]
async fn lock() -> Result<Value, String> {
    request("lock", Value::Null).await
}

/// Retarget the running Wallet at a different Indexer. The daemon connects to the
/// new server before persisting, so a rejected URI surfaces here as an error.
#[tauri::command]
async fn set_indexer(indexer_uri: String) -> Result<Value, String> {
    request(
        "setIndexer",
        serde_json::json!({ "indexerUri": indexer_uri }),
    )
    .await
}

/// Toggle whether transaction and scan-complete notifications fire
#[tauri::command]
async fn set_notifications(enabled: bool) -> Result<Value, String> {
    request(
        "setNotifications",
        serde_json::json!({ "enabled": enabled }),
    )
    .await
}

/// Re-authenticate against the daemon's held session passphrase. Returns a bare
/// bool; the Replace modal gates the wipe on it.
#[tauri::command]
async fn verify_passphrase(passphrase: String) -> Result<Value, String> {
    request(
        "verifyPassphrase",
        serde_json::json!({ "passphrase": passphrase }),
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
async fn get_notes() -> Result<Value, String> {
    request("getNotes", Value::Null).await
}

/// Toggle fiat (USD) price display. Enabling records the user's consent to the price
/// egress (docs/adr/0008) and starts the daemon's price refresh.
#[tauri::command]
async fn set_fiat_enabled(enabled: bool) -> Result<Value, String> {
    request("setFiatEnabled", serde_json::json!({ "enabled": enabled })).await
}

/// Toggle Discreet mode. The daemon persists the flag and redacts new-transaction
/// notifications while it is on (docs/adr/0009); masking in the GUI keys off the
/// returned wallet state.
#[tauri::command]
async fn set_discreet(enabled: bool) -> Result<Value, String> {
    request("setDiscreet", serde_json::json!({ "enabled": enabled })).await
}

/// The current reconciled ZEC/USD spot, or null if nothing has been fetched yet.
#[tauri::command]
async fn get_spot_price() -> Result<Value, String> {
    request("getSpotPrice", Value::Null).await
}

/// The reconciled daily ZEC/USD series the chart marks the balance against.
#[tauri::command]
async fn get_price_history() -> Result<Value, String> {
    request("getPriceHistory", Value::Null).await
}

#[tauri::command]
async fn remove_wallet(keep_session: Option<bool>) -> Result<Value, String> {
    request(
        "removeWallet",
        serde_json::json!({ "keepSession": keep_session.unwrap_or(false) }),
    )
    .await
}

/// Bring the GUI window to the front. The notification open's implicit activation
/// is unreliable on macOS, so we focus from the app side instead. `unminimize` and
/// `show` also recover a minimized or hidden window.
fn raise_main_window(app: &tauri::AppHandle) {
    use tauri::Manager;
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // Single-instance must be registered first. When a deep link reaches the
    // already-running app it arrives here as an argv entry, so focus the window
    // and forward any pendrake:// URL to the webview for routing.
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            use tauri::Emitter;
            raise_main_window(app);
            let urls: Vec<String> = argv
                .into_iter()
                .filter(|a| a.starts_with("pendrake://"))
                .collect();
            if !urls.is_empty() {
                let _ = app.emit("deep-link", urls);
            }
        }));
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            use tauri_plugin_deep_link::DeepLinkExt;
            // Register the scheme at runtime so non-installed dev builds on
            // Linux/Windows still receive pendrake:// URLs. macOS uses the
            // Info.plist registration from tauri.conf.json.
            #[cfg(any(windows, target_os = "linux"))]
            {
                let _ = app.deep_link().register_all();
            }
            // Raise the window whenever a deep link reaches the running app. The
            // OS activation from opening the notification's URL is unreliable, so
            // we focus from the app side; navigation stays in the frontend.
            let raise = app.handle().clone();
            app.deep_link()
                .on_open_url(move |_event| raise_main_window(&raise));
            // Hold a live subscription to the daemon and re-emit sync events to
            // the webview, so the UI updates on push instead of polling.
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(run_event_bridge(handle));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            import_ufvk,
            parse_ufvk,
            unlock,
            lock,
            set_indexer,
            set_notifications,
            verify_passphrase,
            get_wallet_state,
            get_addresses,
            get_sync_status,
            get_balance,
            get_transactions,
            get_transaction,
            get_notes,
            set_fiat_enabled,
            set_discreet,
            get_spot_price,
            get_price_history,
            remove_wallet,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::spawn_due;
    use std::time::{Duration, Instant};

    #[test]
    fn a_daemon_never_spawned_is_due() {
        assert!(spawn_due(None, Instant::now(), Duration::from_secs(10)));
    }

    #[test]
    fn a_recent_spawn_is_not_due_again() {
        let spawned = Instant::now();
        let now = spawned + Duration::from_secs(2);
        assert!(!spawn_due(Some(spawned), now, Duration::from_secs(10)));
    }

    #[test]
    fn a_spawn_is_due_again_once_the_cooldown_elapses() {
        let cooldown = Duration::from_secs(10);
        let spawned = Instant::now();
        // Exactly at the cooldown counts as elapsed, so a stuck daemon is retried.
        assert!(spawn_due(Some(spawned), spawned + cooldown, cooldown));
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn the_helper_is_launched_without_stealing_focus() {
        use std::ffi::OsStr;
        use std::path::Path;
        let app = Path::new("/Applications/PendrakeSync.app");
        // `-g` keeps the helper in the background, so launching it never pulls focus
        // off the GUI window.
        assert_eq!(
            super::background_open_args(app),
            [OsStr::new("-g"), app.as_os_str()]
        );
    }
}
