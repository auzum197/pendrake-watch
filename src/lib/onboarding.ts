import type { BirthdayInput, Network } from "@/lib/ipc";

export type OnboardingStep = "identity" | "indexer" | "passphrase";

// The network is derived from the UFVK's bech32m prefix and is immutable for the
// wallet (docs/adr/0002): the engine cross-checks this against the key and rejects
// a mismatch. uviewregtest is regtest, uviewtest is public testnet (which the engine
// rejects, but the prefix shares regtest's onboarding step sequence), otherwise mainnet.
export function networkFromUfvk(ufvk: string): Network {
	const hrp = ufvk.trim().toLowerCase();
	return hrp.startsWith("uviewtest") || hrp.startsWith("uviewregtest")
		? "regtest"
		: "mainnet";
}

// The Indexer step is regtest-only: mainnet uses DEFAULT_INDEXER and skips it,
// regtest must supply one during onboarding (CONTEXT.md "Indexer", story 13). The
// Passphrase step is dropped when the daemon already holds the session passphrase,
// which is the post-Replace case: the new Wallet inherits it (docs/adr/0004).
export function onboardingSteps(
	network: Network,
	sessionHeld = false,
): OnboardingStep[] {
	const steps: OnboardingStep[] =
		network === "mainnet" ? ["identity"] : ["identity", "indexer"];
	if (!sessionHeld) {
		steps.push("passphrase");
	}
	return steps;
}

// Parse a dd/mm/yyyy field into unix seconds for midnight UTC of that day, or null
// if it isn't a real date. The daemon settles it into a height; leaning on midnight
// keeps the estimate on the earlier side.
export function parseDateToUnix(input: string): number | null {
	const m = input.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
	if (!m) return null;
	const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
	const ms = Date.UTC(year, month - 1, day);
	const d = new Date(ms);
	// Reject overflow like 31/02 that Date.UTC silently rolls forward.
	if (
		d.getUTCFullYear() !== year ||
		d.getUTCMonth() !== month - 1 ||
		d.getUTCDate() !== day
	) {
		return null;
	}
	return Math.floor(ms / 1000);
}

export type BirthdayDraft = {
	syncMode: "date" | "height";
	date: string;
	height: string;
};

// The raw Birthday choice the daemon's resolver settles into a height, so the GUI
// never pre-resolves (docs/adr/0002). Regtest has no date path and falls back to
// default (its activation, height 1) when left blank; on mainnet a blank height or
// an unparseable date both fall back to default (the Sapling floor).
export function birthdayChoice(
	draft: BirthdayDraft,
	network: Network,
): BirthdayInput {
	if (network === "regtest" || draft.syncMode === "height") {
		return draft.height
			? { kind: "height", value: Number(draft.height) }
			: { kind: "default" };
	}
	const secs = parseDateToUnix(draft.date);
	return secs === null ? { kind: "default" } : { kind: "date", value: secs };
}
