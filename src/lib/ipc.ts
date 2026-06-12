import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

// Mirrors the daemon's pendrake-ipc wire types, camelCase across the boundary.
export type Network = "mainnet" | "testnet";
export type ImportType = "ufvk" | "seed";
export type ViewMode = "full" | "incoming-only";

export type WalletState = {
  exists: boolean;
  importType: ImportType;
  viewMode: ViewMode;
  network: Network;
  birthdayHeight: number;
};

export type WalletAddress = {
  ua: string;
  transparent?: string;
};

export type ImportUfvkInput = {
  ufvk: string;
  birthday: number;
  indexerUri: string;
  network: Network;
};

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
};

export type TxKind = "received" | "sent";
export type TxStatus = "confirmed" | "pending";

export type Tx = {
  txid: string;
  datetime: number;
  blockHeight?: number;
  kind: TxKind;
  valueZat: string;
  status: TxStatus;
};

export const DEFAULT_INDEXER = "https://na.zec.rocks:443";

export function importUfvk(input: ImportUfvkInput): Promise<WalletState> {
  return invoke("import_ufvk", {
    ufvk: input.ufvk,
    birthday: input.birthday,
    indexerUri: input.indexerUri,
    network: input.network,
  });
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

export function forgetWallet(): Promise<void> {
  return invoke("forget_wallet");
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
  | { event: "error"; message: string };

export function onSyncEvent(
  handler: (event: SyncEvent) => void,
): Promise<UnlistenFn> {
  return listen<SyncEvent>("sync-event", (e) => handler(e.payload));
}
