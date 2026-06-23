//! uniffi surface for the macOS Swift helper. Swift implements [`FfiNotifier`]
//! and calls [`start`]; the service runs in-process behind the returned handle,
//! invoking the callback from a runtime thread for each user-visible event.

use std::sync::{Arc, Mutex};

use pendrake_core::{Config as CoreConfig, ServiceHandle as CoreHandle, Notifier};

uniffi::setup_scaffolding!();

#[derive(uniffi::Record)]
pub struct Config {
    pub data_dir: Option<String>,
}

#[derive(Debug, thiserror::Error, uniffi::Error)]
pub enum FfiError {
    #[error("{0}")]
    Start(String),
}

/// Raised by the Swift notifier when the OS rejects a notification, so the service
/// can leave the txid unmarked and retry it later.
#[derive(Debug, thiserror::Error, uniffi::Error)]
pub enum NotifyError {
    #[error("{message}")]
    Failed { message: String },
}

/// uniffi routes a marshalling failure on a callback call through the method's
/// error type, so it needs this conversion.
impl From<uniffi::UnexpectedUniFFICallbackError> for NotifyError {
    fn from(e: uniffi::UnexpectedUniFFICallbackError) -> Self {
        NotifyError::Failed {
            message: e.to_string(),
        }
    }
}

/// Implemented in Swift. The service calls this from a runtime thread, which is
/// fine for `UNUserNotificationCenter.add`. It returns the delivery outcome so the
/// service only records a transaction as notified once the OS accepted it.
#[uniffi::export(callback_interface)]
pub trait FfiNotifier: Send + Sync {
    fn notify(&self, title: String, body: String, deep_link: String) -> Result<(), NotifyError>;
}

struct NotifierAdapter(Box<dyn FfiNotifier>);

impl Notifier for NotifierAdapter {
    fn notify(&self, title: &str, body: &str, deep_link: &str) -> anyhow::Result<()> {
        self.0
            .notify(title.to_string(), body.to_string(), deep_link.to_string())
            .map_err(anyhow::Error::new)
    }
}

#[derive(uniffi::Object)]
pub struct ServiceHandle {
    inner: Mutex<Option<CoreHandle>>,
}

#[uniffi::export]
pub fn start(
    config: Config,
    notifier: Box<dyn FfiNotifier>,
) -> Result<Arc<ServiceHandle>, FfiError> {
    let core_config = CoreConfig {
        data_dir: config.data_dir.map(Into::into),
    };
    let handle = pendrake_core::run(core_config, Arc::new(NotifierAdapter(notifier)))
        .map_err(|e| FfiError::Start(e.to_string()))?;
    Ok(Arc::new(ServiceHandle {
        inner: Mutex::new(Some(handle)),
    }))
}

#[uniffi::export]
pub fn stop(handle: Arc<ServiceHandle>) {
    if let Ok(mut guard) = handle.inner.lock() {
        guard.take();
    }
}
