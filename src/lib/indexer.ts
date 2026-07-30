import type { Network } from "@/lib/ipc";

// The sentinel selection for "not one of the presets". Any other selection value is
// a preset's URI.
export const CUSTOM_INDEXER = "custom";

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
