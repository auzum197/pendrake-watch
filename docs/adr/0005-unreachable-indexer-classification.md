# Classify an unreachable Indexer narrowly, not by the library's recommendation

AUZ-47 needs to tell a connectivity failure to the Indexer apart from every other sync error, so the "Change Indexer" CTA only appears when switching servers could actually help. We set the `unreachable` flag solely for `pepper_sync::error::ServerError::RequestFailed` (the gRPC transport failure), rather than reusing zingolib's `SyncError::recovery_recommendation()`.

## Considered options

The obvious shortcut is the library's `recovery_recommendation()`, whose `ServerUnavailable` verdict reads like "try a different server". It was rejected because that bucket also covers bad-data responses from a *reachable* server (`InvalidFrontier`, `InvalidTransaction`, `InvalidSubtreeRoot`, `ChainVerificationError`). Offering "Change Indexer" for those would point the user at a fix that can't work, which is exactly what the acceptance criteria forbid ("a non-connectivity sync error does not set it").

## Consequences

The classifier (`is_unreachable` in `crates/pendrake-core/src/engine.rs`) must be kept in sync with pepper-sync's `ServerError` variants by hand: a future variant that represents a genuine transport failure won't trip the flag until it's added to the match. That trade is deliberate, since the cost of a false positive (a useless CTA) is worse than a missed one (a generic error message). A future reader tempted to "simplify" this by calling `recovery_recommendation()` should not: see above.
