/**
 * Wallet domain state.
 *
 * PATTERN: all Tauri IPC calls live in the *actions* below (via `src/lib/tauri.ts`).
 * Components read state and call actions — they never `invoke()` directly.
 *
 * Vault lifecycle (`status`) is owned by the Rust backend and re-fetched via
 * `refreshStatus()`; it is NOT persisted client-side. Auth actions throw on
 * failure so forms can show inline errors; data actions store the error instead.
 */

import { create } from "zustand";
import { tauri, TauriInvokeError } from "@/lib/tauri";
import type {
  Account,
  SyncStatus,
  TransactionRecord,
  WalletBalance,
  WalletStatus,
} from "@/types/wallet";

interface WalletState {
  status: WalletStatus | null;

  balance: WalletBalance | null;
  syncStatus: SyncStatus | null;
  transactions: TransactionRecord[];
  accounts: Account[];

  loading: boolean;
  error: string | null;

  // --- vault / auth actions (throw on failure) ---
  refreshStatus: () => Promise<void>;
  setupWallet: (viewingKey: string, password: string) => Promise<void>;
  unlockWallet: (password: string) => Promise<void>;
  lockWallet: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;

  // --- data actions (store error, don't throw) ---
  refreshBalance: () => Promise<void>;
  refreshSyncStatus: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshAccounts: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

/** Run a data fetch with shared loading/error handling (no throw). */
async function withErrorHandling(
  set: (partial: Partial<WalletState>) => void,
  fn: () => Promise<void>,
): Promise<void> {
  set({ loading: true, error: null });
  try {
    await fn();
  } catch (err) {
    const message =
      err instanceof TauriInvokeError ? err.message : "Unexpected error";
    set({ error: message });
  } finally {
    set({ loading: false });
  }
}

export const useWalletStore = create<WalletState>()((set, get) => ({
  status: null,
  balance: null,
  syncStatus: null,
  transactions: [],
  accounts: [],
  loading: false,
  error: null,

  refreshStatus: async () => {
    set({ status: await tauri.walletStatus() });
  },

  setupWallet: async (viewingKey, password) => {
    await tauri.setupWallet(viewingKey, password);
    await get().refreshStatus();
  },

  unlockWallet: async (password) => {
    await tauri.unlockWallet(password);
    await get().refreshStatus();
  },

  lockWallet: async () => {
    await tauri.lockWallet();
    await get().refreshStatus();
  },

  changePassword: async (oldPassword, newPassword) => {
    await tauri.changePassword(oldPassword, newPassword);
  },

  refreshBalance: () =>
    withErrorHandling(set, async () => {
      set({ balance: await tauri.getBalance() });
    }),

  refreshSyncStatus: () =>
    withErrorHandling(set, async () => {
      set({ syncStatus: await tauri.getSyncStatus() });
    }),

  refreshTransactions: () =>
    withErrorHandling(set, async () => {
      set({ transactions: await tauri.getTransactions() });
    }),

  refreshAccounts: () =>
    withErrorHandling(set, async () => {
      set({ accounts: await tauri.getAccounts() });
    }),

  refreshAll: () =>
    withErrorHandling(set, async () => {
      const [balance, syncStatus, transactions, accounts] = await Promise.all([
        tauri.getBalance(),
        tauri.getSyncStatus(),
        tauri.getTransactions(),
        tauri.getAccounts(),
      ]);
      set({ balance, syncStatus, transactions, accounts });
    }),
}));
