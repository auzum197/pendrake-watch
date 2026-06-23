# The Initial scan ends at the chain tip pinned at import, not the live tip

A Wallet's Initial scan is bounded by a single height, N, captured as the chain tip the moment the UFVK is imported and persisted with the Wallet. While `synced_height < N` the Wallet is in its Initial scan: every detected transaction is recorded into the seen-set silently and no notification fires. Crossing N (`synced_height >= N`) emits the one "scanned successfully" and the Wallet goes live, after which every newly seen txid notifies. The phase is not a stored flag, it is read from the two heights, so a process killed mid-scan resumes in the Initial scan with nothing to recover.

The reason to pin N at import rather than define the boundary as "caught up to the tip": the live tip is a moving target a Wallet is never exactly on, so "reached the tip" has no fixed answer, and after a restart a half-finished scan looks the same as a finished one. A pinned height is a line crossed exactly once, and `synced_height >= N` returns the same answer across restarts.

## Considered options

Defining the boundary as the live chain tip, extending it each round until the Wallet truly catches up, was rejected. It brings back the moving-target ambiguity, can chase a tip that keeps advancing on a fast chain, and forces an extra persisted flag to tell an in-progress catch-up from a completed one after a restart. That flag is exactly the bookkeeping a pinned height removes.

## Consequences

Blocks mined between import and the moment the scan crosses N were never in the pinned range, so the Wallet notifies for transactions in them once it goes live. A long Initial scan, the kind a far-back Birthday produces, lets the chain advance meaningfully while it runs, so crossing N can be followed right away by a short burst of per-transaction notifications for those during-scan blocks and the mempool. This is accepted: those transactions are genuinely recent, and suppressing them would mean chasing the live tip again. A future reader who reads the post-"scanned successfully" burst as a bug and moves to silence notifications until the Wallet is "fully caught up" would be undoing this decision, not fixing it.

Catch-ups after the Initial scan always notify per transaction and are not coalesced, including a backlog found after the daemon was offline. Each one is real activity since the Wallet went live, so it earns its own toast. Pinning N governs only the one-time Initial scan boundary, not steady-state notification volume.

A transaction's silence is judged by its own block height, not the live `synced_height`. pepper-sync scans tip-first, so `synced_height` can pass N while older blocks in the pinned range are still unwalked, and a stale transaction found after that jump would wrongly notify. Below N is silent, at or past N notifies, and a mempool transaction (no height yet) always notifies. The one-time "scanned successfully" still rides on `synced_height` reaching N.
