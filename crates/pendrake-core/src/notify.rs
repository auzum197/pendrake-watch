//! The notification boundary. The engine decides *when* to notify and with what
//! text and deep link; each platform supplies *how* the OS delivers it. Keeping
//! the engine free of OS notification APIs is what lets the same core run behind
//! a Rust daemon, a Swift helper, or a test double.

/// Delivers a user-visible notification carrying a `pendrake://` deep link the
/// GUI can open. Click-to-open routing is wired per platform in a later milestone.
pub trait Notifier: Send + Sync {
    fn notify(&self, title: &str, body: &str, deep_link: &str);
}

/// A notifier that drops everything, for tests and headless runs.
pub struct NullNotifier;

impl Notifier for NullNotifier {
    fn notify(&self, _title: &str, _body: &str, _deep_link: &str) {}
}
