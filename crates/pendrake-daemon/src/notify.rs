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
    fn notify(&self, title: &str, body: &str, deep_link: &str) -> anyhow::Result<()> {
        // The "default" action fires when the user clicks the notification body.
        // Wait for it off the calling thread, then open the deep link.
        let handle = notify_rust::Notification::new()
            .summary(title)
            .body(body)
            .action("default", "Open")
            .show()?;
        let url = deep_link.to_string();
        std::thread::spawn(move || {
            handle.wait_for_action(|action| {
                if action == "default" {
                    open_url(&url);
                }
            });
        });
        Ok(())
    }

    #[cfg(target_os = "windows")]
    fn notify(&self, title: &str, body: &str, deep_link: &str) -> anyhow::Result<()> {
        show_toast(title, body, deep_link).map_err(Into::into)
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows")))]
    fn notify(&self, title: &str, body: &str, _deep_link: &str) -> anyhow::Result<()> {
        notify_rust::Notification::new()
            .summary(title)
            .body(body)
            .show()?;
        Ok(())
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

/// Our AppUserModelID. `register_identity` gives it a name and icon so toasts
/// read as "Pendrake" instead of borrowing PowerShell's identity. Matches the
/// bundle identifier in tauri.conf.json.
#[cfg(target_os = "windows")]
const APP_AUMID: &str = "com.auzum197.pendrake-watch";

/// Register the toast identity for the current user: drop our icon next to the
/// wallet store and point an `AppUserModelId` registry entry at it with a
/// display name. After this, toasts raised under [`APP_AUMID`] show "Pendrake"
/// and our icon. In a packaged build the installer's Start Menu shortcut carries
/// the same AUMID, this is the dev equivalent.
#[cfg(target_os = "windows")]
pub fn register_identity(data_root: &std::path::Path) {
    use std::io::Write;

    let icon = data_root.join("notification-icon.png");
    if !icon.exists() {
        match std::fs::File::create(&icon) {
            Ok(mut f) => {
                let _ = f.write_all(include_bytes!("../../../src-tauri/icons/128x128.png"));
            }
            Err(e) => tracing::warn!("could not write notification icon: {e}"),
        }
    }

    let path = format!(r"Software\Classes\AppUserModelId\{APP_AUMID}");
    match winreg::RegKey::predef(winreg::enums::HKEY_CURRENT_USER).create_subkey(&path) {
        Ok((key, _)) => {
            let _ = key.set_value("DisplayName", &"Pendrake".to_string());
            let _ = key.set_value("IconUri", &icon.to_string_lossy().into_owned());
        }
        Err(e) => tracing::warn!("could not register toast identity: {e}"),
    }
}

/// Show a Windows toast whose click hands the deep link to the shell.
///
/// The root `launch`/`activationType="protocol"` pair is what makes the click
/// work: the shell launches the `pendrake://` URL through the registered scheme
/// handler without an in-process callback, a COM activator, or a live daemon,
/// none of which a parked background process can offer.
#[cfg(target_os = "windows")]
fn show_toast(title: &str, body: &str, deep_link: &str) -> windows::core::Result<()> {
    use windows::core::HSTRING;
    use windows::Data::Xml::Dom::XmlDocument;
    use windows::UI::Notifications::{ToastNotification, ToastNotificationManager};

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
    ToastNotificationManager::CreateToastNotifierWithId(&HSTRING::from(APP_AUMID))?
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
