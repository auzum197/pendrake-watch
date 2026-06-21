import { describe, expect, it } from "vitest";
import {
	birthdayChoice,
	networkFromUfvk,
	onboardingSteps,
	parseDateToUnix,
} from "./onboarding";

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

describe("parseDateToUnix", () => {
	it("reads dd/mm/yyyy as midnight UTC", () => {
		expect(parseDateToUnix("28/10/2018")).toBe(Date.UTC(2018, 9, 28) / 1000);
		expect(parseDateToUnix(" 1/1/2020 ")).toBe(Date.UTC(2020, 0, 1) / 1000);
	});

	it("rejects malformed or impossible dates", () => {
		expect(parseDateToUnix("")).toBeNull();
		expect(parseDateToUnix("2018-10-28")).toBeNull();
		expect(parseDateToUnix("31/02/2020")).toBeNull();
		expect(parseDateToUnix("not a date")).toBeNull();
	});
});

describe("birthdayChoice", () => {
	it("sends an explicit height when the user picks one", () => {
		expect(
			birthdayChoice({ syncMode: "height", date: "", height: "900000" }, "mainnet"),
		).toEqual({ kind: "height", value: 900000 });
	});

	it("falls back to default when a height field is blank", () => {
		expect(
			birthdayChoice({ syncMode: "height", date: "", height: "" }, "mainnet"),
		).toEqual({ kind: "default" });
	});

	it("converts a mainnet date to a tagged date choice", () => {
		expect(
			birthdayChoice({ syncMode: "date", date: "28/10/2018", height: "" }, "mainnet"),
		).toEqual({ kind: "date", value: Date.UTC(2018, 9, 28) / 1000 });
	});

	it("falls back to default on an unparseable date", () => {
		expect(
			birthdayChoice({ syncMode: "date", date: "??", height: "" }, "mainnet"),
		).toEqual({ kind: "default" });
	});

	it("ignores the date path on regtest, using the height field", () => {
		expect(
			birthdayChoice({ syncMode: "date", date: "28/10/2018", height: "5" }, "regtest"),
		).toEqual({ kind: "height", value: 5 });
		// Blank regtest height defaults to its activation (height 1).
		expect(
			birthdayChoice({ syncMode: "date", date: "28/10/2018", height: "" }, "regtest"),
		).toEqual({ kind: "default" });
	});
});
