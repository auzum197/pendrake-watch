//! lightwalletd endpoint configuration (PW-037).
//!
//! This module owns the **data model, defaults and structural validation** of a
//! lightwalletd endpoint. It does NOT open a gRPC connection: the live
//! `GetLightdInfo` handshake is performed by the zingolib connector once the
//! sync layer is integrated (PW-040), to avoid duplicating that client.
//!
//! Security note (see docs): TLS is mandatory for non-local (mainnet) endpoints.

use serde::{Deserialize, Serialize};

use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EndpointConfig {
    pub host: String,
    pub port: u16,
    pub use_tls: bool,
}

impl EndpointConfig {
    /// `https://host:port` (or `http://` for local plaintext).
    pub fn uri(&self) -> String {
        let scheme = if self.use_tls { "https" } else { "http" };
        format!("{scheme}://{}:{}", self.host, self.port)
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NamedEndpoint {
    pub label: String,
    pub config: EndpointConfig,
}

/// Curated list of public mainnet lightwalletd servers, all TLS.
pub fn default_endpoints() -> Vec<NamedEndpoint> {
    let tls = |host: &str, port: u16| EndpointConfig {
        host: host.to_string(),
        port,
        use_tls: true,
    };
    vec![
        NamedEndpoint {
            label: "zec.rocks".into(),
            config: tls("zec.rocks", 443),
        },
        NamedEndpoint {
            label: "zec.rocks (NA)".into(),
            config: tls("na.zec.rocks", 443),
        },
        NamedEndpoint {
            label: "zec.rocks (EU)".into(),
            config: tls("eu.zec.rocks", 443),
        },
        NamedEndpoint {
            label: "Zcash (ECC)".into(),
            config: tls("mainnet.lightwalletd.com", 9067),
        },
    ]
}

/// Structural + security validation. Does NOT contact the network.
pub fn validate_endpoint(cfg: &EndpointConfig) -> Result<(), AppError> {
    let host = cfg.host.trim();
    if host.is_empty() {
        return Err(AppError::new("invalid_endpoint", "Host cannot be empty"));
    }
    // Host must be a bare hostname/IP, not a URL.
    if host.contains("://") || host.contains('/') || host.contains(' ') {
        return Err(AppError::new(
            "invalid_endpoint",
            "Host must not include a scheme or path",
        ));
    }
    if cfg.port == 0 {
        return Err(AppError::new("invalid_endpoint", "Invalid port"));
    }
    // Security: never allow plaintext to a non-local (public/mainnet) node.
    let is_local = host == "localhost"
        || host == "::1"
        || host.starts_with("127.")
        || host.starts_with("192.168.")
        || host.starts_with("10.");
    if !cfg.use_tls && !is_local {
        return Err(AppError::new(
            "insecure_endpoint",
            "TLS is required for non-local endpoints",
        ));
    }
    Ok(())
}
