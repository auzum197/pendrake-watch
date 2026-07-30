import { describe, expect, it } from "vitest";
import { poolStats } from "./pools";
import type { Balance, Note, Pool, PoolBalance, Tx, WalletNote } from "./ipc";
import type { PoolStat } from "./pools";

const ZEC = 100_000_000;

function bal(parts: Partial<Record<Pool, number>>): Balance {
	const cell = (z?: number): PoolBalance | undefined =>
		z === undefined ? undefined : { confirmed: String(z), total: String(z) };
	return {
		ironwood: cell(parts.ironwood),
		orchard: cell(parts.orchard),
		sapling: cell(parts.sapling),
		transparent: cell(parts.transparent),
	};
}

// A wallet-wide note (the get_notes row), defaulting to a confirmed, unspent orchard note.
function wnote(part: Partial<WalletNote>): WalletNote {
	return {
		idx: 0,
		pool: "orchard",
		valueZat: "0",
		status: "unspent",
		height: 100,
		txid: "aa",
		change: false,
		spentHeight: null,
		...part,
	};
}

// A single output inside a transaction's detail.
function tnote(part: Partial<Note>): Note {
	return {
		pool: "orchard",
		direction: "received",
		outputIndex: 0,
		valueZat: "0",
		...part,
	};
}

function tx(part: Partial<Tx>): Tx {
	return {
		txid: "t",
		datetime: 0,
		kind: "received",
		valueZat: "0",
		status: "confirmed",
		notes: [],
		...part,
	};
}

const get = (stats: PoolStat[], pool: Pool) =>
	stats.find((s) => s.pool === pool) as PoolStat;

describe("poolStats share", () => {
	it("splits each pool's confirmed balance against the total", () => {
		const stats = poolStats(
			bal({ ironwood: 1000, orchard: 6900, sapling: 2400, transparent: 700 }),
			[],
			[],
		);
		expect(get(stats, "ironwood").share).toBeCloseTo(9.09);
		expect(get(stats, "orchard").share).toBeCloseTo(62.73);
		expect(get(stats, "sapling").share).toBeCloseTo(21.82);
		expect(get(stats, "transparent").share).toBeCloseTo(6.36);
	});

	it("is zero for every pool when the wallet is empty", () => {
		const stats = poolStats(null, [], []);
		expect(stats.map((s) => s.share)).toEqual([0, 0, 0, 0]);
	});

	it("computes over only the pools it's given, in that order", () => {
		const stats = poolStats(bal({ orchard: 100 }), [], [], [
			"orchard",
			"sapling",
		]);
		expect(stats.map((s) => s.pool)).toEqual(["orchard", "sapling"]);
	});
});

describe("poolStats trend", () => {
	it("returns to zero once every note in a pool is spent", () => {
		// The regression: spends are inputs, invisible among a transaction's pool
		// outputs. Reading the note's own spentHeight is what brings the pool back down.
		const notes = [
			wnote({
				pool: "sapling",
				valueZat: String(5 * ZEC),
				status: "spent",
				height: 100,
				spentHeight: 150,
			}),
		];
		const trend = get(poolStats(bal({}), [], notes), "sapling").trend;
		expect(trend[0]).toBe(0);
		expect(Math.max(...trend)).toBeCloseTo(5);
		expect(trend[trend.length - 1]).toBe(0);
	});

	it("orders moves by block height regardless of note order", () => {
		const notes = [
			wnote({ pool: "orchard", valueZat: String(2 * ZEC), height: 200 }),
			wnote({ pool: "orchard", valueZat: String(3 * ZEC), height: 100 }),
		];
		const trend = get(poolStats(bal({}), [], notes), "orchard").trend;
		expect(trend).toEqual([0, 3, 5]);
	});

	it("has no movement to plot for a pool that never held a note", () => {
		const trend = get(poolStats(bal({}), [], []), "transparent").trend;
		expect(trend).toEqual([0]);
	});
});

describe("poolStats held notes", () => {
	it("takes largest/smallest/count from the unspent notes only", () => {
		const notes = [
			wnote({ pool: "orchard", valueZat: String(3 * ZEC), status: "unspent" }),
			wnote({ pool: "orchard", valueZat: "100", status: "unspent" }),
			wnote({ pool: "orchard", valueZat: String(9 * ZEC), status: "spent" }),
		];
		const orchard = get(poolStats(bal({}), [], notes), "orchard");
		expect(orchard.largest).toBe(BigInt(3 * ZEC));
		expect(orchard.smallest).toBe(100n);
		expect(orchard.noteCount).toBe(2);
	});

	it("reports null amounts and a zero count when nothing is held", () => {
		const notes = [wnote({ pool: "orchard", status: "spent" })];
		const orchard = get(poolStats(bal({}), [], notes), "orchard");
		expect(orchard.largest).toBeNull();
		expect(orchard.smallest).toBeNull();
		expect(orchard.noteCount).toBe(0);
	});
});

describe("poolStats netFlow", () => {
	it("nets received against spent", () => {
		const notes = [
			wnote({ pool: "orchard", valueZat: String(3 * ZEC), status: "unspent" }),
			wnote({
				pool: "orchard",
				valueZat: String(2 * ZEC),
				status: "spent",
				spentHeight: 130,
			}),
		];
		expect(get(poolStats(bal({}), [], notes), "orchard").netFlow).toBe(
			BigInt(3 * ZEC),
		);
	});

	it("is zero for a pool that has cycled all its funds out", () => {
		const notes = [
			wnote({
				pool: "sapling",
				valueZat: String(5 * ZEC),
				status: "spent",
				spentHeight: 150,
			}),
		];
		expect(get(poolStats(bal({}), [], notes), "sapling").netFlow).toBe(0n);
	});
});

describe("poolStats lastActivity", () => {
	it("is the newest confirmed transaction with an output in the pool", () => {
		const txs = [
			tx({ datetime: 2000, notes: [tnote({ pool: "orchard" })] }),
			tx({ datetime: 1000, notes: [tnote({ pool: "sapling" })] }),
		];
		const stats = poolStats(bal({}), txs, []);
		expect(get(stats, "orchard").lastActivity).toBe(2000);
		expect(get(stats, "sapling").lastActivity).toBe(1000);
		expect(get(stats, "transparent").lastActivity).toBeNull();
	});

	it("ignores pending transactions", () => {
		const txs = [
			tx({ datetime: 2000, notes: [tnote({ pool: "orchard" })] }),
			tx({
				datetime: 3000,
				status: "pending",
				notes: [tnote({ pool: "orchard" })],
			}),
		];
		expect(get(poolStats(bal({}), txs, []), "orchard").lastActivity).toBe(2000);
	});
});
