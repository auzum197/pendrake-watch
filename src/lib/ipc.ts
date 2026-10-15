import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

// The wire types are generated from the daemon's pendrake-ipc crate by
// `just bindings`, so the two sides cannot drift. They are re-exported here as
// aliases (a plain re-export would survive into the Storybook module mock);
// nothing imports from generated/ directly.
import type * as Wire from "./generated/wire";
import { getSelectedId } from "./selection";

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
export type WalletSummary = Wire.WalletSummary & { selected: boolean };
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

// Unlocks this session. Rejects on a wrong passphrase. The result is the
// session-level state.
export function unlock(passphrase: string): Promise<WalletState> {
  return invoke("unlock", { passphrase });
}

export function lock(): Promise<void> {
  return invoke("lock");
}

export function setIndexer(id: string, indexerUri: string): Promise<WalletState> {
  return invoke("set_indexer", { id, indexerUri });
}

// One Wallet's notification setting. The result is that Wallet's state.
export function setNotifications(
  id: string,
  enabled: boolean,
): Promise<WalletState> {
  return invoke("set_notifications", { id, enabled });
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

// One Wallet's state, or the session-level state when `id` is omitted.
export function getWalletState(id?: string): Promise<WalletState> {
  return invoke("get_wallet_state", { id });
}

export function getAddresses(id: string): Promise<WalletAddress[]> {
  return invoke("get_addresses", { id });
}

export function getSyncStatus(id: string): Promise<SyncStatus> {
  return invoke("get_sync_status", { id });
}

export function getBalance(id: string): Promise<Balance> {
  return invoke("get_balance", { id });
}

export function getTransactions(id: string): Promise<Tx[]> {
  return invoke("get_transactions", { id });
}

export function getTransaction(id: string, txid: string): Promise<Tx | null> {
  return invoke("get_transaction", { id, txid });
}

// Every note the wallet can see, with spend status, for the notes debug view.
export function getNotes(id: string): Promise<WalletNote[]> {
  return invoke("get_notes", { id });
}

// Record consent to the price egress and start (or stop) the daemon's price refresh.
export function setFiatEnabled(
  id: string,
  enabled: boolean,
): Promise<WalletState> {
  return invoke("set_fiat_enabled", { id, enabled });
}

// Persist Discreet mode in the daemon, which redacts notification text while it is
// on (docs/adr/0009). Masking in the UI keys off the store in lib/discreet.ts. The
// returned state is session-level.
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

export function removeWallet(id: string, passphrase: string): Promise<void> {
  return invoke("remove_wallet", { id, passphrase });
}

export function rescanWallet(id: string): Promise<WalletState> {
  return invoke("rescan_wallet", { id });
}

export function startOver(): Promise<void> {
  return invoke("start_over");
}

export async function listWallets(): Promise<WalletSummary[]> {
  const wallets: Wire.WalletSummary[] = await invoke("list_wallets");
  const selected = getSelectedId();
  return wallets.map((w) => ({ ...w, selected: w.id === selected }));
}

// Set or clear a user-facing wallet name. Empty string clears (short fingerprint).
export function setWalletLabel(
  id: string,
  label: string,
): Promise<WalletState> {
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
