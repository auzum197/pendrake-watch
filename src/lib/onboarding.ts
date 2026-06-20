import type { Network } from "@/lib/ipc";

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
