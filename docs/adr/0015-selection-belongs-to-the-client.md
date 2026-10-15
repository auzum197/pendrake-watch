# The Selected Wallet belongs to the client, and every wallet read names its Wallet

The daemon used to keep the Selected Wallet as a file in its data dir
(`active_wallet_id`). `selectWallet` moved it, `listWallets` flagged it, and the wallet
reads (`getBalance`, `getTransactions`, `getTransaction`, `getNotes`, `getAddresses`,
`getSyncStatus`, `getWalletState`) and the per-Wallet settings (`setIndexer`,
`setFiatEnabled`, `setNotifications`) all addressed it implicitly. Remove picked a
successor on the GUI's behalf.

That was a leak once the daemon gained a second kind of client (docs/adr/0014). Two
frontends shared one selection: a `selectWallet` from a script changed what the GUI's
next read returned. The daemon itself never used the pointer for its own work, since
sync loops, notifications, the Anchor check and the price loop are all per Wallet or
global. Selection is what one screen shows, and the daemon has no screen.

## What changed

Every wallet-scoped method takes `id`, the Wallet's Fingerprint, the same handle the
deep links and `SyncEvent` already carry. `selectWallet` and the `selected` flag on
`listWallets` are gone, and so is the file. `removeWallet` removes and returns nothing;
which Wallet to show next is the client's call. `getWalletState` keeps an optional id:
with one it describes that Wallet, without one it answers the session-level questions a
client asks before it has an id (does any Wallet exist, is this session locked, is the
Passphrase held). `unlock` and `setDiscreet` return that session-level state, since
neither is about one Wallet. `importUfvk` returns the new Wallet's state so the client
can select it.

The GUI stores its selection in local storage (`src/lib/selection.ts`) and reconciles it
against `listWallets` on every load: a stored id the daemon no longer has falls back to
the first Wallet, so a Wallet removed by another client stops being asked for. The
`selected` flag the components read is stamped onto the list by the GUI's own IPC
wrapper. Switch Wallet is now a local write plus one `getWalletState(id)`. A stale
`active_wallet_id` left by an older daemon is deleted at startup.

Discreet mode stays daemon-side and app-wide (docs/adr/0009), because notifications
honour it. It is the one piece of display state the daemon keeps, and every client
inherits it.

## Consequences

Two clients can show two different Wallets at once, and neither can move the other's
view. A client that connects fresh has to run `listWallets` before it can read
anything, which is one extra round trip on startup. There is no "current wallet"
shortcut in the API, by design.
