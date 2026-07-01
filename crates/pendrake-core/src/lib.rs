//! Pendrake core over zingolib: watch-only wallet construction, the
//! wallet-file lifecycle, the sync loop that feeds notifications, and the IPC
//! server the GUI connects to. OS notification delivery lives in the host.

mod birthday;
mod ipc;
mod notify;
mod notify_policy;
mod paths;
mod run;
pub mod transport;
mod ufvk;
mod wallet_service;

pub use notify::{Notifier, NullNotifier};
pub use paths::{Meta, Paths};
pub use run::{run, Config, ServiceHandle, StartError};
pub use wallet_service::WalletService;
pub use ufvk::{parse_ufvk, UfvkError};
