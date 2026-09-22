const KEY = "pendrake.keepRunningInBackground";

/** Default true: daemon keeps running after the GUI closes. */
export function keepRunningInBackground(): boolean {
  const v = localStorage.getItem(KEY);
  if (v === null) return true;
  return v === "true";
}

export function setKeepRunningInBackground(enabled: boolean): void {
  localStorage.setItem(KEY, String(enabled));
}
