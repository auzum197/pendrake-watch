# Pin chain identity with an Anchor recorded at import

A regenerated regtest chain melted a live wallet: striped rebuilt its fake chain under a Wallet that had synced a previous 3.4M-block incarnation, and nothing in the stack could tell the two apart. `GetLightdInfo` reports identical `chainName`, `consensusBranchId`, and activation heights for both, and it carries no genesis hash. pepper-sync ground at 100% CPU forever reconciling its cached dead chain, the wallet file bloated past 1GB, and unlock starved behind the wallet lock.

The fix is an **Anchor** (see CONTEXT.md): at import, record the hash of the block at `min(Birthday, tip)` clamped to ≥1, fetched with the `GetBlock` RPC the sync engine already requires of every Indexer. Before every sync round, and before any Indexer change, re-fetch that block and compare. A mismatch refuses to sync, surfaces a distinct Wrong chain state (red chip, held-open toast, one desktop notification per episode), and backs off like an outage, since the right chain may come back when the correct server restarts. Replace is the deliberate escape to adopt a regenerated chain.

A Wallet imported before Anchors existed gets two layers: a tip heuristic (a server tip more than 100 blocks below the Wallet's Initial-scan target reads as a swapped chain, not lag, which catches this incident's class), and trust-on-first-use adoption, where the sync loop records an Anchor after its next successful round.

## Considered options

- **Auto-wipe on mismatch.** Rejected: a server-side mistake (a load balancer pointing at the wrong backend for an hour) would destroy a synced wallet. Refusing to sync is recoverable in both directions.
- **The tip heuristic alone.** Rejected as the only defense: a chain regenerated to the same or greater length passes it. It stays as the fallback for anchorless wallets because it needs no stored state.
- **Genesis-hash pinning.** Rejected: `GetLightdInfo` doesn't expose it, `get_tree_state` isn't implemented by every simulator, and fetching block 1 instead of the genesis block gives the same guarantee through `GetBlock`, which every Indexer must serve anyway.
- **Verifying once per connection instead of per round.** Rejected for v0: a cache-until-failure optimization re-opens the incident window, since the swap happened under an established connection. The cost is one `GetLightdInfo` plus one `GetBlock` per round (idle rounds every 2s), accepted deliberately.

## Consequences

`meta.json` gains `anchor_height`/`anchor_hash`, absent on older wallets until TOFU fills them. Import gains a hard dependency on `GetBlock` at the anchor height, so a server that can't answer it is rejected at import time. The per-round check makes the sync loop's failure surface slightly wider (a flaky server now fails before the round instead of mid-round), but both paths land in the same error state. The block hash is recorded and verified through one hex encoding (`hex_lower`), so byte order is self-consistent whatever a server's display convention. Only two implementations disagreeing on `GetBlock` for the same chain could false-positive, and the failure mode there is a refused sync with a clear message, never data loss. A "re-pin without wiping" action for a user who intends to keep a regenerated chain is post-v0.
