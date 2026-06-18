import type { Network } from "@/lib/ipc";

export type OnboardingStep = "identity" | "indexer" | "passphrase";

// The network is derived from the UFVK's bech32m prefix and is immutable for the
// wallet (docs/adr/0002): the engine cross-checks this against the key and rejects
// a mismatch. uviewtest/uviewregtest are testnet, otherwise mainnet. The daemon
// only models mainnet and testnet, so regtest folds into testnet for now.
export function networkFromUfvk(ufvk: string): Network {
  const hrp = ufvk.trim().toLowerCase();
  return hrp.startsWith("uviewtest") || hrp.startsWith("uviewregtest")
    ? "testnet"
    : "mainnet";
}

// The Indexer step is regtest-only: mainnet uses DEFAULT_INDEXER and skips it,
// regtest must supply one during onboarding (CONTEXT.md "Indexer", story 13).
export function onboardingSteps(network: Network): OnboardingStep[] {
  return network === "mainnet"
    ? ["identity", "passphrase"]
    : ["identity", "indexer", "passphrase"];
}
