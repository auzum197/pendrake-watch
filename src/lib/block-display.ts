import { useSyncExternalStore } from "react";
import { animationsEnabled } from "./motion";

export type BlockDisplay = "height" | "time";

const KEY = "pendrake.blockDisplay";

export const SWAP_MS = 220;

function stored(): BlockDisplay {
  const raw =
    typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
  return raw === "time" ? "time" : "height";
}

let current: BlockDisplay = stored();
let swapping = false;
let swapTimer: ReturnType<typeof setTimeout> | undefined;

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

export function blockDisplay(): BlockDisplay {
  return current;
}

export function useBlockDisplay(): BlockDisplay {
  return useSyncExternalStore(subscribe, blockDisplay, () => "height");
}

export function useBlockSwapping(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => swapping,
    () => false,
  );
}

export function setBlockDisplay(next: BlockDisplay): void {
  if (next === current) return;
  current = next;
  if (typeof localStorage !== "undefined") localStorage.setItem(KEY, next);
  if (animationsEnabled()) {
    swapping = true;
    clearTimeout(swapTimer);
    swapTimer = setTimeout(() => {
      swapping = false;
      emit();
    }, SWAP_MS + 40);
  }
  emit();
}

export function toggleBlockDisplay(): void {
  setBlockDisplay(current === "height" ? "time" : "height");
}
