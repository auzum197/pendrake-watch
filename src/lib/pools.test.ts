import { describe, expect, it } from "vitest";
import { poolHistory, poolStats } from "./pools";
import type { Balance, Note, Pool, PoolBalance, Tx, WalletNote } from "./ipc";
import type { PoolStat } from "./pools";

const ZEC = 100_000_000;

function bal(parts: Partial<Record<Pool, number>>): Balance {
  const cell = (z?: number): PoolBalance | undefined =>
    z === undefined ? undefined : { confirmed: String(z), total: String(z) };
  return {
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
    time: 1_700_000_000,
    txid: "aa",
    change: false,
    spentHeight: null,
    spentTime: null,
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
    netZat: "0",
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
      bal({ orchard: 6900, sapling: 2400, transparent: 700 }),
      [],
      [],
    );
    expect(get(stats, "orchard").share).toBeCloseTo(69);
    expect(get(stats, "sapling").share).toBeCloseTo(24);
    expect(get(stats, "transparent").share).toBeCloseTo(7);
  });

  it("is zero for every pool when the wallet is empty", () => {
    const stats = poolStats(null, [], []);
    expect(stats.map((s) => s.share)).toEqual([0, 0, 0]);
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

describe("poolHistory", () => {
  it("adds a note when it confirms and removes it when spent", () => {
    const series = poolHistory([
      wnote({
        pool: "sapling",
        valueZat: String(2 * ZEC),
        height: 100,
        time: 1_000,
        status: "spent",
        spentHeight: 300,
        spentTime: 3_000,
      }),
      wnote({
        pool: "sapling",
        valueZat: String(ZEC),
        height: 200,
        time: 2_000,
      }),
    ]);
    expect(series.map((entry) => entry.pool)).toEqual(["sapling"]);
    expect(series[0].points.map((point) => point.value)).toEqual([0, 2, 3, 1]);
    expect(series[0].points.map((point) => point.height)).toEqual([
      undefined,
      100,
      200,
      300,
    ]);
  });

  it("starts every pool at zero on a shared time axis", () => {
    const series = poolHistory([
      wnote({ pool: "orchard", valueZat: String(ZEC), time: 1_000 }),
      wnote({ pool: "ironwood", valueZat: String(ZEC), time: 9_000 }),
    ]);
    const starts = series.map((entry) => entry.points[0]);
    expect(starts.map((point) => point.value)).toEqual([0, 0]);
    expect(new Set(starts.map((point) => point.t)).size).toBe(1);
    expect(starts[0].t).toBeLessThan(1_000);
  });

  it("orders pools outer first and omits pools without notes", () => {
    const series = poolHistory([
      wnote({ pool: "transparent", valueZat: String(ZEC), time: 1_000 }),
      wnote({ pool: "ironwood", valueZat: String(ZEC), time: 2_000 }),
    ]);
    expect(series.map((entry) => entry.pool)).toEqual([
      "ironwood",
      "transparent",
    ]);
  });

  it("is empty for a wallet with no notes", () => {
    expect(poolHistory([])).toEqual([]);
  });

  it("fits every pool to a given time frame", () => {
    const series = poolHistory(
      [
        wnote({ pool: "orchard", valueZat: String(ZEC), time: 2_000 }),
        wnote({ pool: "sapling", valueZat: String(ZEC), time: 5_000 }),
      ],
      { start: 1_000, end: 9_000 },
    );
    for (const entry of series) {
      expect(entry.points[0]).toMatchObject({ t: 1_000, value: 0 });
      expect(entry.points[entry.points.length - 1]).toMatchObject({
        t: 9_000,
        value: 1,
      });
    }
  });

  it("folds moves before the frame into the starting value", () => {
    const [orchard] = poolHistory(
      [
        wnote({ pool: "orchard", valueZat: String(2 * ZEC), time: 500 }),
        wnote({ pool: "orchard", valueZat: String(ZEC), time: 5_000 }),
      ],
      { start: 1_000, end: 9_000 },
    );
    expect(orchard.points.map((point) => [point.t, point.value])).toEqual([
      [1_000, 2],
      [5_000, 3],
      [9_000, 3],
    ]);
  });
});
