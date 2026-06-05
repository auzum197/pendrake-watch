/**
 * Wallet domain state.
 *
 * PATTERN: all Tauri IPC calls live in the *actions* below (via `src/lib/tauri.ts`).
 * Components read state and call actions — they never `invoke()` directly. This
 * keeps data-fetching in one testable place and components purely declarative.
 *
 * Only `isConfigured` is persisted (it gates the router). Balances, sync status
 * and transactions are runtime data and are always re-fetched from Rust.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { tauri, TauriInvokeError } from "@/lib/tauri";
import type {
  Account,
  SyncStatus,
  TransactionRecord,
  WalletBalance,
} from "@/types/wallet";

interface WalletState {
  /** Whether a viewing key has been set up. Gates access to the app routes. */
  isConfigured: boolean;

  balance: WalletBalance | null;
  syncStatus: SyncStatus | null;
  transactions: TransactionRecord[];
  accounts: Account[];

  loading: boolean;
  error: string | null;

  // --- actions ---
  setConfigured: (configured: boolean) => void;
  refreshBalance: () => Promise<void>;
  refreshSyncStatus: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshAccounts: () => Promise<void>;
  refreshAll: () => Promise<void>;
  reset: () => void;
}

/** Helper to run an IPC action with shared loading/error handling. */
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

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      isConfigured: false,
      balance: null,
      syncStatus: null,
      transactions: [],
      accounts: [],
      loading: false,
      error: null,

      setConfigured: (configured) => set({ isConfigured: configured }),

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
          const [balance, syncStatus, transactions, accounts] =
            await Promise.all([
              tauri.getBalance(),
              tauri.getSyncStatus(),
              tauri.getTransactions(),
              tauri.getAccounts(),
            ]);
          set({ balance, syncStatus, transactions, accounts });
        }),

      reset: () =>
        set({
          isConfigured: false,
          balance: null,
          syncStatus: null,
          transactions: [],
          accounts: [],
          error: null,
        }),
    }),
    {
      name: "pendrake-wallet",
      storage: createJSONStorage(() => localStorage),
      // Persist only the gating flag; runtime data is re-fetched from Rust.
      partialize: (state) => ({ isConfigured: state.isConfigured }),
    },
  ),
);
