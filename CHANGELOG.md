# Pendrake Watch — Update log

**Date:** 2026-08-17  
**Focus:** Ironwood (NU6.3) support, local build hardening, onboarding indexer choice, Notes UI polish

---

## Summary

Brought Pendrake Watch through a full **Ironwood** path: dependency upgrade, daemon wire types, balance/notes/tx mapping, UFVK identity, and frontend pools/totals. Fixed local Ubuntu/Tauri build issues, optional **custom lightwalletd at onboarding**, and Notes badges/filters for the new pool.

---

## 1. Ironwood protocol & dependencies

- Pointed `zingolib` / `pepper-sync` at **`chore/add-ironwood`**
- Workspace pins for `zcash_protocol`, `zcash_primitives`, `zcash_client_backend`, related crates
- `[patch.crates-io]` for `lightwallet-protocol` (+ `rebuild-proto`) so compact-block / tree fields include Ironwood
- Resolved dual `zcash_primitives` / `HashSer` conflicts
- Confirmed local LWD (Zebra + lightwalletd) serves `ironwoodTree` / `ironwoodActions`

---

## 2. Daemon wire protocol (`pendrake-ipc`)

- `Pool::Ironwood`
- `Balance.ironwood: Option<PoolBalance>`

---

## 3. Core wallet service (`pendrake-core`)

- Import `IronwoodNote`
- **`map_balance`** — confirmed/total Ironwood
- **`collect_notes`** — `note_summaries::<IronwoodNote>` → `Pool::Ironwood`
- **`map_notes`** — received + outgoing Ironwood
- **`spent_value_by_tx` / `map_tx`** — Ironwood in net delta
- Sync progress: `SessionStarted`, `BatchScanStarted`, `RangeScanned`, `reconcile` count Ironwood outputs
- Tests helper `TransactionSummary` includes `ironwood_notes` / `outgoing_ironwood_notes`

---

## 4. UFVK identity (`ufvk.rs`)

- Orchard FVK also reports **Ironwood** (shared viewing key, no separate typecode)
- Tests assert Orchard + Ironwood + Sapling membership

---

## 5. Frontend — pools & totals

| File | Change |
|------|--------|
| `src/lib/ipc.ts` | `Pool` + `Balance.ironwood` |
| `src/lib/format.ts` | `totalConfirmed` includes Ironwood |
| `src/lib/pools.ts` | `POOLS` order includes Ironwood |
| `src/routes/pools.tsx` | Ironwood card in `POOL_META` |
| `src/lib/notes.ts` | Filter + `matchesFilter` for Ironwood |

Home total, Pools page, and note math all treat Ironwood as a first-class pool.

---

## 6. Notes UI polish

- **`notes.css`:** `.note-badge--ironwood` + `.pool-dot--ironwood` (light/dark)
- **`notes.tsx`:** Ironwood filter chip; Ironwood summary card; responsive 5-column summary grid
- Pool column uses badge styling instead of plain text for Ironwood

---

## 7. Onboarding — custom LWD after birthday

- Indexer step available on **mainnet** as well as regtest (after identity / birthdate)
- Import uses `draft.indexerUri.trim() || DEFAULT_INDEXER` (no mainnet hard-skip)
- Fixed broken ternary syntax in `onboarding.tsx`
- Fixed unused `network` param in `onboardingSteps` (`_network` / always include indexer)

---
