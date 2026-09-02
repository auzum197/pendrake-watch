import { useSyncExternalStore } from "react";


type State = { open: boolean; focusIndexer: boolean };

let state: State = { open: false, focusIndexer: false };
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

export function openSettings(opts?: { indexer?: boolean }): void {
  state = { open: true, focusIndexer: opts?.indexer ?? false };
  emit();
}

export function closeSettings(): void {
  if (!state.open) return;
  state = { open: false, focusIndexer: false };
  emit();
}

export function useSettingsModal(): State {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}
