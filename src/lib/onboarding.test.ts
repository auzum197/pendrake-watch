import { describe, expect, it } from "vitest";
import { networkFromUfvk, onboardingSteps } from "./onboarding";

describe("onboardingSteps", () => {
  it("skips the Indexer step on mainnet", () => {
    expect(onboardingSteps("mainnet")).toEqual(["identity", "passphrase"]);
  });

  it("keeps the Indexer step on regtest, between identity and passphrase", () => {
    expect(onboardingSteps("testnet")).toEqual([
      "identity",
      "indexer",
      "passphrase",
    ]);
  });
});

describe("networkFromUfvk", () => {
  it("reads a regtest prefix as testnet", () => {
    expect(networkFromUfvk("uviewregtest1abc")).toBe("testnet");
    expect(networkFromUfvk("uviewtest1abc")).toBe("testnet");
  });

  it("treats anything else as mainnet", () => {
    expect(networkFromUfvk("uview1abc")).toBe("mainnet");
  });
});
