//! gRPC connector to a `lightwalletd` server (PW-040).
//!
//! **Adapted from** `zingolib/src/grpc_connector.rs` (MIT) — same TLS-via-webpki
//! roots + 10s timeout pattern, trimmed to what Pendrake needs and rebuilt around
//! our [`EndpointConfig`] instead of `http::Uri` + `zingo_netutils`. Kept
//! **Tauri-free** so it can move into dorianvp's `wallet-daemon` later.
//!
//! The `CompactTxStreamerClient` and message types come from
//! `zcash_client_backend::proto::service`, so they match the rest of the core.

use std::time::Duration;

use tonic::transport::{Channel, ClientTlsConfig, Endpoint};
use tonic::Request;
use zcash_client_backend::proto::service::compact_tx_streamer_client::CompactTxStreamerClient;
use zcash_client_backend::proto::service::{BlockId, ChainSpec, Empty, LightdInfo, TreeState};

use crate::lightwalletd::EndpointConfig;

/// Matches zingolib's default; lightwalletd handshakes are quick when reachable.
pub const DEFAULT_GRPC_TIMEOUT: Duration = Duration::from_secs(10);

/// Open a gRPC channel to the endpoint. TLS (webpki roots) for `https`, plaintext
/// only when `use_tls` is false (already gated to local hosts by `validate_endpoint`).
pub(crate) async fn connect(
    cfg: &EndpointConfig,
) -> Result<CompactTxStreamerClient<Channel>, String> {
    let endpoint = Endpoint::from_shared(cfg.uri())
        .map_err(|e| format!("invalid endpoint URI: {e}"))?
        .tcp_nodelay(true)
        .timeout(DEFAULT_GRPC_TIMEOUT)
        .connect_timeout(DEFAULT_GRPC_TIMEOUT);

    let channel = if cfg.use_tls {
        endpoint
            .tls_config(ClientTlsConfig::new().with_webpki_roots())
            .map_err(|e| format!("TLS config error: {e}"))?
            .connect()
            .await
            .map_err(|e| format!("connection failed: {e}"))?
    } else {
        endpoint
            .connect()
            .await
            .map_err(|e| format!("connection failed: {e}"))?
    };

    Ok(CompactTxStreamerClient::new(channel))
}

/// `GetLightdInfo` — the server handshake. Used to validate an endpoint live.
pub async fn get_lightd_info(cfg: &EndpointConfig) -> Result<LightdInfo, String> {
    let mut client = connect(cfg).await?;
    let mut req = Request::new(Empty {});
    req.set_timeout(DEFAULT_GRPC_TIMEOUT);
    let info = client
        .get_lightd_info(req)
        .await
        .map_err(|e| format!("get_lightd_info failed: {e}"))?
        .into_inner();
    Ok(info)
}

/// `GetLatestBlock` — current chain tip height as the server sees it. Used by the
/// wallet import (birthday) + live tests; wired into sync in 3b.
#[allow(dead_code)]
pub async fn get_latest_block_height(cfg: &EndpointConfig) -> Result<u64, String> {
    let mut client = connect(cfg).await?;
    let mut req = Request::new(ChainSpec {});
    req.set_timeout(DEFAULT_GRPC_TIMEOUT);
    let block = client
        .get_latest_block(req)
        .await
        .map_err(|e| format!("get_latest_block failed: {e}"))?
        .into_inner();
    Ok(block.height)
}

/// `GetTreeState` at `height` — the note commitment tree frontier, used to build an
/// `AccountBirthday` when importing a view-only account (Fase 3). Wired into commands
/// in 3b; used by the wallet import + its live test for now.
#[allow(dead_code)]
pub async fn get_tree_state(cfg: &EndpointConfig, height: u64) -> Result<TreeState, String> {
    let mut client = connect(cfg).await?;
    let mut req = Request::new(BlockId {
        height,
        hash: vec![],
    });
    req.set_timeout(DEFAULT_GRPC_TIMEOUT);
    let tree = client
        .get_tree_state(req)
        .await
        .map_err(|e| format!("get_tree_state failed: {e}"))?
        .into_inner();
    Ok(tree)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn zec_rocks() -> EndpointConfig {
        EndpointConfig {
            host: "zec.rocks".into(),
            port: 443,
            use_tls: true,
        }
    }

    // Live network test — hits a public mainnet lightwalletd. Ignored by default so
    // CI stays hermetic; run locally with:
    //   cargo test --lib grpc::tests::live -- --ignored --nocapture
    #[ignore]
    #[tokio::test]
    async fn live_get_lightd_info() {
        let info = get_lightd_info(&zec_rocks()).await.expect("handshake");
        println!(
            "chain={} height={} vendor={} version={}",
            info.chain_name, info.block_height, info.vendor, info.version
        );
        assert_eq!(info.chain_name, "main");
        assert!(info.block_height > 2_000_000);
    }

    #[ignore]
    #[tokio::test]
    async fn live_get_latest_block_height() {
        let h = get_latest_block_height(&zec_rocks()).await.expect("tip");
        assert!(h > 2_000_000);
    }
}
