# At-rest encryption with a global passphrase that doubles as the UI lock

Every Wallet file is encrypted at rest using zingolib's native wallet encryption (Argon2-derived key), enabled by passing `Some(EncryptionConfig::new(passphrase))` to `LightClient::new` on both create and read instead of the `None` used today. A single global passphrase, set during onboarding, encrypts all Wallets and is never stored, the Argon2 params and a verifier live in each wallet file's header. That same passphrase is the UI lock: on a daemon start where encrypted wallets exist, the daemon cannot open them until the GUI collects the passphrase and forwards it over the authenticated socket, so the app is "locked" precisely while the daemon lacks the session key. There is no separate lock mechanism.

Forgetting the passphrase has no data-preserving recovery: the files are Argon2-encrypted and the passphrase is never stored, so they cannot be decrypted. The unlock screen instead offers a destructive "Start over" that wipes the whole store and returns to onboarding, reusing the existing forget machinery, so a user who forgets is never bricked out of the app. Recovery is then re-importing the UFVK, which is acceptable because the wallet is watch-only and holds no spending authority. This is distinct from a passphrase reset (changing the passphrase while keeping the wallets), which requires the current passphrase and is post-v0.

## Considered Options

An app-level encryption layer wrapping zingolib's plaintext files was the assumed cost (the `paths.rs` comment deferred encryption as "a later milestone"), but the `stable-auz` fork already implements wallet encryption natively, so the layer is unnecessary. A UI lock without encryption was rejected as theater: with plaintext files on disk, gating the UI protects nothing. A data-preserving passphrase reset (change the passphrase without the current one) is impossible by construction and is not attempted. Changing it with the current passphrase known is deferred to post-v0.

## Consequences

The wallet file format becomes encrypted and the IPC protocol grows an `Unlock { passphrase }` request and a locked/unlocked state, both contradicting the current `paths.rs` comment, which must be updated. After any full restart the daemon cannot sync until the GUI supplies the passphrase, acceptable in v0 since there is no autostart. Idle auto-relock and change-passphrase are post-v0.
