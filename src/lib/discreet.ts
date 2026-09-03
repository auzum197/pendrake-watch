import { useSyncExternalStore } from "react";
import { getCachedWallet, setCachedWallet } from "@/hooks/use-wallet-data";
import { setDiscreet } from "./ipc";


let hidden = false;
let inFlight = 0;

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

export function isMasked(): boolean {
  return hidden;
}

export function useMasked(): boolean {
  return useSyncExternalStore(subscribe, isMasked, () => false);
}

export function useDiscreet(): boolean {
  return useSyncExternalStore(subscribe, () => hidden, () => false);
}

export function hydrateDiscreet(on: boolean): void {
  if (inFlight > 0 || on === hidden) return;
  hidden = on;
  emit();
}

export async function toggleDiscreet(): Promise<void> {
  const next = !hidden;
  hidden = next;
  inFlight++;
  emit();
  try {
    const state = await setDiscreet(next);
    hidden = state.discreet ?? next;
    const prev = getCachedWallet();
    setCachedWallet({
      ...state,
      label: state.label ?? prev?.label ?? null,
    });
  } catch {
    hidden = !next;
  } finally {
    inFlight--;
    emit();
  }
}