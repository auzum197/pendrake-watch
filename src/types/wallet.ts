/**
 * TypeScript mirror of the Rust models in `src-tauri/src/models.rs`.
 * Field names are camelCase because the Rust structs use
 * `#[serde(rename_all = "camelCase")]`.
 *
 * All zatoshi amounts are strings (decimal) — parse with BigInt via
 * `src/lib/zec.ts`, never `Number()`.
 */

export type Pool = "transparent" | "sapling" | "orchard";

export const POOLS: readonly Pool[] = ["transparent", "sapling", "orchard"];

export type SyncState = "idle" | "syncing" | "synced" | "error";

export type TxDirection = "received" | "sent";

export interface WalletBalance {
  totalZatoshis: string;
  transparent: string;
  sapling: string;
  orchard: string;
}

export interface SyncStatus {
  state: SyncState;
  syncedBlocks: number;
  totalBlocks: number;
  tipHeight: number;
}

export interface TransactionRecord {
  txid: string;
  blockHeight: number;
  /** Unix timestamp in seconds. */
  timestamp: number;
  direction: TxDirection;
  pool: Pool;
  valueZatoshis: string;
  confirmations: number;
}

export interface WalletAddress {
  address: string;
  pool: Pool;
}

export interface Account {
  id: number;
  label: string;
  addresses: WalletAddress[];
}
