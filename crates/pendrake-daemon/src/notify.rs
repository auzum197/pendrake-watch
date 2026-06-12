//! Desktop notification delivery for the daemon, over notify-rust.

use pendrake_core::Notifier;

pub struct DesktopNotifier;

impl Notifier for DesktopNotifier {
    fn notify(&self, title: &str, body: &str, deep_link: &str) {
        if let Err(e) = notify_rust::Notification::new()
            .summary(title)
            .body(body)
            .show()
        {
            tracing::warn!("notification for {deep_link} failed: {e}");
        }
    }
}
