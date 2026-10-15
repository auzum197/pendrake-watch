import type { EventCallback, UnlistenFn } from "@tauri-apps/api/event";
import { FakeDaemon } from "./daemon";
import { loadScenario, saveScenario } from "./scenario";

// The scenario is the fake daemon's data dir: localStorage holds whatever the
// editor or the app's own Settings changed, so a reload comes back to it.
export const daemon = new FakeDaemon(
  loadScenario(),
  () => Math.floor(Date.now() / 1000),
  saveScenario,
);

// A round trip to the real daemon is a few milliseconds over a local socket; the
// calls that open a Wallet or verify a passphrase are the ones that take long
// enough for a pending state to show, so those get a longer wait.
const LATENCY_MS: Record<string, number> = {
  select_wallet: 220,
  import_ufvk: 600,
  unlock: 350,
  rescan_wallet: 300,
  export_ufvk: 300,
  verify_passphrase: 250,
};

export function invoke<T>(
  cmd: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  daemon.start();
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(daemon.call(cmd, args) as T);
      } catch (e) {
        reject(e);
      }
    }, LATENCY_MS[cmd] ?? 40);
  });
}

export function listen<T>(
  event: string,
  handler: EventCallback<T>,
): Promise<UnlistenFn> {
  if (event !== "sync-event") return Promise.resolve(() => {});
  daemon.start();
  let id = 0;
  const stop = daemon.subscribe((payload) => {
    id += 1;
    handler({ event, id, payload: payload as T });
  });
  return Promise.resolve(stop);
}
