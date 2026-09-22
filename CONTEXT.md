# Pendrake Watch-only

A watch-only Zcash wallet that syncs in the background and posts a desktop notification when a new transaction is detected, while the window is closed.

## Language

**Wallet**:
One imported UFVK and all the state derived from it: addresses, balance, transactions, and analytics. The user-facing unit, backed by its own zingolib wallet file. A user holds one or more Wallets. Every Wallet syncs and notifies at all times, whether or not it is the Selected Wallet, and sync is never started by hand.
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
The first full sync of a Wallet, from its UFVK's Birthday to the chain tip pinned at import, a fixed height rather than the moving tip. Transactions found during it are recorded silently. It ends with a single "scanned successfully" notification when that height is reached, after which the Wallet notifies on each newly detected transaction. A restart before that height resumes the Initial scan. It starts on its own the moment a Wallet is imported, and Tip-follow takes over when it ends.
_Avoid_: backfill, catch-up, priming

**Tip-follow**:
The steady state after the Initial scan: a Wallet keeps pace with the chain tip round after round and notifies on each newly detected transaction. Every Wallet is in Tip-follow whenever the app runs, Selected or not, locked or not. It is never started by hand, and it recovers from an unreachable Indexer on its own, so the sync indicator shows state and offers no action.
_Avoid_: background sync, auto-sync, polling, manual sync

**Unavailable**:
The state of a Wallet whose file could not be opened at startup. It stays in the switcher with its LifeHash, last known balance and a red mark, while every other Wallet syncs as normal. Selecting it explains the failure and offers Remove.
_Avoid_: broken, corrupt, failed wallet

**Received / Sent**:
The direction of a transaction relative to the Wallet. The same two words are used everywhere, in the transaction list and in notification text ("Received 1.5 ZEC", "Sent 0.2 ZEC").
_Avoid_: incoming, outgoing, payment, transfer

**Confirmed / Pending**:
The status of a transaction. Confirmed means it has landed in a block, Pending means it is still in the mempool. The same two words are used in the transaction list and everywhere status is shown.
_Avoid_: completed, in progress, complete, unconfirmed

**Birthday**:
The block height a Wallet begins its initial scan from. Set at import as an exact height or derived from a date. When unspecified it defaults to Sapling activation, the floor that guarantees no shielded history is missed.
_Avoid_: start height, birth height

**Pool**:
One of the Zcash value pools a UFVK can view: Orchard, Sapling, or transparent. A Wallet syncs every pool its UFVK contains. Choosing a subset is post-v0.
_Avoid_: account

**Note**:
A shielded output (Orchard or Sapling) a Wallet can see. A transaction is made of notes and UTXOs. A transaction consumes input notes, nullifying them, and creates output notes, each encrypted to a recipient. A created note addressed to the Wallet is a Received note (including the change a Sent transaction returns), one addressed to someone else is a Sent note. A note's destination relative to the Wallet is a separate axis from a transaction's own Received / Sent direction, so a Sent transaction holds notes of both destinations. Within a transaction a note is identified by its Pool and its output index, the only handle it has. Only shielded notes carry a Memo.
_Avoid_: output, coin

**UTXO**:
A transparent coin a Wallet can see, the transparent counterpart of a Note. It has a value and a direction, Received or Sent, but carries no Memo, since the transparent Pool has no memo field.
_Avoid_: transparent note, coin, output

**Memo**:
The optional text carried by a shielded Note. UTXOs carry none, and one transaction can hold several memos, one per note. The transaction list shows an indicator when any note in a transaction carries a memo, and the transaction detail shows the full text grouped by Received and Sent note.
_Avoid_: message, comment

**Indexer**:
The lightwalletd or zebra instance a Wallet connects to for chain data. Each Wallet has one, chosen during onboarding and changeable later from Settings. Mainnet offers a curated region list, opening on an auto-routed default, with a custom URL alongside it; regtest has no public default, so the user must supply one. An unreachable Indexer is reported once per outage, however many Wallets use it.
_Avoid_: server, endpoint, node

**Anchor**:
The block hash recorded at import, at the lower of the Birthday and the chain tip. It is the Wallet's proof of which chain incarnation it synced, verified against the Indexer before every sync round and before any Indexer change. A mismatch refuses to sync and surfaces as a Wrong chain state rather than grinding against a chain the Wallet never saw. A Wallet imported before Anchors existed adopts one after its next successful round.
_Avoid_: checkpoint, pin, genesis hash

**Passphrase**:
The single secret set during onboarding. It encrypts every Wallet file at rest, and re-entering it is what clears the Session lock. The same one applies to every Wallet, validated against each Wallet file's header. In v0 it lives only in the daemon's memory for the session, so a full restart returns to the unlock screen. A later option to remember it across restarts, trading away the unlock step, is post-v0.
_Avoid_: password, PIN

**Session lock**:
The gate that holds the app on the unlock screen until the Passphrase is re-entered. It is a separate thing from whether Wallets are syncing: every Wallet keeps syncing and notifying while locked, so a Sign Out or a closed window still catches new transactions. It arms at startup, on Sign Out, and when the app's window goes away, and is cleared only by entering the Passphrase.
_Avoid_: logout, timeout, screen lock

**Sign Out**:
Arming the Session lock by hand, from the sidebar. It returns to the unlock screen while every Wallet keeps syncing in the background, so re-entry needs the Passphrase but nothing is wiped. Distinct from Start over, which deletes, and from Replace, which swaps the Wallet.
_Avoid_: log out, lock

**Switch Wallet**:
Selecting another Wallet from the switcher. It changes the Selected Wallet without touching the Session lock and without starting or stopping any sync: every Wallet is already open under the one held Passphrase, so no unlock screen appears and nothing is loaded or dropped. One Passphrase unlocks the whole app, not each Wallet in turn. Distinct from Replace, which imports and wipes, and from Sign Out, which arms the lock.
_Avoid_: change wallet, log in again, re-unlock

**Selected Wallet**:
The one Wallet the screen shows. Its balance, transactions, analytics, and Settings fill the window, and the sidebar card and notification deep links name it. Selection is only about what is on screen: every other Wallet keeps syncing and notifying behind it, and a Received notification from another Wallet carries that Wallet's label. Changed by Switch Wallet.
_Avoid_: active wallet, current wallet, open wallet, focused wallet

**Remove**:
The wipe of a single Wallet and its state, from Settings, behind a confirmation. The other Wallets remain and keep syncing. When the removed one was the Selected Wallet, the most recently used other Wallet becomes Selected. When none remain, the app returns to onboarding. Import is additive, so Remove and Add wallet are the two list operations, and there is no swap.
_Avoid_: delete, forget, replace

**Replace**:
Retired. The v0 path to a different Wallet, when the app held only one: importing a new UFVK removed the current Wallet and created one in its place. With several Wallets a new import is additive, so Replace is now Remove followed by Add wallet.
_Avoid_: switch, change, swap

**Start over**:
The destructive path out of a forgotten Passphrase, offered on the unlock screen. It deletes every Wallet and returns to onboarding, because encrypted Wallets cannot be recovered and one Passphrase guards them all. Distinct from Remove, which takes one Wallet out with the Passphrase known.
_Avoid_: reset, wipe

**Span**:
The selectable time window of the balance chart: ALL, 1 year, 1 month, or 1 week. A Span is always anchored at today and reaches back, so the balance carries flat to the present edge whether or not a recent transaction exists. ALL runs from the first transaction to today. Distinct from the block ranges pepper-sync scans, which is why it is not called a range.
_Avoid_: range, window, period, timeframe

**Fiat value**:
A Wallet's balance expressed in a fiat currency (USD in v0), its balance marked against the ZEC price. The spot Fiat value uses the current price. Over a Span it is marked daily against historical prices, so it moves with the market even while the balance holds still. Always additive to the ZEC figure, never a replacement: a Wallet's balance is denominated in ZEC first, and the ZEC view always renders even when no price is available. Off until the user consents to the price egress, since it reaches third parties beyond the Indexer (docs/adr/0008).
_Avoid_: fiat-equivalent, worth, valuation, USD value (as the concept name)

**Price source**:
One of the third-party services the daemon fetches the ZEC price from (CoinGecko, Coinbase, Kraken), plus a bundled CSV for the deep historical tail. Several are queried and their values reconciled into the single figure shown, so no one feed is trusted alone. Some periods only one source covers, which is where a mark is single-source (docs/adr/0008).
_Avoid_: price feed, provider (as the concept name), oracle

**Confidence**:
How much a Fiat value can be trusted. High when several Price sources agreed on the mark, low when it came from a single source, such as the bundled historical tail. Separate from divergence, which flags marks whose sources disagreed beyond a threshold.
_Avoid_: accuracy, quality, trust score

**Discreet mode**:
The toggle that obscures sensitive data from onlookers: amounts (ZEC and Fiat value), transaction dates, transaction block heights, txids and explorer links (a txid resolves to everything else on a block explorer), Memo text, and addresses. Direction, status, sync progress, the ATH standing, and the balance chart's curve remain visible. It applies everywhere the data appears, including desktop notifications, which drop amount and direction while it is on. It is app-wide, not per-wallet: the choice belongs to whoever is at the screen, so it holds across wallet switches and persists across restarts. A shield against shoulder surfing and screen shares rather than a cryptographic protection, and unrelated to the Session lock.
_Avoid_: privacy mode, hidden balances, incognito

**Peek**:
A per-value feature while Discreet mode is on: holding a hidden value reveals just that value for as long as it is held, then it hides again on release. Discreet mode itself stays on. Every hidden value supports it except those in the wallet switcher. While a value is hidden, copying that value is disabled; the bulk CSV export is the one exception. Peek is a pointer gesture, with no keyboard path and no setting.
_Avoid_: reveal mode, unhide, show temporarily, global peek
