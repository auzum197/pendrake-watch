import { describe, expect, it } from "vitest";
import { networkFromUfvk, onboardingSteps } from "./onboarding";

describe("onboardingSteps", () => {
	it("skips the Indexer step on mainnet", () => {
		expect(onboardingSteps("mainnet")).toEqual(["identity", "passphrase"]);
	});

	it("keeps the Indexer step on regtest, between identity and passphrase", () => {
		expect(onboardingSteps("regtest")).toEqual([
			"identity",
			"indexer",
			"passphrase",
		]);
	});

	it("drops the Passphrase step when the session passphrase is held", () => {
		expect(onboardingSteps("mainnet", true)).toEqual(["identity"]);
		expect(onboardingSteps("regtest", true)).toEqual(["identity", "indexer"]);
	});
});

describe("networkFromUfvk", () => {
	it("reads a regtest prefix as regtest", () => {
		expect(networkFromUfvk("uviewregtest1abc")).toBe("regtest");
		expect(networkFromUfvk("uviewtest1abc")).toBe("regtest");
	});

	it("treats anything else as mainnet", () => {
		expect(networkFromUfvk("uview1abc")).toBe("mainnet");
	});
});
