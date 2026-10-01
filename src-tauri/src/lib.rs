//! Tauri GUI backend: a thin client over the Pendrake daemon.
//!
//! The `pendraked` daemon owns the wallet file. This process never links
//! pendrake-core. It probes the daemon's local socket (a Unix socket on Unix, a named
//! pipe on Windows), spawns it if nothing answers following the SPEC's
//! probe-and-spawn rule, then forwards request and response JSON between the
//! webview and the socket.

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::LazyLock;
use std::time::{Duration, Instant};

use pendrake_ipc::{
    BirthdayInput, Call, ExportUfvkArgs, GetTransactionArgs, ImportUfvkArgs, Network,
    ParseUfvkArgs, RemoveArgs, Request, RescanArgs, SelectWalletArgs, SetDiscreetArgs,
    SetFiatEnabledArgs, SetIndexerArgs, SetNotificationsArgs, SetWalletLabelArgs, UnlockArgs,
    VerifyPassphraseArgs,
};
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

/// When false, the GUI stops the daemon on exit. Default true preserves the
/// existing background behaviour. Synced from the frontend preference.
static KEEP_RUNNING_IN_BACKGROUND: AtomicBool = AtomicBool::new(true);

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

/// Connect only. Never spawns. Used by the event bridge and by read paths that
/// must not start background work just because the GUI opened.
async fn connect_daemon() -> Result<Conn, String> {
    connect().await.map_err(|e| e.to_string())
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

    let stream = connect_daemon().await?;
    let (read_half, mut write_half) = tokio::io::split(stream);

    let req = Request {
        id: 1,
        call: Call::SubscribeEvents,
    };
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

async fn request(call: Call) -> Result<Value, String> {
    let stream = if call.may_spawn() {
        ensure_daemon().await?
    } else {
        connect_daemon().await?
    };
    let (read_half, mut write_half) = tokio::io::split(stream);

    let req = Request { id: 1, call };
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
    birthday: BirthdayInput,
    indexer_uri: String,
    network: Network,
    // A post-Replace import omits the passphrase: the daemon reuses the one it held
    // across the wipe (docs/adr/0004).
    passphrase: Option<String>,
) -> Result<Value, String> {
    request(Call::ImportUfvk(ImportUfvkArgs {
        ufvk,
        birthday,
        indexer_uri,
        network,
        passphrase,
    }))
    .await
}

#[tauri::command]
async fn parse_ufvk(ufvk: String) -> Result<Value, String> {
    request(Call::ParseUfvk(ParseUfvkArgs { ufvk })).await
}

#[tauri::command]
async fn unlock(passphrase: String) -> Result<Value, String> {
    request(Call::Unlock(UnlockArgs { passphrase })).await
}

/// Lock the GUI session. The daemon keeps every Wallet open and syncing, but the
/// next session must re-enter the passphrase. Sign Out calls this.
#[tauri::command]
async fn lock() -> Result<Value, String> {
    request(Call::Lock).await
}

/// Retarget the running Wallet at a different Indexer. The daemon connects to the
/// new server before persisting, so a rejected URI surfaces here as an error.
#[tauri::command]
async fn set_indexer(indexer_uri: String) -> Result<Value, String> {
    request(Call::SetIndexer(SetIndexerArgs { indexer_uri })).await
}

/// Toggle whether transaction and scan-complete notifications fire, for the named
/// Wallet or the Selected one when `id` is absent.
#[tauri::command]
async fn set_notifications(enabled: bool, id: Option<String>) -> Result<Value, String> {
    request(Call::SetNotifications(SetNotificationsArgs { enabled, id })).await
}

/// The UFVK a Wallet was imported from, released only against the session
/// passphrase. Comes back as a bare JSON string the GUI shows once.
#[tauri::command]
async fn export_ufvk(id: String, passphrase: String) -> Result<Value, String> {
    request(Call::ExportUfvk(ExportUfvkArgs { id, passphrase })).await
}

/// Re-authenticate against the daemon's held session passphrase. Returns a bare
/// bool; the Remove dialog gates the wipe on it.
#[tauri::command]
async fn verify_passphrase(passphrase: String) -> Result<Value, String> {
    request(Call::VerifyPassphrase(VerifyPassphraseArgs { passphrase })).await
}

fn empty_wallet_state() -> Value {
    serde_json::json!({
        "exists": false,
        "locked": false,
        "sessionHeld": false,
        "fingerprint": null,
        "importType": "ufvk",
        "viewMode": "full",
        "network": "mainnet",
        "birthdayHeight": 0,
        "indexerUri": "",
        "notificationsEnabled": true,
        "fiatEnabled": false,
        "discreet": false,
    })
}

#[tauri::command]
async fn get_wallet_state() -> Result<Value, String> {
    match request(Call::GetWalletState).await {
        Ok(v) => Ok(v),
        Err(_) => Ok(empty_wallet_state()),
    }
}

#[tauri::command]
async fn get_addresses() -> Result<Value, String> {
    request(Call::GetAddresses).await
}

#[tauri::command]
async fn get_sync_status() -> Result<Value, String> {
    match request(Call::GetSyncStatus).await {
        Ok(v) => Ok(v),
        Err(_) => Ok(serde_json::json!({
            "state": "idle",
            "syncedHeight": 0,
            "chainTip": 0,
            "percent": 0,
        })),
    }
}

#[tauri::command]
async fn get_balance() -> Result<Value, String> {
    request(Call::GetBalance).await
}

#[tauri::command]
async fn get_transactions() -> Result<Value, String> {
    request(Call::GetTransactions).await
}

#[tauri::command]
async fn get_transaction(txid: String) -> Result<Value, String> {
    request(Call::GetTransaction(GetTransactionArgs { txid })).await
}

#[tauri::command]
async fn get_notes() -> Result<Value, String> {
    request(Call::GetNotes).await
}

/// Toggle fiat (USD) price display. Enabling records the user's consent to the price
/// egress (docs/adr/0008) and starts the daemon's price refresh.
#[tauri::command]
async fn set_fiat_enabled(enabled: bool) -> Result<Value, String> {
    request(Call::SetFiatEnabled(SetFiatEnabledArgs { enabled })).await
}

/// Toggle Discreet mode. The daemon persists the flag and redacts new-transaction
/// notifications while it is on (docs/adr/0009); masking in the GUI keys off the
/// returned wallet state.
#[tauri::command]
async fn set_discreet(enabled: bool) -> Result<Value, String> {
    request(Call::SetDiscreet(SetDiscreetArgs { enabled })).await
}

/// The current reconciled ZEC/USD spot, or null if nothing has been fetched yet.
#[tauri::command]
async fn get_spot_price() -> Result<Value, String> {
    request(Call::GetSpotPrice).await
}

/// The reconciled daily ZEC/USD series the chart marks the balance against.
#[tauri::command]
async fn get_price_history() -> Result<Value, String> {
    request(Call::GetPriceHistory).await
}

/// Remove one Wallet. `select` names the Wallet to show next when the removed one
/// was Selected; the daemon falls back to the first remaining one.
#[tauri::command]
async fn remove_wallet(id: String, select: Option<String>) -> Result<Value, String> {
    request(Call::RemoveWallet(RemoveArgs { id, select })).await
}

/// Drop one Wallet's scanned history and scan again from its Birthday. Returns the
/// Selected Wallet's state; progress arrives on the sync-event stream.
#[tauri::command]
async fn rescan_wallet(id: String) -> Result<Value, String> {
    request(Call::RescanWallet(RescanArgs { id })).await
}

/// Wipe every Wallet and forget the passphrase: the way out of a forgotten one.
#[tauri::command]
async fn start_over() -> Result<Value, String> {
    request(Call::StartOver).await
}

#[tauri::command]
async fn list_wallets() -> Result<Value, String> {
    match request(Call::ListWallets).await {
        Ok(v) => Ok(v),
        Err(_) => Ok(Value::Array(vec![])),
    }
}

#[tauri::command]
async fn select_wallet(id: String) -> Result<Value, String> {
    request(Call::SelectWallet(SelectWalletArgs { id })).await
}

/// Set or clear a user-facing wallet name. Empty label clears (short fingerprint).
#[tauri::command]
async fn set_wallet_label(id: String, label: String) -> Result<Value, String> {
    request(Call::SetWalletLabel(SetWalletLabelArgs { id, label })).await
}

#[tauri::command]
fn set_keep_running_in_background(enabled: bool) {
    KEEP_RUNNING_IN_BACKGROUND.store(enabled, Ordering::SeqCst);
}

#[tauri::command]
fn get_keep_running_in_background() -> bool {
    KEEP_RUNNING_IN_BACKGROUND.load(Ordering::SeqCst)
}

fn kill_daemon_by_name() {
    #[cfg(unix)]
    {
        let _ = std::process::Command::new("pkill")
            .args(["-x", "pendraked"])
            .status();
        let _ = std::process::Command::new("pkill")
            .args(["-f", "PendrakeSync"])
            .status();
    }
    #[cfg(windows)]
    {
        let _ = std::process::Command::new("taskkill")
            .args(["/F", "/IM", "pendraked.exe"])
            .status();
    }
}

async fn try_shutdown_daemon() {
    let _ = request(Call::Shutdown).await;
    tokio::time::sleep(Duration::from_millis(300)).await;
    kill_daemon_by_name();
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

/// Width over height of the main window at launch and at its smallest.
const WINDOW_ASPECT: f64 = 16.0 / 9.0;

/// Share of the monitor work area left clear on each side of the window at launch.
const WINDOW_MARGIN: f64 = 0.05;

/// Smallest width the layout holds together at. Matches `minWidth` in
/// `tauri.conf.json`, whose `minHeight` keeps the same aspect.
const WINDOW_MIN_WIDTH: f64 = 960.0;

/// The launch size of the main window, in logical pixels, for a work area of the
/// given logical size: the largest `WINDOW_ASPECT` rectangle that leaves
/// `WINDOW_MARGIN` clear on every side. The tighter axis sets the size, so the
/// other axis ends up with a wider gap. Never smaller than the minimum.
fn launch_size(work_width: f64, work_height: f64) -> (f64, f64) {
    let free = 1.0 - 2.0 * WINDOW_MARGIN;
    let width = (work_width * free)
        .min(work_height * free * WINDOW_ASPECT)
        .max(WINDOW_MIN_WIDTH);
    (width, width / WINDOW_ASPECT)
}

/// Size the main window to its monitor, centre it in the work area, then show it.
/// The window is created hidden (`visible: false` in `tauri.conf.json`) so it never
/// appears at the config fallback size first. Runs on every launch: the size is
/// not remembered between runs. The work area excludes the menu bar and the Dock.
fn place_main_window(app: &tauri::App) -> tauri::Result<()> {
    use tauri::Manager;
    let Some(window) = app.get_webview_window("main") else {
        return Ok(());
    };
    let monitor = match window.current_monitor()? {
        Some(monitor) => Some(monitor),
        None => window.primary_monitor()?,
    };
    if let Some(monitor) = monitor {
        let scale = monitor.scale_factor();
        let area = monitor.work_area();
        let (area_width, area_height) = (f64::from(area.size.width), f64::from(area.size.height));
        let (width, height) = launch_size(area_width / scale, area_height / scale);
        window.set_size(tauri::LogicalSize::new(width, height))?;
        window.set_position(tauri::PhysicalPosition::new(
            f64::from(area.position.x) + (area_width - width * scale) / 2.0,
            f64::from(area.position.y) + (area_height - height * scale) / 2.0,
        ))?;
    }
    window.show()
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

    let app = builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            use tauri_plugin_deep_link::DeepLinkExt;
            place_main_window(app)?;
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
            export_ufvk,
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
            rescan_wallet,
            start_over,
            list_wallets,
            select_wallet,
            set_wallet_label,
            set_keep_running_in_background,
            get_keep_running_in_background,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_app_handle, event| {
        if let tauri::RunEvent::ExitRequested { .. } = event {
            if !KEEP_RUNNING_IN_BACKGROUND.load(Ordering::SeqCst) {
                let _ = tauri::async_runtime::block_on(async {
                    tokio::time::timeout(Duration::from_secs(2), try_shutdown_daemon()).await
                });
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::{launch_size, spawn_due, WINDOW_ASPECT};
    use std::time::{Duration, Instant};

    #[test]
    fn a_16_10_screen_is_limited_by_its_width() {
        let (width, height) = launch_size(1512.0, 944.0);
        assert!((width - 1512.0 * 0.9).abs() < 1e-9);
        assert!((width / height - WINDOW_ASPECT).abs() < 1e-9);
        assert!((944.0 - height) / 2.0 > 944.0 * 0.05);
    }

    #[test]
    fn an_ultrawide_screen_is_limited_by_its_height() {
        let (width, height) = launch_size(3440.0, 1400.0);
        assert!((height - 1400.0 * 0.9).abs() < 1e-9);
        assert!((width / height - WINDOW_ASPECT).abs() < 1e-9);
    }

    #[test]
    fn a_small_screen_gets_the_minimum_size() {
        assert_eq!(launch_size(1000.0, 600.0), (960.0, 540.0));
    }

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
