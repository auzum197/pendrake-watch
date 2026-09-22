import { useSyncExternalStore } from "react";

// What the dialog opens onto: the Indexer row (deep link), or a Wallet's plate in
// the Wallets category (switcher menus). Both clear when the dialog closes.
type State = { open: boolean; focusIndexer: boolean; focusWallet: string | null };

let state: State = { open: false, focusIndexer: false, focusWallet: null };
const listeners = new Set<() => void>();

function emit() {
  for (const notify of listeners) notify();
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

export function openSettings(opts?: { indexer?: boolean; wallet?: string }): void {
  state = {
    open: true,
    focusIndexer: opts?.indexer ?? false,
    focusWallet: opts?.wallet ?? null,
  };
  emit();
}

export function closeSettings(): void {
  if (!state.open) return;
  state = { open: false, focusIndexer: false, focusWallet: null };
  emit();
}

export function useSettingsModal(): State {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}
