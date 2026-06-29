// Whether the UI plays its entrance animations: the balance chart's enter fade and
// arrival pings, the transaction list's reveal cascade, and the tx detail's staggered
// reveals. These animate the incoming screen only, so they never snapshot the outgoing
// DOM the way a page view-transition crossfade does (removed, see docs/adr/0007).
//
// Driven by a per-device "reduce motion" preference. Unset means follow the OS
// (prefers-reduced-motion); the Settings toggle writes an explicit override that wins.
// The animation sites read this at mount, not once at module load, so flipping the
// toggle takes effect on the next screen opened without a reload.

const KEY = "pendrake.reduceMotion";

function osReducesMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// The effective preference: an explicit stored choice, or the OS default when unset.
export function reduceMotion(): boolean {
  const stored =
    typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
  if (stored === "on") return true;
  if (stored === "off") return false;
  return osReducesMotion();
}

// Inverse of reduceMotion, for the animation sites that gate on "should I animate".
export function animationsEnabled(): boolean {
  return !reduceMotion();
}

// Persist an explicit override from the Settings toggle. Survives reload, wins over OS.
export function setReduceMotion(on: boolean): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(KEY, on ? "on" : "off");
  }
}
