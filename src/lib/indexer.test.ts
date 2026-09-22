import { describe, expect, it } from "vitest";
import {
	CUSTOM_INDEXER,
	indexerReady,
	isCustomIndexer,
	looksLikeUrl,
	resolveIndexer,
} from "./indexer";

// A stand-in for a curated preset. Any non-sentinel selection is one.
const PRESET = "https://zec.rocks:443";

describe("looksLikeUrl", () => {
	it("accepts http and https with a host", () => {
		expect(looksLikeUrl("https://zec.rocks:443")).toBe(true);
		expect(looksLikeUrl("http://localhost:8232")).toBe(true);
	});

	it("rejects anything without a scheme and host", () => {
		expect(looksLikeUrl("")).toBe(false);
		expect(looksLikeUrl("zec.rocks:443")).toBe(false);
		expect(looksLikeUrl("ftp://zec.rocks")).toBe(false);
	});
});

describe("isCustomIndexer", () => {
	it("reads the sentinel as custom on mainnet", () => {
		expect(isCustomIndexer(CUSTOM_INDEXER, "mainnet")).toBe(true);
		expect(isCustomIndexer(PRESET, "mainnet")).toBe(false);
	});

	it("is always custom on regtest, which has no presets", () => {
		expect(isCustomIndexer(PRESET, "regtest")).toBe(true);
	});
});

describe("resolveIndexer", () => {
	it("takes a mainnet preset as-is", () => {
		expect(resolveIndexer(PRESET, "https://ignored", "mainnet")).toBe(
			PRESET,
		);
	});

	it("takes the trimmed custom URL when custom is selected", () => {
		expect(
			resolveIndexer(CUSTOM_INDEXER, " https://mine:443 ", "mainnet"),
		).toBe("https://mine:443");
	});

	it("ignores the selection on regtest", () => {
		expect(resolveIndexer(PRESET, "http://localhost:8232", "regtest")).toBe(
			"http://localhost:8232",
		);
	});
});

describe("indexerReady", () => {
	it("is ready on any mainnet preset", () => {
		expect(indexerReady(PRESET, "", "mainnet")).toBe(true);
	});

	it("needs a URL-shaped custom entry", () => {
		expect(indexerReady(CUSTOM_INDEXER, "", "mainnet")).toBe(false);
		expect(indexerReady(CUSTOM_INDEXER, "not a url", "mainnet")).toBe(false);
		expect(indexerReady(CUSTOM_INDEXER, "https://mine:443", "mainnet")).toBe(true);
	});

	it("holds regtest to the same URL shape, preset or not", () => {
		expect(indexerReady(PRESET, "", "regtest")).toBe(false);
		expect(indexerReady(PRESET, "http://localhost:8232", "regtest")).toBe(
			true,
		);
	});
});
