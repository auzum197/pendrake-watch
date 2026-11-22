import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import {
  listen as tauriListen,
  type EventCallback,
  type UnlistenFn,
} from "@tauri-apps/api/event";

export type Invoke = <T>(
  cmd: string,
  args?: Record<string, unknown>,
) => Promise<T>;

export type Listen = <T>(
  event: string,
  handler: EventCallback<T>,
) => Promise<UnlistenFn>;

// Faker mode: VITE_FAKER=1 swaps the daemon for an in-memory one seeded with a
// spread of Wallets (src/lib/faker), so the GUI runs with no daemon, no Indexer
// and no Tauri shell. Vite folds the variable at build time, so the dynamic
// import is dead code unless the build was made with it set, which is how a
// release demo build ships the fake and a normal release ships only the real
// transport.
export const FAKER = import.meta.env.VITE_FAKER === "1";

const faker = FAKER ? await import("./faker/transport") : null;

export const invoke: Invoke = faker ? faker.invoke : tauriInvoke;
export const listen: Listen = faker ? faker.listen : tauriListen;
