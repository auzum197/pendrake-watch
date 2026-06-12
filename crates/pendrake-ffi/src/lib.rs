//! uniffi surface for the macOS Swift helper. Swift implements [`FfiNotifier`]
//! and calls [`start`]; the engine runs in-process behind the returned handle,
//! invoking the callback from a runtime thread for each user-visible event.

use std::sync::{Arc, Mutex};

use pendrake_core::{Config as CoreConfig, EngineHandle as CoreHandle, Notifier};

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

/// Implemented in Swift. The engine calls this from a runtime thread, which is
/// fine for `UNUserNotificationCenter.add`.
#[uniffi::export(callback_interface)]
pub trait FfiNotifier: Send + Sync {
    fn notify(&self, title: String, body: String, deep_link: String);
}

struct NotifierAdapter(Box<dyn FfiNotifier>);

impl Notifier for NotifierAdapter {
    fn notify(&self, title: &str, body: &str, deep_link: &str) {
        self.0
            .notify(title.to_string(), body.to_string(), deep_link.to_string());
    }
}

#[derive(uniffi::Object)]
pub struct EngineHandle {
    inner: Mutex<Option<CoreHandle>>,
}

#[uniffi::export]
pub fn start(config: Config, notifier: Box<dyn FfiNotifier>) -> Result<Arc<EngineHandle>, FfiError> {
    let core_config = CoreConfig {
        data_dir: config.data_dir.map(Into::into),
    };
    let handle = pendrake_core::run(core_config, Arc::new(NotifierAdapter(notifier)))
        .map_err(|e| FfiError::Start(e.to_string()))?;
    Ok(Arc::new(EngineHandle {
        inner: Mutex::new(Some(handle)),
    }))
}

#[uniffi::export]
pub fn stop(handle: Arc<EngineHandle>) {
    if let Ok(mut guard) = handle.inner.lock() {
        guard.take();
    }
}
