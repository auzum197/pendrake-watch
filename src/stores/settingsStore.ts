/**
 * App settings backed by the SQLite `settings` table (via Tauri).
 *
 * - Loaded from the backend on startup (`load`).
 * - **Optimistic updates:** the UI state changes instantly, then persists in the
 *   background; on failure the change is reverted. `setEndpoint` rethrows so the
 *   settings form can surface backend validation errors (e.g. TLS required).
 *
 * IPC calls live only in these actions (same rule as walletStore).
 */

import { create } from "zustand";
import { tauri } from "@/lib/tauri";
import type {
  Currency,
  EndpointConfig,
  NamedEndpoint,
  Theme,
} from "@/types/settings";

interface SettingsState {
  loaded: boolean;
  endpoint: EndpointConfig | null;
  theme: Theme;
  currency: Currency;
  autoSyncOnStartup: boolean;
  defaultEndpoints: NamedEndpoint[];

  load: () => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
  setCurrency: (currency: Currency) => Promise<void>;
  setAutoSync: (value: boolean) => Promise<void>;
  setEndpoint: (config: EndpointConfig) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  loaded: false,
  endpoint: null,
  theme: "system",
  currency: "USD",
  autoSyncOnStartup: true,
  defaultEndpoints: [],

  load: async () => {
    const [settings, defaults] = await Promise.all([
      tauri.getAppSettings(),
      tauri.listDefaultEndpoints(),
    ]);
    set({
      endpoint: settings.endpoint,
      theme: settings.theme,
      currency: settings.currency,
      autoSyncOnStartup: settings.autoSyncOnStartup,
      defaultEndpoints: defaults,
      loaded: true,
    });
  },

  setTheme: async (theme) => {
    const prev = get().theme;
    set({ theme });
    try {
      await tauri.setSetting("theme", theme);
    } catch {
      set({ theme: prev });
    }
  },

  setCurrency: async (currency) => {
    const prev = get().currency;
    set({ currency });
    try {
      await tauri.setSetting("currency", currency);
    } catch {
      set({ currency: prev });
    }
  },

  setAutoSync: async (value) => {
    const prev = get().autoSyncOnStartup;
    set({ autoSyncOnStartup: value });
    try {
      await tauri.setSetting("auto_sync_on_startup", String(value));
    } catch {
      set({ autoSyncOnStartup: prev });
    }
  },

  setEndpoint: async (config) => {
    const prev = get().endpoint;
    set({ endpoint: config });
    try {
      await tauri.setEndpoint(config);
    } catch (err) {
      set({ endpoint: prev });
      throw err; // let the form show the validation error
    }
  },
}));
