//! Desktop notification delivery for the daemon.
//!
//! Linux posts a notification with a "default" action and opens the `pendrake://`
//! deep link from a worker thread when that action fires. Windows puts the deep
//! link in the toast's `launch` attribute with protocol activation, so the shell
//! routes the click to the registered scheme itself. The Tauri app owns the
//! scheme, so either path reaches the running GUI, which focuses and opens the
//! transaction. On macOS the daemon is only a dev or headless host (production
//! macOS uses the Swift `PendrakeSync.app`), so its toast just shows.

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
        if let Err(e) = show_toast(title, body, deep_link) {
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

/// Show a Windows toast whose click hands the deep link to the shell.
///
/// The PowerShell AUMID lets a non-packaged dev build raise toasts at all. The
/// root `launch`/`activationType="protocol"` pair is what makes the click work:
/// the shell launches the `pendrake://` URL through the registered scheme handler
/// without an in-process callback, a COM activator, or a live daemon, none of
/// which a parked background process can offer.
#[cfg(target_os = "windows")]
fn show_toast(title: &str, body: &str, deep_link: &str) -> windows::core::Result<()> {
    use windows::core::HSTRING;
    use windows::Data::Xml::Dom::XmlDocument;
    use windows::UI::Notifications::{ToastNotification, ToastNotificationManager};

    const POWERSHELL_AUMID: &str =
        r"{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe";

    let xml = format!(
        r#"<toast launch="{}" activationType="protocol">
    <visual>
        <binding template="ToastGeneric">
            <text>{}</text>
            <text>{}</text>
        </binding>
    </visual>
</toast>"#,
        escape_xml(deep_link),
        escape_xml(title),
        escape_xml(body),
    );

    let doc = XmlDocument::new()?;
    doc.LoadXml(&HSTRING::from(xml))?;
    let toast = ToastNotification::CreateToastNotification(&doc)?;
    ToastNotificationManager::CreateToastNotifierWithId(&HSTRING::from(POWERSHELL_AUMID))?
        .Show(&toast)
}

/// Escape the five XML metacharacters so a deep link's `&` or a body's `<` can't
/// break the toast document.
#[cfg(target_os = "windows")]
fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}
