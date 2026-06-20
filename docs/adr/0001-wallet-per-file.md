# One zingolib file per Wallet, identified by fingerprint

A Wallet is one imported UFVK and all state derived from it, backed by its own zingolib wallet file. The background process owns a store of these files, one per Wallet, each keyed by the UFVK's fingerprint, and every IPC message refers to a Wallet by that fingerprint rather than a positional account index. v0 ships a single Wallet (importing a new UFVK Replaces the current one behind a confirmation), but no part of the on-disk layout, the wire protocol, or the analytics assumes single-Wallet, so multi-key support is additive.

## Considered Options

zingolib's native model is one wallet file holding several accounts, which shares a single sync loop and is lighter on resources. We rejected it because it overloads the word "wallet" between the user-facing unit and the on-disk file, makes Replace and removal surgery inside a live file, and forces per-Wallet isolation (seen-set, analytics, birthday) to be maintained by hand. One file per Wallet makes the term honest at every layer and gives each Wallet free isolation, at the cost of N concurrent sync loops, which is negligible for a watch-only wallet with a handful of keys.

## Amendment: v0 ships a txid-only deep link

The one interface that does not yet carry the fingerprint is the `pendrake://tx` notification link. v0 emits `pendrake://tx?txid=<txid>` with no Wallet coordinate, since a single Wallet resolves the txid unambiguously and the fingerprint would change nothing visible. When multi-key lands the link gains the fingerprint, and the notifications already issued with a bare txid degrade to a scan across every Wallet: open the transaction when exactly one Wallet holds that txid, ask which Wallet when several do. The deferral costs a later disambiguation step rather than an invalid link, so it stays additive in the spirit of the decision above.
