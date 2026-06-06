//! Windows toast backend (WinRT) — PW-054.
//!
//! Faithful to the architecture doc: a toast whose click opens the `pendrake://`
//! deep link. `tauri-winrt-notification` surfaces the click in-process via
//! `on_activated`; we forward the URI to the OS so it routes back to the GUI
//! through the deep-link plugin — i.e. the same path the daemon will use.

use super::{open_uri, Notification};
use tauri_winrt_notification::{Duration, Toast};

/// Escape a string for use inside an XML attribute.
///
/// `tauri-winrt-notification` writes button `content`/`arguments` into the toast
/// XML **without escaping** (`<action content='{}' arguments='{}'/>`). A raw `&` in
/// the deep link (e.g. `pendrake://tx?account=0&txid=…`) therefore produces invalid
/// XML and Windows **silently drops the toast** — which is why the `tx` notification
/// failed while `sync` (no `&`) worked. Windows un-escapes the value before handing
/// it to `on_activated`, so `open_uri` still receives the original URI.
fn xml_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('\'', "&apos;")
        .replace('"', "&quot;")
}

/// AppUserModelID the toast is attributed to. A packaged build must register a
/// Start Menu shortcut with this AUMID (the NSIS installer does, per the doc),
/// otherwise the toast is silently suppressed. Under `tauri dev` no such shortcut
/// exists, so we use PowerShell's well-known AUMID, which always renders. Swap to
/// [`APP_AUMID`] once the installer registers it.
#[allow(dead_code)]
const APP_AUMID: &str = "com.auzum197.pendrake-watch";

pub fn show(n: &Notification) -> Result<(), String> {
    // Captured by the activation closure; body click → None, button → Some(uri).
    let uri = n.deep_link.clone();

    Toast::new(Toast::POWERSHELL_APP_ID)
        .title(&n.title)
        .text1(&n.body)
        .add_button("Abrir", &xml_escape(&n.deep_link))
        .duration(Duration::Short)
        .on_activated(move |action| {
            let target = action.unwrap_or_else(|| uri.clone());
            let _ = open_uri(&target);
            Ok(())
        })
        .show()
        .map_err(|e| format!("winrt toast failed: {e}"))
}
