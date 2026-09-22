import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

// The wire types are generated from the daemon's pendrake-ipc crate by
// `just bindings`, so the two sides cannot drift. They are re-exported here as
// aliases (a plain re-export would survive into the Storybook module mock);
// nothing imports from generated/ directly.
import type * as Wire from "./generated/wire";

export type Balance = Wire.Balance;
export type BatchPhase = Wire.BatchPhase;
export type BatchProgress = Wire.BatchProgress;
export type BatchSummary = Wire.BatchSummary;
export type BatchTiming = Wire.BatchTiming;
export type BirthdayInput = Wire.BirthdayInput;
export type CommitBreakdown = Wire.CommitBreakdown;
export type Confidence = Wire.Confidence;
export type ImportType = Wire.ImportType;
export type Network = Wire.Network;
export type Note = Wire.Note;
export type NoteDirection = Wire.NoteDirection;
export type NoteStatus = Wire.NoteStatus;
export type ParseUfvkResult = Wire.ParseUfvkResult;
export type Pool = Wire.Pool;
export type PoolBalance = Wire.PoolBalance;
export type PricePoint = Wire.PricePoint;
export type PriceSpot = Wire.PriceSpot;
export type SyncEvent = Wire.SyncEvent;
export type SyncPhase = Wire.SyncPhase;
export type SyncState = Wire.SyncState;
export type SyncStatus = Wire.SyncStatus;
export type Tx = Wire.Tx;
export type TxKind = Wire.TxKind;
export type TxStatus = Wire.TxStatus;
export type UfvkIdentity = Wire.UfvkIdentity;
export type UfvkNetwork = Wire.UfvkNetwork;
export type ViewMode = Wire.ViewMode;
export type WalletAddress = Wire.WalletAddress;
export type WalletNote = Wire.WalletNote;
export type WalletState = Wire.WalletState;
export type WalletSummary = Wire.WalletSummary;
export type ImportUfvkInput = Wire.ImportUfvkArgs;

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

export function lock(): Promise<void> {
  return invoke("lock");
}

export function setIndexer(indexerUri: string): Promise<WalletState> {
  return invoke("set_indexer", { indexerUri });
}

// Toggle transaction and scan-complete notifications for one Wallet (the Selected
// Wallet when `id` is omitted). The daemon persists the choice and returns the
// Selected Wallet's state.
export function setNotifications(
  enabled: boolean,
  id?: string,
): Promise<WalletState> {
  return invoke("set_notifications", { enabled, id });
}

// The UFVK a Wallet was imported from, released only against the session
// passphrase. Rejects when the passphrase is wrong or no session is held. The
// caller shows it briefly and never stores it.
export function exportUfvk(id: string, passphrase: string): Promise<string> {
  return invoke("export_ufvk", { id, passphrase });
}

// Re-authenticate against the held session passphrase without touching the wallet.
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

// Every note the wallet can see, with spend status, for the notes debug view.
export function getNotes(): Promise<WalletNote[]> {
  return invoke("get_notes");
}

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

export function removeWallet(
  id: string,
  select?: string,
): Promise<WalletState> {
  return invoke("remove_wallet", { id, select });
}

// Drop one Wallet's scanned history and scan again from its Birthday. Resolves
// once the daemon has queued the rescan; progress arrives on the sync-event
// stream like any other round.
export function rescanWallet(id: string): Promise<WalletState> {
  return invoke("rescan_wallet", { id });
}

export function startOver(): Promise<void> {
  return invoke("start_over");
}

export function listWallets(): Promise<WalletSummary[]> {
  return invoke("list_wallets");
}

export function selectWallet(id: string): Promise<WalletState> {
  return invoke("select_wallet", { id });
}

// Set or clear a user-facing wallet name. Empty string clears (short fingerprint).
export function setWalletLabel(id: string, label: string): Promise<WalletState> {
  return invoke("set_wallet_label", { id, label });
}

export function onSyncEvent(
  handler: (event: SyncEvent) => void,
): Promise<UnlistenFn> {
  return listen<SyncEvent>("sync-event", (e) => handler(e.payload));
}

// GUI lifecycle preference: when false the Tauri process stops the daemon on exit.
export function setKeepRunningInBackground(enabled: boolean): Promise<void> {
  return invoke("set_keep_running_in_background", { enabled });
}

export function getKeepRunningInBackground(): Promise<boolean> {
  return invoke("get_keep_running_in_background");
}
