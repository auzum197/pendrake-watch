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

    ensure_start_menu_shortcut();
}

/// Windows only renders toasts from an unpackaged app when a Start Menu shortcut
/// carries the matching AppUserModelID. The registry class above gives the toast a
/// name and icon, but without this shortcut the shell silently drops it. Create one
/// once so dev and unpackaged builds notify without the installer (a packaged build's
/// installer ships its own shortcut, and the early return leaves it alone).
#[cfg(target_os = "windows")]
fn ensure_start_menu_shortcut() {
    let Ok(appdata) = std::env::var("APPDATA") else {
        return;
    };
    let lnk = std::path::Path::new(&appdata)
        .join(r"Microsoft\Windows\Start Menu\Programs\Pendrake.lnk");
    if lnk.exists() {
        return;
    }
    let Ok(target) = std::env::current_exe() else {
        return;
    };
    if let Err(e) = write_aumid_shortcut(&lnk, &target) {
        tracing::warn!("could not create Start Menu shortcut for toasts: {e}");
    }
}

/// Write a `.lnk` whose `System.AppUserModel.ID` is our AUMID. The shortcut target
/// only has to be a valid executable for the shell to keep the link, the click that
/// opens a transaction still rides the toast's protocol activation, not this target.
#[cfg(target_os = "windows")]
fn write_aumid_shortcut(lnk: &std::path::Path, target: &std::path::Path) -> windows::core::Result<()> {
    use core::mem::ManuallyDrop;
    use windows::core::{Error, Interface, GUID, HSTRING, PWSTR};
    use windows::Win32::Foundation::{E_OUTOFMEMORY, PROPERTYKEY};
    use windows::Win32::System::Com::StructuredStorage::{
        PROPVARIANT, PROPVARIANT_0_0, PROPVARIANT_0_0_0,
    };
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CoTaskMemAlloc, CoUninitialize, IPersistFile,
        CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED,
    };
    use windows::Win32::System::Variant::VT_LPWSTR;
    use windows::Win32::UI::Shell::PropertiesSystem::IPropertyStore;
    use windows::Win32::UI::Shell::{IShellLinkW, ShellLink};

    let aumid: Vec<u16> = APP_AUMID.encode_utf16().chain(core::iter::once(0)).collect();

    unsafe {
        // Best-effort: a non-success code here (already initialized on this thread) is
        // fine, the calls below report any real failure.
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
        let result = (|| -> windows::core::Result<()> {
            let link: IShellLinkW = CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER)?;
            link.SetPath(&HSTRING::from(target.to_string_lossy().as_ref()))?;

            // The shell link's property store frees the value's string with
            // CoTaskMemFree, so hand it a CoTaskMem-allocated copy rather than Rust-owned
            // memory. The store owns it from here; we never free it, which rules out a
            // double free. This runs once (the shortcut then exists), so a copy the store
            // happens to deep-clone leaks one small string, never on a hot path.
            let bytes = aumid.len() * core::mem::size_of::<u16>();
            let buf = CoTaskMemAlloc(bytes) as *mut u16;
            if buf.is_null() {
                return Err(Error::from_hresult(E_OUTOFMEMORY));
            }
            core::ptr::copy_nonoverlapping(aumid.as_ptr(), buf, aumid.len());

            // System.AppUserModel.ID: {9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3}, pid 5.
            let key = PROPERTYKEY {
                fmtid: GUID::from_u128(0x9F4C2855_9F79_4B39_A8D0_E1D42DE1D5F3),
                pid: 5,
            };
            let mut value = PROPVARIANT::default();
            value.Anonymous.Anonymous = ManuallyDrop::new(PROPVARIANT_0_0 {
                vt: VT_LPWSTR,
                wReserved1: 0,
                wReserved2: 0,
                wReserved3: 0,
                Anonymous: PROPVARIANT_0_0_0 { pwszVal: PWSTR(buf) },
            });

            let store: IPropertyStore = link.cast()?;
            store.SetValue(&key, &value)?;
            store.Commit()?;

            let file: IPersistFile = link.cast()?;
            file.Save(&HSTRING::from(lnk.to_string_lossy().as_ref()), true)?;
            Ok(())
        })();
        CoUninitialize();
        result
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
    // Windows drops a toast whose text matches one it showed moments ago. Tagging each
    // by its deep link keeps notifications for different transactions distinct (the link
    // carries the txid), so two receipts of the same amount both surface, and a repeat
    // of the same one updates in place instead of vanishing.
    toast.SetTag(&HSTRING::from(toast_tag(deep_link)))?;
    ToastNotificationManager::CreateToastNotifierWithId(&HSTRING::from(APP_AUMID))?
        .Show(&toast)
}

/// A short, stable tag for a toast, derived from its deep link with the same FNV-1a
/// the pipe name uses. Stays well inside the tag length limit and is distinct per
/// transaction, since the link carries the txid.
#[cfg(target_os = "windows")]
fn toast_tag(deep_link: &str) -> String {
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    for b in deep_link.bytes() {
        hash ^= u64::from(b);
        hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
    }
    format!("{hash:016x}")
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
