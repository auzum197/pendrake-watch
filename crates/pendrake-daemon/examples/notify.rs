//! Manual check for desktop notifications. Fires one toast through the daemon's
//! real `DesktopNotifier`. It exits non-zero if delivery to the OS fails, so it
//! catches a broken notification path (no D-Bus session, unsigned bundle). Whether
//! the toast actually renders and its click opens the deep link still needs a human
//! watching the desktop, so it stays up for a minute before exiting. Run with
//! `cargo run -p pendrake-daemon --example notify`.

// This binary crate has no library target, so reuse the daemon's notify module
// by path rather than importing it.
#[path = "../src/notify.rs"]
mod notify;

use notify::DesktopNotifier;
use pendrake_core::Notifier;

fn main() -> anyhow::Result<()> {
    // Windows toasts only render branded under our registered AUMID. Mirror the
    // daemon's startup so the example shows the same identity.
    #[cfg(target_os = "windows")]
    {
        let paths = pendrake_core::Paths::resolve()?;
        paths.ensure_dirs()?;
        notify::register_identity(&paths.root);
    }

    // A unique txid per run so the toast mirrors distinct transactions (the daemon
    // never re-fires the same one), which also gives each toast its own tag.
    let unique = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    DesktopNotifier.notify(
        "Funds received",
        "0.42 ZEC received in your wallet.",
        &format!("pendrake://tx?txid={unique:064x}"),
    )?;

    // Keep the process alive so the toast outlives this one-shot run. notify_rust
    // serves the click action over a D-Bus connection the sender must hold open, and a
    // sender that exits has its action-carrying notification withdrawn by some servers
    // (KDE). The real daemon stays parked, so mirror it long enough to watch and click.
    std::thread::sleep(std::time::Duration::from_secs(60));
    Ok(())
}
