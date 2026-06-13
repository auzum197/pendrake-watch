//! Desktop notification delivery for the daemon.
//!
//! Linux and Windows post a notification and, when the user clicks it, hand the
//! `pendrake://` deep link to the OS URL opener. The Tauri app registers the
//! scheme, so the opener routes the click to the running GUI, which focuses and
//! opens the transaction. On macOS the daemon is only a dev or headless host
//! (production macOS uses the Swift `PendrakeSync.app`), so its toast just shows.

use pendrake_core::Notifier;

pub struct DesktopNotifier;

impl Notifier for DesktopNotifier {
    #[cfg(target_os = "linux")]
    fn notify(&self, title: &str, body: &str, deep_link: &str) {
        // The "default" action fires when the user clicks the notification body.
        // Wait for it off the calling thread, then open the deep link.
        match notify_rust::Notification::new()
            .summary(title)
            .body(body)
            .action("default", "Open")
            .show()
        {
            Ok(handle) => {
                let url = deep_link.to_string();
                std::thread::spawn(move || {
                    handle.wait_for_action(|action| {
                        if action == "default" {
                            open_url(&url);
                        }
                    });
                });
            }
            Err(e) => tracing::warn!("notification for {deep_link} failed: {e}"),
        }
    }

    #[cfg(target_os = "windows")]
    fn notify(&self, title: &str, body: &str, deep_link: &str) {
        use tauri_winrt_notification::Toast;
        // Reliable activation in production also needs the installer's
        // AppUserModelID Start Menu shortcut (SPEC's Windows section). The
        // PowerShell AUMID lets toasts show in dev.
        let url = deep_link.to_string();
        if let Err(e) = Toast::new(Toast::POWERSHELL_APP_ID)
            .title(title)
            .text1(body)
            .on_activated(move |_action| {
                open_url(&url);
                Ok(())
            })
            .show()
        {
            tracing::warn!("notification for {deep_link} failed: {e}");
        }
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
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

#[cfg(target_os = "linux")]
fn open_url(url: &str) {
    if std::process::Command::new("gio")
        .args(["open", url])
        .spawn()
        .is_ok()
    {
        return;
    }
    if let Err(e) = std::process::Command::new("xdg-open").arg(url).spawn() {
        tracing::warn!("could not open {url}: {e}");
    }
}

#[cfg(target_os = "windows")]
fn open_url(url: &str) {
    // FileProtocolHandler takes the URL as a single argument, so the query's `?`
    // and `&` aren't reinterpreted by a shell and the registered scheme handler
    // runs.
    if let Err(e) = std::process::Command::new("rundll32.exe")
        .arg("url.dll,FileProtocolHandler")
        .arg(url)
        .spawn()
    {
        tracing::warn!("could not open {url}: {e}");
    }
}
