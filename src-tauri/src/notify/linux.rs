//! Linux notification backend (`org.freedesktop.Notifications` via notify-rust).
//!
//! The default action opens the `pendrake://` deep link. `wait_for_action` blocks
//! until the user acts, so it runs on a detached thread — best-effort, never
//! stalls the caller. In a packaged build the `.desktop` scheme handler is the
//! robust path (per the doc); this in-process action is the dev/MVP equivalent.

use super::{open_uri, Notification};
use notify_rust::Notification as Notif;

pub fn show(n: &Notification) -> Result<(), String> {
    let uri = n.deep_link.clone();

    let handle = Notif::new()
        .summary(&n.title)
        .body(&n.body)
        .action("default", "Abrir")
        .show()
        .map_err(|e| format!("notify-rust failed: {e}"))?;

    std::thread::spawn(move || {
        handle.wait_for_action(|action| {
            if action == "default" {
                let _ = open_uri(&uri);
            }
        });
    });

    Ok(())
}
