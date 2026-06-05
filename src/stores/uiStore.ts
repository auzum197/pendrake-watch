/**
 * UI / presentation state — no IPC here, purely client-side preferences.
 * Fully persisted so the user's choices survive restarts.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface UiState {
  /** The account selected in the UI (index into the accounts list). */
  selectedAccountId: number | null;
  /** When true, balances render as a mask instead of real amounts. */
  balanceHidden: boolean;
  /** Idle minutes before the wallet auto-locks. 0 = disabled. */
  autoLockMinutes: number;

  setSelectedAccount: (id: number | null) => void;
  toggleBalanceHidden: () => void;
  setAutoLockMinutes: (minutes: number) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      selectedAccountId: 0,
      balanceHidden: false,
      autoLockMinutes: 5,

      setSelectedAccount: (id) => set({ selectedAccountId: id }),
      toggleBalanceHidden: () =>
        set((state) => ({ balanceHidden: !state.balanceHidden })),
      setAutoLockMinutes: (minutes) => set({ autoLockMinutes: minutes }),
    }),
    {
      name: "pendrake-ui",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
