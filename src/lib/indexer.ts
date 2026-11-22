import type { Network } from "@/lib/ipc";

// The public mainnet default: zec.rocks auto-routes to a nearby region.
export const DEFAULT_INDEXER = "https://zec.rocks:443";

// The public testnet default, the endpoint zingolib itself falls back to.
export const DEFAULT_TESTNET_INDEXER = "https://testnet.zec.rocks";

// The sentinel selection for "not one of the presets". Any other selection value is
// a preset's URI.
export const CUSTOM_INDEXER = "custom";

export type IndexerPreset = { label: string; uri: string };

// Curated mainnet Indexers shown in onboarding and Settings. The default is
// auto-routed; the rest pin a region.
export const MAINNET_INDEXERS: IndexerPreset[] = [
  { label: "Default (auto-routed)", uri: DEFAULT_INDEXER },
  { label: "North America", uri: "https://na.zec.rocks:443" },
  { label: "Europe", uri: "https://eu.zec.rocks:443" },
  { label: "South America", uri: "https://sa.zec.rocks:443" },
  { label: "Middle East", uri: "https://me.zec.rocks:443" },
];

// Testnet has a single public default rather than a region list. Regtest has no
// public default at all, so it never appears here.
export const TESTNET_INDEXERS: IndexerPreset[] = [
  { label: "Default", uri: DEFAULT_TESTNET_INDEXER },
];

// The curated presets a network offers, in list order. Regtest has none.
export function indexerPresets(network: Network): IndexerPreset[] {
  return network === "mainnet"
    ? MAINNET_INDEXERS
    : network === "testnet"
      ? TESTNET_INDEXERS
      : [];
}

// The URI a network opens on before the user touches anything, or null when the
// network has no public default (regtest).
export function defaultIndexer(network: Network): string | null {
  return indexerPresets(network)[0]?.uri ?? null;
}

// A minimally well-formed http(s) URL with a host. Deliberately light (no scheme
// enforcement), so a regtest `http://localhost:…` passes; the daemon's connect is
// the real gate.
export function looksLikeUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return (
      (u.protocol === "https:" || u.protocol === "http:") && u.hostname !== ""
    );
  } catch {
    return false;
  }
}

// Regtest has no curated presets, so it is always on the custom entry no matter what
// the selection says.
export function isCustomIndexer(selection: string, network: Network): boolean {
  return network === "regtest" || selection === CUSTOM_INDEXER;
}

// The selection as it makes sense for `network`: custom and real presets pass
// through, while a selection carried over from another network (the draft starts
// on mainnet's default before any key is pasted) falls back to this network's own
// default.
export function effectiveIndexerSelection(
  selection: string,
  network: Network,
): string {
  return isCustomIndexer(selection, network) ||
    indexerPresets(network).some((p) => p.uri === selection)
    ? selection
    : (defaultIndexer(network) ?? CUSTOM_INDEXER);
}

// The URI a selection resolves to: a preset is taken as-is, custom takes the typed URL.
export function resolveIndexer(
  selection: string,
  customUrl: string,
  network: Network,
): string {
  return isCustomIndexer(selection, network) ? customUrl.trim() : selection;
}

// Whether a selection is complete enough to hand to the daemon. A preset always is;
// a custom entry has to look like a URL first.
export function indexerReady(
  selection: string,
  customUrl: string,
  network: Network,
): boolean {
  return isCustomIndexer(selection, network)
    ? looksLikeUrl(customUrl.trim())
    : selection.length > 0;
}
