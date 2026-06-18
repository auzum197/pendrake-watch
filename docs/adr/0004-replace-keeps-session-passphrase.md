# Replace swaps the viewing key and keeps the session passphrase

Replacing a Wallet in v0 (importing a different UFVK over the current one) runs as two phases inside one daemon session. A destructive confirmation in the Settings danger zone re-authenticates with the Passphrase and wipes the current Wallet, then the user lands in onboarding and imports the new UFVK. Across that wipe the daemon holds the in-memory session Passphrase instead of tearing it down, so the new Wallet is encrypted with the same global Passphrase and onboarding skips Set Password. Replace changes only the viewing key. It cannot change the Passphrase.

Decoupling the wipe from the import is the point. The post-wipe state is the ordinary onboarding entry state, identical to a first run, so there is no atomic "replace" backend command and no half-built state to recover. The wipe reuses the existing forget path and the import reuses the existing onboarding import. Onboarding shows Set Password only when no session Passphrase is held, so the daemon exposes whether one is currently held. Today's `exists` and `locked` bits cannot tell a post-Replace empty-but-unlocked daemon from a cold one, so a session-held signal is added.

## Considered Options

An atomic replace command, entering the new key in Settings and swapping in one backend call, was rejected. A forget-then-import that fails part way leaves no Wallet and a half-built state, and it duplicates the onboarding import UI. Routing through onboarding makes the post-wipe state a known one.

A cold wipe then re-onboard, dropping the session Passphrase the way Start over does, was rejected. It forces the user to set a Passphrase again for what is conceptually the same vault, and v0 holds one global Passphrase whose rotation is deferred (ADR-0003). Reusing the held Passphrase keeps Replace honest as a key swap.

## Consequences

The daemon keeps the session Passphrase through a Replace-initiated wipe and exposes a session-held signal for onboarding to branch on. Replace cannot change the Passphrase, which stays a Start over and post-v0 concern. Cancel protects only up to the modal. Confirming commits the wipe before any new key exists, so the current Wallet's synced history is gone at that moment, rebuildable only by re-importing a UFVK. Because the wallet is watch-only, no spend authority is lost.
