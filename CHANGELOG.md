# Pendrake Watch — Update log

## 2026-09-02: the wallet switcher unfolds

The sidebar card unfolds the other Wallets over the nav, most recently used first, and ⌘K opens the same list as a searchable palette.

---

## 2026-09-02: every Wallet open and in Tip-follow

The daemon opens every Wallet on disk and syncs each one on its own.

- Switching only changes which Wallet is shown.
- Events, sync status and notification deep links carry the Wallet's id.
- The notification body names the Wallet.
- An unreachable Indexer notifies once per Indexer per outage.
- A Wallet whose file will not open loads as Unavailable.
- Replace is retired in favour of Remove and Add wallet.
- Start over wipes every Wallet.
- `active` became `selected` on the wire, `removeWallet` takes an id and `startOver` is a separate method.

---

**Date:** 2026-08-17  
**Focus:** Ironwood (NU6.3) support, multi-wallet accounts, manual sync, local build hardening, onboarding indexer choice, Notes UI polish

---

## Branches

| Repo | Branch | Role |
|------|--------|------|
| **pendrake-watch** | `feat/multi-wallet` | This work: multi-wallet UI/daemon, manual sync, soft refresh, this changelog |
| **pendrake-watch** | `main` | Stable line; Ironwood UI/daemon mapping may land or already live separately |
| **zingolib** (e.g. `auzum197/zingolib`) | `chore/add-ironwood` | Ironwood protocol: `IronwoodNote`, tree/actions fields, pepper-sync scan |
| **zingolib** (earlier pin) | e.g. `stable-auz` | Pre-Ironwood; replaced for NU6.3 support |

**Do not confuse:** `chore/add-ironwood` is a **library** branch. Multi-wallet lives on **pendrake-watch** `feat/multi-wallet` and only *depends on* the Ironwood zingolib branch via `Cargo.toml` git deps (`zingolib` / `pepper-sync`).

---

## Summary

Brought Pendrake Watch through a full **Ironwood** path: dependency upgrade onto `chore/add-ironwood`, daemon wire types, balance/notes/tx mapping, UFVK identity, and frontend pools/totals. Fixed local Ubuntu/Tauri build issues, optional **custom lightwalletd at onboarding**, and Notes badges/filters for the new pool.

On **`feat/multi-wallet`**, added **multi-wallet** support: each UFVK under `wallets/<id>/`, sidebar switch / add / remove, on-demand tip-follow sync, soft refresh after switch, and correct idle vs syncing UI.

---

## 1. Ironwood protocol & dependencies

- Pointed `zingolib` / `pepper-sync` at **`chore/add-ironwood`** (not `stable-auz`)
- Workspace pins for `zcash_protocol`, `zcash_primitives`, `zcash_client_backend`, related crates
- `[patch.crates-io]` for `lightwallet-protocol` (+ `rebuild-proto`) so compact-block / tree fields include Ironwood
- Resolved dual `zcash_primitives` / `HashSer` conflicts
- Confirmed local LWD (Zebra + lightwalletd) serves `ironwoodTree` / `ironwoodActions`

---

## 2. Daemon wire protocol (`pendrake-ipc`)

- `Pool::Ironwood`
- `Balance.ironwood: Option<PoolBalance>`
- Multi-wallet types: `WalletSummary`, `SelectWalletArgs`, `SyncWalletArgs`
- `WalletState.wallet_id` for the active account under `wallets/<id>/`
- `SyncStatus.last_synced_at` (optional)

---

## 3. Core wallet service (`pendrake-core`)

### Ironwood
- Import `IronwoodNote`
- **`map_balance`** — confirmed/total Ironwood
- **`collect_notes`** — `note_summaries::<IronwoodNote>` → `Pool::Ironwood`
- **`map_notes`** — received + outgoing Ironwood
- **`spent_value_by_tx` / `map_tx`** — Ironwood in net delta
- Sync progress: `SessionStarted`, `BatchScanStarted`, `RangeScanned`, `reconcile` count Ironwood outputs
- Tests helper `TransactionSummary` includes `ironwood_notes` / `outgoing_ironwood_notes`

### Multi-wallet (`feat/multi-wallet`)
- **`paths.rs`:** `wallets/<id>/`, `active_wallet_id`, `for_wallet()`, legacy migration, `list_wallet_ids()`
- **`listWallets` / `selectWallet` / `syncWallet`** IPC methods
- Import writes a new dir without wiping other accounts
- Remove deletes **active** wallet only; GUI selects the next or returns to onboarding
- **No auto-sync** on load/import/unlock — tip-follow only via `syncWallet`
- `wallet_state()` exposes `wallet_id`

---

## 4. UFVK identity (`ufvk.rs`)

- Orchard FVK also reports **Ironwood** (shared viewing key, no separate typecode)
- Tests assert Orchard + Ironwood + Sapling membership

---

## 5. Frontend — pools & totals

| File | Change |
|------|--------|
| `src/lib/ipc.ts` | `Pool` + `Balance.ironwood`; multi-wallet helpers |
| `src/lib/format.ts` | `totalConfirmed` includes Ironwood; idle ≠ synced; `syncLabel` |
| `src/lib/pools.ts` | `POOLS` order includes Ironwood |
| `src/routes/pools.tsx` | Ironwood card in `POOL_META` |
| `src/lib/notes.ts` | Filter + `matchesFilter` for Ironwood |

Home total, Pools page, and note math all treat Ironwood as a first-class pool.

---

## 6. Notes UI polish

- **`notes.css`:** `.note-badge--ironwood` + `.pool-dot--ironwood` (darker orange/red mix)
- **`notes.tsx`:** Ironwood filter chip; Ironwood summary card; responsive 5-column summary grid
- Pool column uses badge styling instead of plain text for Ironwood

---

## 7. Onboarding — custom LWD after birthday

- Indexer step available on **mainnet** as well as regtest (after identity / birthdate)
- Import uses `draft.indexerUri.trim() || DEFAULT_INDEXER` (no mainnet hard-skip)
- Fixed broken ternary syntax in `onboarding.tsx`
- Fixed unused `network` param in `onboardingSteps` (`_network` / always include indexer)

---

## 8. Multi-wallet UI (`feat/multi-wallet`)

| File | Change |
|------|--------|
| `src-tauri/src/lib.rs` | `list_wallets`, `select_wallet`, `sync_wallet` commands |
| `src/lib/ipc.ts` | `listWallets`, `selectWallet`, `syncWallet`, `WalletSummary`, `walletId` |
| `src/components/app/app-shell.tsx` | Wallet card switcher; **Add wallet…** / **Remove**; full-width menu; soft refresh; AlertDialog confirm |
| `src/routes/onboarding.tsx` | `mode=add` — import without wipe; Cancel → dashboard |
| `src/router.tsx` | `validateSearch` for `mode=add` |
| `src/routes/app-layout.tsx` | No-wallet / locked guards; no flash while redirecting |
| `src/hooks/use-wallet-data.ts` | `reloadWalletData()`, clear snapshot cache on switch |

**Behavior**
- Each account: data dir `wallets/<fingerprint>/` (+ `active_wallet_id`)
- Switch updates active id and reloads data **without** full page reload
- Add opens onboarding with existing wallets preserved
- Remove only the active account (confirm dialog)

---

## 9. Manual sync UX

| File | Change |
|------|--------|
| `src/components/app/sync-status.tsx` | Clickable **Sync** / **Retry sync** → `syncWallet()` |
| `src/lib/format.ts` | Idle with no tip ≠ synced; `syncLabel` → “Not synced” not “Syncing… 0%” |
| `src/routes/dashboard.tsx` | Hero pill / chart spinner only while a round is in flight |

Inactive or never-synced wallets stay **Not synced** until the user starts tip-follow.

