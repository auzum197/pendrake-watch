//! Notification commands (PW-051+).
//!
//! `notify_test` is the **simulate** hook: it fires a sample native "new transaction"
//! notification end-to-end before the daemon's background sync exists. Once the
//! daemon fires notifications on real events, this stays useful as a manual smoke
//! test of the native-toast + deep-link path.
//!
//! Design (with dorianvp): we only notify on a **new transaction**, never on sync
//! lifecycle events.

use crate::notify::{self, DeepLink, Notification};

/// Fire a sample "transaction received" native notification.
#[tauri::command]
pub fn notify_test() -> Result<(), String> {
    let notification = Notification::new(
        "Transacción recibida",
        "Se detectó una nueva transacción en tu cuenta.",
        DeepLink::Tx {
            account: 0,
            txid: "demo-txid-0001".into(),
        },
    );
    notify::notify(&notification)
}
