# Pendrake Watch-only

A watch-only Zcash wallet that syncs in the background and posts a desktop notification when a new transaction is detected, while the window is closed.

## Language

**Wallet**:
One imported UFVK and all the state derived from it: addresses, balance, transactions, and analytics. The user-facing unit, backed by its own zingolib wallet file. A user holds one Wallet in v0 and several once multi-key lands.
_Avoid_: account, key, viewing key (as a name for the unit)

**UFVK**:
The Unified Full Viewing Key a user pastes to create a Wallet. The only key material Pendrake accepts, since it holds no spending keys.
_Avoid_: viewing key, UIVK

**Fingerprint**:
The stable unique identifier derived from a UFVK. It names the Wallet's file, seeds its LifeHash, and is the value every deep link and IPC message uses to refer to a Wallet.
_Avoid_: id, account index

**LifeHash**:
The deterministic icon rendered from a Wallet's fingerprint, giving each Wallet a recognizable visual identity in the UI.

**Network**:
The Zcash chain a Wallet is bound to, either mainnet or regtest. It is encoded in the UFVK and fixed for the Wallet's life. A UFVK from one network cannot be loaded against another.
_Avoid_: chain, env

**Initial scan**:
The first full sync of a Wallet, from its UFVK's birthday to the chain tip. Transactions found during it are recorded silently. It ends with a single "scanned successfully" notification, after which the Wallet notifies on each newly detected transaction.
_Avoid_: backfill, catch-up, priming

**Received / Sent**:
The direction of a transaction relative to the Wallet. The same two words are used everywhere, in the transaction list and in notification text ("Received 1.5 ZEC", "Sent 0.2 ZEC").
_Avoid_: incoming, outgoing, payment, transfer

**Birthday**:
The block height a Wallet begins its initial scan from. Set at import as an exact height or derived from a date. When unspecified it defaults to Sapling activation, the floor that guarantees no shielded history is missed.
_Avoid_: start height, birth height

**Pool**:
One of the Zcash value pools a UFVK can view: Orchard, Sapling, or transparent. A Wallet syncs every pool its UFVK contains. Choosing a subset is post-v0.
_Avoid_: account

**Indexer**:
The lightwalletd or zebra instance a Wallet connects to for chain data. Each Wallet has one. Mainnet uses a default the user can change later; regtest requires the user to supply it during onboarding.
_Avoid_: server, endpoint, node

**Passphrase**:
The single secret set during onboarding. It encrypts every Wallet file at rest and gates the UI: the app is locked until the daemon is given the passphrase for the session. It is never stored, only validated against each Wallet file's header, and the same one applies to every Wallet.
_Avoid_: password, PIN

**Forget**:
Deliberately removing a single Wallet while the app is unlocked and the Passphrase is known. Only that Wallet's files are deleted; the others remain.
_Avoid_: delete, remove

**Start over**:
The destructive path out of a forgotten Passphrase, offered on the unlock screen. It deletes every Wallet and returns to onboarding, because encrypted Wallets cannot be recovered. Distinct from Forget, which removes one Wallet with the Passphrase known.
_Avoid_: reset, wipe
