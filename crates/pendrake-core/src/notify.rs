//! The notification boundary. The service decides *when* to notify and with what
//! text and deep link; each platform supplies *how* the OS delivers it. Keeping
//! the service free of OS notification APIs is what lets the same core run behind
//! a Rust daemon, a Swift helper, or a test double.

/// Delivers a user-visible notification carrying a `pendrake://` deep link the
/// GUI can open. Click-to-open routing is wired per platform in a later milestone.
///
/// `notify` returns the delivery outcome so the service only records a transaction
/// as notified once it actually reached the OS. A failure leaves the txid eligible
/// for a later retry instead of being silently lost.
pub trait Notifier: Send + Sync {
    fn notify(&self, title: &str, body: &str, deep_link: &str) -> anyhow::Result<()>;
}

/// A notifier that drops everything, for tests and headless runs.
pub struct NullNotifier;

impl Notifier for NullNotifier {
    fn notify(&self, _title: &str, _body: &str, _deep_link: &str) -> anyhow::Result<()> {
        Ok(())
    }
}
