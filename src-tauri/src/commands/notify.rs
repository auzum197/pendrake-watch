//! Notification commands (PW-051+).
//!
//! `notify_test` is the **simulate** hook: it lets the Settings dev panel fire a
//! real native notification end-to-end before dorianvp's background sync exists.
//! Once the daemon fires notifications on real sync events, this stays useful as
//! a manual smoke test of the native-toast + deep-link path.

use crate::notify::{self, DeepLink, Notification};

/// Fire a sample native notification. `kind` is `"tx"` or `"sync"`.
#[tauri::command]
pub fn notify_test(kind: &str) -> Result<(), String> {
    let notification = match kind {
        "tx" => Notification::new(
            "Transacción recibida",
            "Se detectó una nueva transacción en tu cuenta.",
            DeepLink::Tx {
                account: 0,
                txid: "demo-txid-0001".into(),
            },
        ),
        "sync" => Notification::new(
            "Sincronización completa",
            "Tu wallet está al día.",
            DeepLink::Sync {
                status: "done".into(),
            },
        ),
        other => return Err(format!("unknown notification kind: {other}")),
    };
    notify::notify(&notification)
}
