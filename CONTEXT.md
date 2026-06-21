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
The first full sync of a Wallet, from its UFVK's Birthday to the chain tip pinned at import, a fixed height rather than the moving tip. Transactions found during it are recorded silently. It ends with a single "scanned successfully" notification when that height is reached, after which the Wallet notifies on each newly detected transaction. A restart before that height resumes the Initial scan.
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
The single secret set during onboarding. It encrypts every Wallet file at rest and gates the UI: the app is locked until the daemon is given the passphrase for the session. The same one applies to every Wallet, validated against each Wallet file's header. In v0 it lives only in the daemon's memory for the session, so a restart returns to the unlock screen. A later option to remember it across restarts, trading away the unlock step, is post-v0.
_Avoid_: password, PIN

**Remove**:
The wipe of a single Wallet and its state. Not a v0 user action: v0 exposes only Replace (swap the Wallet, in Settings) and Start over (wipe after a lost Passphrase, on the unlock screen), both named for what the user ends with rather than for the deletion, and both sharing this wipe underneath. Remove surfaces as its own action with multi-key, where a Wallet list takes one Wallet out and the others remain.
_Avoid_: delete, forget

**Replace**:
The v0 path to a different Wallet. Importing a new UFVK removes the current Wallet and creates one in its place, behind a confirmation, so a synced Wallet is never wiped by accident. It is a single destructive action, not a switch: v0 holds one Wallet, so there is nothing to switch between. Once multi-key lands a new import becomes additive and Replace stops being how import behaves.
_Avoid_: switch, change, swap

**Start over**:
The destructive path out of a forgotten Passphrase, offered on the unlock screen. It deletes every Wallet and returns to onboarding, because encrypted Wallets cannot be recovered. Distinct from Remove, which takes one Wallet out with the Passphrase known.
_Avoid_: reset, wipe
