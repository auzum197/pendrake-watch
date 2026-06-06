/**
 * Frontend half of the `pendrake://` deep-link contract. Mirror of
 * `src-tauri/src/notify/deeplink.rs` — keep both in sync.
 *
 * Flow: the user clicks a native notification → the OS opens the URI →
 * `tauri-plugin-single-instance` forwards it to the running GUI →
 * `onOpenUrl` (wired in `registerDeepLinks`) routes it here, where we translate
 * the intent into a TanStack Router navigation. This is the same path dorianvp's
 * daemon will trigger once background sync exists.
 */

import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { router } from "@/router";

/** Provisional scheme; TBD with dorianvp. Must match `URI_SCHEME` in deeplink.rs. */
export const URI_SCHEME = "pendrake";

/** Route a single `pendrake://…` URI to a navigation. Exported for the dev panel. */
export async function handleDeepLink(uri: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return;
  }
  if (url.protocol !== `${URI_SCHEME}:`) return;

  // The intent is the host ("tx"); some platforms surface it as pathname.
  // We only notify on new transactions (decision with dorianvp), so "tx" is the only
  // intent for now; unknown intents are a no-op (forward-compatible).
  const intent = url.host || url.pathname.replace(/^\/+/, "");
  if (intent === "tx") {
    await router.navigate({ to: "/transactions" });
  }
}

/** Wire the OS deep-link callback once, at app startup. Safe outside Tauri. */
export async function registerDeepLinks(): Promise<void> {
  try {
    await onOpenUrl((urls) => {
      for (const uri of urls) void handleDeepLink(uri);
    });
  } catch {
    // Non-Tauri context (e.g. plain `vite preview`) — deep links are a no-op.
  }
}

/** Sample URI the Settings dev panel uses to exercise navigation locally. */
export const SAMPLE_DEEP_LINKS = {
  tx: `${URI_SCHEME}://tx?account=0&txid=demo-txid-0001`,
} as const;
