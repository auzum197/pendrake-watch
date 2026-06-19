//! Pendrake engine over zingolib: watch-only wallet construction, the
//! wallet-file lifecycle, the sync loop that feeds notifications, and the IPC
//! server the GUI connects to. OS notification delivery lives in the host.

mod engine;
mod ipc;
mod notify;
mod paths;
mod run;
pub mod transport;
mod ufvk;

pub use engine::Engine;
pub use notify::{Notifier, NullNotifier};
pub use paths::{Meta, Paths};
pub use run::{run, Config, EngineHandle};
pub use ufvk::{parse_ufvk, UfvkError};
