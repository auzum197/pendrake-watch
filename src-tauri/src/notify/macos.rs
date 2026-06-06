//! macOS notification backend — deliberately a no-op for now.
//!
//! Reliable macOS notifications need a nested `LSUIElement` helper app driving
//! `UNUserNotificationCenter` with a delegate (per the architecture doc), plus
//! signing/notarization. That is post-MVP and owned alongside the daemon work, so
//! here we just succeed silently; in-app surfacing covers macOS until then.

use super::Notification;

pub fn show(_n: &Notification) -> Result<(), String> {
    Ok(())
}
