import { useSyncExternalStore } from "react";

// Experimental features the user switches on from Settings → Experimental. Device-local,
// not daemon-backed: a flag only changes what this install's UI shows, so it lives in
// localStorage like the reduce-motion preference, never in the wallet or over the wire.
// Each entry renders one row in the Experimental section. Gating a feature is reading its
// flag at the site that should appear or vanish (the Notes nav item, the /notes route).

export type FeatureId = "notes";

export const FEATURES: { id: FeatureId; label: string; description: string }[] = [
  {
    id: "notes",
    label: "Notes",
    description:
      "Show the Notes view in the sidebar, a per-output inspector for what the wallet can see.",
  },
];

const key = (id: FeatureId) => `pendrake.features.${id}`;

// One subscriber set covers every flag. A toggle wakes all of them and each useFeature
// re-reads its own flag, so the sidebar, the route guard, and the Settings switch stay
// in lockstep without a reload.
const listeners = new Set<() => void>();

// Unset means off: an experimental feature is opt-in, so a fresh install shows none.
export function isEnabled(id: FeatureId): boolean {
  return (
    typeof localStorage !== "undefined" && localStorage.getItem(key(id)) === "on"
  );
}

export function setEnabled(id: FeatureId, on: boolean): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(key(id), on ? "on" : "off");
  }
  for (const notify of listeners) notify();
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

// Live flag for components: re-renders the caller the moment the feature is toggled.
export function useFeature(id: FeatureId): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isEnabled(id),
    () => false,
  );
}
