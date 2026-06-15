# One zingolib file per Wallet, identified by fingerprint

A Wallet is one imported UFVK and all state derived from it, backed by its own zingolib wallet file. The background process owns a store of these files, one per Wallet, each keyed by the UFVK's fingerprint, and every IPC message and `pendrake://` deep link refers to a Wallet by that fingerprint rather than a positional account index. v0 ships a single Wallet (importing a new UFVK Replaces the current one behind a confirmation), but no part of the on-disk layout, the wire protocol, or the analytics assumes single-Wallet, so multi-key support is additive.

## Considered Options

zingolib's native model is one wallet file holding several accounts, which shares a single sync loop and is lighter on resources. We rejected it because it overloads the word "wallet" between the user-facing unit and the on-disk file, makes Replace and removal surgery inside a live file, and forces per-Wallet isolation (seen-set, analytics, birthday) to be maintained by hand. One file per Wallet makes the term honest at every layer and gives each Wallet free isolation, at the cost of N concurrent sync loops, which is negligible for a watch-only wallet with a handful of keys.
