//! Native desktop notifications (PW-051+).
//!
//! Design goal: this module is **Tauri-free** so it can be lifted wholesale into
//! dorianvp's `wallet-daemon` once background sync exists — the daemon is the
//! component that will actually fire these on real sync events. For the MVP the
//! GUI process fires them (see [`crate::commands::notify`]), driven by the
//! simulate buttons in Settings.
//!
//! Contract (mirrors the daemon architecture doc):
//! - Every notification carries a **deep-link URI** (`pendrake://…`). Clicking it
//!   opens that URI through the OS, which routes back to the running GUI via
//!   `tauri-plugin-deep-link` + `tauri-plugin-single-instance`. That is exactly
//!   the path the future daemon will use, so the click handling is the same code.
//! - Backends are selected by `#[cfg]`; each platform pulls only its own dep.
//!   macOS is a deliberate no-op for now (helper-app + `UNUserNotificationCenter`
//!   is post-MVP, per the doc's build order).

mod deeplink;
#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;

pub use deeplink::DeepLink;

/// A platform-agnostic notification ready to be shown.
#[derive(Debug, Clone)]
pub struct Notification {
    pub title: String,
    pub body: String,
    /// `pendrake://…` intent opened when the notification is clicked.
    pub deep_link: String,
}

impl Notification {
    pub fn new(title: impl Into<String>, body: impl Into<String>, link: DeepLink) -> Self {
        Self {
            title: title.into(),
            body: body.into(),
            deep_link: link.to_uri(),
        }
    }
}

/// Show a native notification. Returns `Ok(())` on platforms without a backend
/// (currently macOS) so callers don't have to special-case them.
pub fn notify(n: &Notification) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        windows::show(n)
    }
    #[cfg(target_os = "linux")]
    {
        linux::show(n)
    }
    #[cfg(target_os = "macos")]
    {
        macos::show(n)
    }
    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    {
        let _ = n;
        Ok(())
    }
}

/// Open a `pendrake://` URI through the OS so it routes back to the GUI via the
/// deep-link handler. Used by notification click callbacks. Best-effort.
#[cfg(any(target_os = "windows", target_os = "linux"))]
pub(crate) fn open_uri(uri: &str) -> std::io::Result<()> {
    use std::process::Command;
    #[cfg(target_os = "windows")]
    {
        // `start` is a cmd builtin; the empty "" is the window-title arg so the
        // quoted URI isn't consumed as the title.
        Command::new("cmd")
            .args(["/C", "start", "", uri])
            .spawn()
            .map(|_| ())
    }
    #[cfg(target_os = "linux")]
    {
        Command::new("gio")
            .args(["open", uri])
            .spawn()
            .or_else(|_| Command::new("xdg-open").arg(uri).spawn())
            .map(|_| ())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tx_deep_link_round_trips_into_a_notification() {
        let n = Notification::new(
            "Transacción recibida",
            "Nueva tx",
            DeepLink::Tx {
                account: 0,
                txid: "abc123".into(),
            },
        );
        assert_eq!(n.deep_link, "pendrake://tx?account=0&txid=abc123");
    }

    #[test]
    fn query_values_are_percent_encoded() {
        let n = Notification::new(
            "Sync",
            "done",
            DeepLink::Sync {
                status: "done now".into(),
            },
        );
        assert_eq!(n.deep_link, "pendrake://sync?status=done%20now");
    }
}
