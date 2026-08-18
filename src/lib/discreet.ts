import { useSyncExternalStore } from "react";
import { getCachedWallet, setCachedWallet } from "@/hooks/use-wallet-data";
import { setDiscreet } from "./ipc";

// Discreet mode (docs/adr/0009). The daemon owns the persisted flag (it redacts
// notifications posted while the window is closed); this store is its live mirror
// plus the transient peek axis, so every masked surface reacts the moment the eye
// or the Settings switch flips, instead of waiting out the wallet-state poll.
// Modeled on features.ts: one subscriber set, useSyncExternalStore at call sites.

let hidden = false;
// True while the sidebar eye is held down. Reveals without touching the flag.
let peeking = false;
// Optimistic toggles in flight. While nonzero, hydration from a wallet-state load
// is ignored so a stale snapshot can't clobber the flip before the daemon confirms.
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

// Whether sensitive values should render masked right now.
export function isMasked(): boolean {
  return hidden && !peeking;
}

// Live masked state for render sites: dots when true, real values when false.
export function useMasked(): boolean {
  return useSyncExternalStore(subscribe, isMasked, () => false);
}

// The raw flag, for the eye's pressed state and the Settings switch. Stays true
// during a peek, which is what makes peek read as a peek and not a toggle.
export function useDiscreet(): boolean {
  return useSyncExternalStore(subscribe, () => hidden, () => false);
}

// Sync the mirror from a wallet-state load (use-wallet-data). The daemon is the
// source of truth at rest; this is how a restart or a second window catches up.
export function hydrateDiscreet(on: boolean): void {
  if (inFlight > 0 || on === hidden) return;
  hidden = on;
  emit();
}

export function setPeeking(on: boolean): void {
  if (on === peeking) return;
  peeking = on;
  emit();
}

// Flip the flag optimistically, then persist. On failure (daemon down) the flip
// reverts, which is the switch's own feedback. Two rapid toggles from different
// surfaces resolve last-write-wins at the daemon; fine for a boolean.
export async function toggleDiscreet(): Promise<void> {
  const next = !hidden;
  hidden = next;
  inFlight++;
  emit();
  try {
    const state = await setDiscreet(next);
    hidden = state.discreet ?? next;
    // Keep a custom wallet name if the daemon omits label on this response.
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