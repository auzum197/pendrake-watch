import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

// Mirrors the daemon's pendrake-ipc wire types, camelCase across the boundary.
export type Network = "mainnet" | "regtest";
export type ImportType = "ufvk" | "seed";
export type ViewMode = "full" | "incoming-only";

export type WalletState = {
  exists: boolean;
  locked: boolean;
  // The daemon holds the session passphrase in memory. After a Replace-wipe this
  // stays true, so onboarding skips Set Password (docs/adr/0004).
  sessionHeld: boolean;
  // Active wallet id under wallets/<id>/. Absent/null when none.
  walletId?: string | null;
  // Optional user-facing name. Null/absent falls back to short fingerprint in the UI.
  // Masked when Discreet mode is on.
  label?: string | null;
  // The current Wallet's fingerprint, seeding its LifeHash. Null when no wallet
  // exists or it predates fingerprint persistence.
  fingerprint: string | null;
  importType: ImportType;
  viewMode: ViewMode;
  network: Network;
  birthdayHeight: number;
  // The Indexer this Wallet syncs against, editable from Settings. Empty when no
  // wallet exists.
  indexerUri: string;
  // Whether transaction and scan-complete notifications fire. The "Indexer
  // unreachable" alert is independent of this.
  notificationsEnabled: boolean;
  // Whether fiat (USD) price display is on. Off until the user consents to the price
  // egress via the toggle's modal (docs/adr/0008). Absent reads as false.
  fiatEnabled?: boolean;
  // Whether Discreet mode is on (docs/adr/0009). The UI masks sensitive values and
  // the daemon redacts notification text. Absent reads as false.
  discreet?: boolean;
};

export type WalletAddress = {
  ua: string;
  transparent?: string;
};

// The user's raw Birthday choice. The daemon's resolver turns it into a starting
// height (mirrors pendrake-ipc BirthdayInput), so the GUI never pre-resolves. A
// date is unix seconds for midnight UTC of the picked day, mainnet only.
export type BirthdayInput =
  | { kind: "height"; value: number }
  | { kind: "date"; value: number }
  | { kind: "default" };

export type ImportUfvkInput = {
  ufvk: string;
  birthday: BirthdayInput;
  indexerUri: string;
  network: Network;
  // Omitted on a post-Replace import: the daemon reuses the held session passphrase.
  passphrase?: string;
};

// A UFVK declares its own network. Testnet is rejected, so a decoded key is one
// of these two (mirrors the daemon's pendrake-ipc UfvkNetwork).
export type UfvkNetwork = "mainnet" | "regtest";

export type Pool = "orchard" | "sapling" | "transparent" | "ironwood";

export type UfvkIdentity = {
  network: UfvkNetwork;
  fingerprint: string;
  pools: Pool[];
};

// The decode verdict, tagged by `kind`. A testnet or malformed key is a result
// the Identity screen renders inline, not a thrown daemon error.
export type ParseUfvkResult =
  | ({ kind: "valid" } & UfvkIdentity)
  | { kind: "testnet" }
  | { kind: "malformed"; reason: string };

export type SyncState = "idle" | "syncing" | "error";
export type SyncPhase = "scanning" | "committing";

export type SyncStatus = {
  state: SyncState;
  syncedHeight: number;
  chainTip: number;
  percent: number;
  phase?: SyncPhase;
  scannedOutputs?: number;
  totalOutputs?: number;
  etaSeconds?: number;
  error?: string;
  // Set only when the sync error was the Indexer being unreachable, gating the
  // "Change server" CTA. Absent reads as false.
  unreachable?: boolean;
  // Set only when the Indexer is serving a chain without this Wallet's Anchor
  // (ADR-0010). The daemon keeps it mutually exclusive with `unreachable`.
  wrongChain?: boolean;
  lastSyncedAt?: number;
};

export type PoolBalance = {
  confirmed: string;
  total: string;
};

export type Balance = {
  orchard?: PoolBalance;
  sapling?: PoolBalance;
  transparent?: PoolBalance;
  ironwood?: PoolBalance;
};

export type TxKind = "received" | "sent";
export type TxStatus = "confirmed" | "pending";
export type NoteDirection = "received" | "sent";

// One output within a transaction: a shielded Note or a transparent UTXO (`pool`
// says which). There's no per-note id, so a note is identified by its pool and
// outputIndex. Only shielded notes carry a memo; only Sent outputs carry a
// recipient. Empty memos are stripped daemon-side, so a present `memo` is real.
export type Note = {
  pool: Pool;
  direction: NoteDirection;
  outputIndex: number;
  valueZat: string;
  memo?: string;
  recipient?: string;
};

export type Tx = {
  txid: string;
  datetime: number;
  blockHeight?: number;
  kind: TxKind;
  valueZat: string;
  // Signed net balance change in zatoshis (received +, sent/shield/self −). The
  // chart reconstructs against this; valueZat stays the display amount. Optional so
  // a daemon predating the field doesn't break the client (the chart falls back).
  netZat?: string;
  status: TxStatus;
  notes: Note[];
};

// Multi-wallet registry entry (Phase 1).
export type WalletSummary = {
  id: string;
  // Resolved display name: custom label, or short fingerprint when unset.
  label: string;
  fingerprint: string | null;
  network: Network;
  birthdayHeight: number;
  active: boolean;
};

// The public mainnet default: zec.rocks auto-routes to a nearby region.
export const DEFAULT_INDEXER = "https://zec.rocks:443";

// Curated mainnet Indexers shown in Settings. The default is auto-routed; the rest
// pin a region. Regtest has no public default, so it only ever uses a custom one.
export const MAINNET_INDEXERS: { label: string; uri: string }[] = [
  { label: "Default (auto-routed)", uri: DEFAULT_INDEXER },
  { label: "North America", uri: "https://na.zec.rocks:443" },
  { label: "Europe", uri: "https://eu.zec.rocks:443" },
  { label: "South America", uri: "https://sa.zec.rocks:443" },
  { label: "Middle East", uri: "https://me.zec.rocks:443" },
];

export function importUfvk(input: ImportUfvkInput): Promise<WalletState> {
  return invoke("import_ufvk", {
    ufvk: input.ufvk,
    birthday: input.birthday,
    indexerUri: input.indexerUri,
    network: input.network,
    // Pass undefined through so the daemon falls back to the held passphrase.
    passphrase: input.passphrase,
  });
}

// Decode a pasted UFVK into its identity (network, pools, fingerprint) without
// importing it. Drives the Identity screen as the user types.
export function parseUfvk(ufvk: string): Promise<ParseUfvkResult> {
  return invoke("parse_ufvk", { ufvk });
}

// Open an encrypted wallet on this run. Rejects when the passphrase is wrong.
export function unlock(passphrase: string): Promise<WalletState> {
  return invoke("unlock", { passphrase });
}

// Lock the GUI session. The daemon keeps the wallet open and syncing; re-entry needs
// the passphrase. Sign Out calls this.
export function lock(): Promise<void> {
  return invoke("lock");
}

// Point the Wallet at a different Indexer. The daemon connects to the new server
// before persisting, so this rejects when the server is unreachable or the URL is
// malformed, leaving the current Indexer in place.
export function setIndexer(indexerUri: string): Promise<WalletState> {
  return invoke("set_indexer", { indexerUri });
}

// Toggle transaction and scan-complete notifications. The daemon persists the
// choice and returns the updated state.
export function setNotifications(enabled: boolean): Promise<WalletState> {
  return invoke("set_notifications", { enabled });
}

// Re-authenticate against the held session passphrase without touching the wallet.
// Gates the Replace wipe; true only when the passphrase matches.
export function verifyPassphrase(passphrase: string): Promise<boolean> {
  return invoke("verify_passphrase", { passphrase });
}

export function getWalletState(): Promise<WalletState> {
  return invoke("get_wallet_state");
}

export function getAddresses(): Promise<WalletAddress[]> {
  return invoke("get_addresses");
}

export function getSyncStatus(): Promise<SyncStatus> {
  return invoke("get_sync_status");
}

export function getBalance(): Promise<Balance> {
  return invoke("get_balance");
}

export function getTransactions(): Promise<Tx[]> {
  return invoke("get_transactions");
}

export function getTransaction(txid: string): Promise<Tx | null> {
  return invoke("get_transaction", { txid });
}

export type NoteStatus = "unspent" | "spent" | "pending";

// One received output the wallet controls, flattened across pools, for the notes
// debug view. Distinct from `Note` (an output inside one transaction's detail):
// this is a wallet-wide row with its spend state resolved. `height` is null while
// the note's transaction is unconfirmed, and `spentHeight` is null unless the spend
// has confirmed. `idx` is a stable row number the daemon assigns over the returned
// order, the default table sort. Values are zatoshi strings.
export type WalletNote = {
  idx: number;
  pool: Pool;
  valueZat: string;
  status: NoteStatus;
  height: number | null;
  txid: string;
  change: boolean;
  spentHeight: number | null;
};

// Every note the wallet can see, with spend status, for the notes debug view.
export function getNotes(): Promise<WalletNote[]> {
  return invoke("get_notes");
}

// How much a reconciled price can be trusted. "high" means two or more providers
// agreed; "low" means a single source (e.g. the bundled pre-2020 tail).
export type Confidence = "high" | "low";

// The current reconciled ZEC/USD spot. `fetchedAt` (unix seconds) drives the staleness
// marker; `stale` is set when the daemon is serving a last-known value after a failed
// refresh. `diverged` flags when the contributing sources disagreed.
export type PriceSpot = {
  usdPerZec: number;
  fetchedAt: number;
  sources: string[];
  stale?: boolean;
  diverged?: boolean;
};

// One reconciled daily price mark, keyed by UTC date (YYYY-MM-DD). The chart marks the
// balance held on each day against this to trace the fiat curve.
export type PricePoint = {
  date: string;
  usdPerZec: number;
  confidence: Confidence;
  diverged?: boolean;
};

// Record consent to the price egress and start (or stop) the daemon's price refresh.
export function setFiatEnabled(enabled: boolean): Promise<WalletState> {
  return invoke("set_fiat_enabled", { enabled });
}

// Persist Discreet mode in the daemon, which redacts notification text while it is
// on (docs/adr/0009). Masking in the UI keys off the store in lib/discreet.ts.
export function setDiscreet(enabled: boolean): Promise<WalletState> {
  return invoke("set_discreet", { enabled });
}

// The current reconciled spot, or null before the first fetch lands.
export function getSpotPrice(): Promise<PriceSpot | null> {
  return invoke("get_spot_price");
}

// The full reconciled daily series, oldest first.
export function getPriceHistory(): Promise<PricePoint[]> {
  return invoke("get_price_history");
}

// Wipe the current Wallet. Replace passes keepSession so the daemon retains the
// session passphrase across the wipe (docs/adr/0004); Start over leaves it false.
export function removeWallet(keepSession = false): Promise<void> {
  return invoke("remove_wallet", { keepSession });
}

// Multi-wallet registry (Phase 1).
export function listWallets(): Promise<WalletSummary[]> {
  return invoke("list_wallets");
}

export function selectWallet(id: string): Promise<WalletState> {
  return invoke("select_wallet", { id });
}

// Start tip-follow sync for the active wallet (or optional id).
export function syncWallet(id?: string): Promise<SyncStatus> {
  return invoke("sync_wallet", id ? { id } : {});
}

// Set or clear a user-facing wallet name. Empty string clears (short fingerprint).
export function setWalletLabel(id: string, label: string): Promise<WalletState> {
  return invoke("set_wallet_label", { id, label });
}

export type BatchPhase = "scanning" | "waiting" | "committing";

// One in-flight scan range. Animate the active bar from `phaseStartedAtMs`
// against `expectedSecs`; both clocks share the local machine with the daemon.
export type BatchProgress = {
  id: string;
  start: number;
  end: number;
  priority: string;
  outputs: number;
  phase: BatchPhase;
  phaseStartedAtMs: number;
  expectedSecs?: number;
};

export type CommitBreakdown = {
  checkpoints: number;
  frontiers: number;
  insertTree: number;
  spendFetch: number;
  spendCpu: number;
  cleanup: number;
  other: number;
};

export type BatchTiming = {
  totalSecs: number;
  waitSecs: number;
  fetchSecs: number;
  decryptionSecs: number;
  treeSecs: number;
  commitSecs: number;
  commit: CommitBreakdown;
};

export type BatchSummary = {
  id: string;
  start: number;
  end: number;
  priority: string;
  outputs: number;
  timing: BatchTiming;
};

// Pushed from the daemon through the Tauri bridge as the wallet scans. Tagged by
// `event`, mirroring the pendrake-ipc `SyncEvent` enum.
export type SyncEvent =
  | { event: "progress"; status: SyncStatus; batches: BatchProgress[] }
  | { event: "batchDone"; batch: BatchSummary }
  | { event: "finished"; status: SyncStatus }
  | {
      event: "transaction";
      txid: string;
      kind: TxKind;
      valueZat: string;
      received: boolean;
    }
  | {
      event: "error";
      message: string;
      unreachable?: boolean;
      wrongChain?: boolean;
    }
  | { event: "priceUpdate"; spot: PriceSpot };

export function onSyncEvent(
  handler: (event: SyncEvent) => void,
): Promise<UnlistenFn> {
  return listen<SyncEvent>("sync-event", (e) => handler(e.payload));
}