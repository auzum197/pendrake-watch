/**
 * UI / presentation state — no IPC here, purely client-side preferences.
 * Fully persisted so the user's choices survive restarts.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";

interface UiState {
  theme: Theme;
  /** The account selected in the UI (index into the accounts list). */
  selectedAccountId: number | null;
  /** When true, balances render as a mask instead of real amounts. */
  balanceHidden: boolean;

  setTheme: (theme: Theme) => void;
  setSelectedAccount: (id: number | null) => void;
  toggleBalanceHidden: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: "system",
      selectedAccountId: 0,
      balanceHidden: false,

      setTheme: (theme) => set({ theme }),
      setSelectedAccount: (id) => set({ selectedAccountId: id }),
      toggleBalanceHidden: () =>
        set((state) => ({ balanceHidden: !state.balanceHidden })),
    }),
    {
      name: "pendrake-ui",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
