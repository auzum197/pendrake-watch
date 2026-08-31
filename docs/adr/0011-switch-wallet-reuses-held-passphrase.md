# Switch Wallet reuses the held Passphrase, and the daemon enforces one global Passphrase

Switching to another Wallet must not return to the unlock screen. The Passphrase unlocks the app once, not each Wallet in turn, so a Switch that already has the Passphrase in daemon memory opens the target Wallet with it. `select_wallet` cold-unlocks the encrypted target file with the held `session_passphrase` (reusing the same path as a cold restart) and leaves the Session lock clear. It arms the Session lock only when no Passphrase is held, a case the switcher never reaches because switching is only possible while unlocked.

The decrypt happens eagerly, inside `select_wallet`, so the Wallet is open when the call returns. A lazy scheme that decrypts on the first read was rejected: it needs every read path to remember the held Passphrase, and a path that forgets re-arms the Session lock, which is the bug this ADR removes (AUZ, "re-asks for passphrase on switch").

The daemon now enforces the single global Passphrase that ADR-0003 assumed. Before, `import_ufvk` took a client-sent passphrase verbatim and overwrote the held one, so an added Wallet could end up encrypted with a different secret and the GUI was the only guard. When a session Passphrase is held, `import_ufvk` ignores any client-supplied passphrase and reuses the held one. This makes "the held Passphrase opens every Wallet" true by construction, so the Switch decrypt cannot fail under normal use.

## Considered Options

For the decrypt-failure fallback (a Wallet that predates this enforcement, or one imported through the old gap), routing to the unlock screen was rejected. Unlock overwrites the held Passphrase, so entering one Wallet's secret would then lock the others out, a cascading breakage. The Switch instead refuses, keeps the current Wallet active, and surfaces an error. A mismatched Passphrase is an invariant violation, not a supported per-Wallet-passphrase mode.

## Consequences

A Switch now carries the cost of a cold decrypt, a short wait the caller absorbs. The `CONTEXT.md` term **Switch Wallet** records the user-facing rule. Passphrase rotation and per-Wallet passphrases remain out of scope, consistent with ADR-0003.
