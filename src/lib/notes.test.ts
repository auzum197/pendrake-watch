import { describe, expect, it } from "vitest";
import { matchesFilter, matchesSearch, sortNotes, sumSpendable } from "./notes";
import type { WalletNote } from "./ipc";

const ZEC = 100_000_000;

function note(part: Partial<WalletNote>): WalletNote {
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

const idxOrder = (notes: WalletNote[]) => notes.map((n) => n.idx);

describe("sortNotes by height", () => {
  it("puts null heights last when ascending", () => {
    const notes = [
      note({ idx: 0, height: null }),
      note({ idx: 1, height: 200 }),
      note({ idx: 2, height: 100 }),
    ];
    const sorted = sortNotes(notes, { key: "height", dir: "asc" });
    expect(idxOrder(sorted)).toEqual([2, 1, 0]);
  });

  it("puts null heights first when descending", () => {
    const notes = [
      note({ idx: 0, height: 100 }),
      note({ idx: 1, height: null }),
      note({ idx: 2, height: 200 }),
    ];
    const sorted = sortNotes(notes, { key: "height", dir: "desc" });
    expect(idxOrder(sorted)).toEqual([1, 2, 0]);
  });

  it("breaks ties by idx so equal heights keep a stable order", () => {
    const notes = [
      note({ idx: 2, height: 100 }),
      note({ idx: 0, height: 100 }),
      note({ idx: 1, height: 100 }),
    ];
    const sorted = sortNotes(notes, { key: "height", dir: "desc" });
    expect(idxOrder(sorted)).toEqual([0, 1, 2]);
  });

  it("orders Spent-at nulls to the bottom ascending", () => {
    const notes = [
      note({ idx: 0, spentHeight: null }),
      note({ idx: 1, spentHeight: 50 }),
    ];
    const sorted = sortNotes(notes, { key: "spentHeight", dir: "asc" });
    expect(idxOrder(sorted)).toEqual([1, 0]);
  });
});

describe("sortNotes by value", () => {
  it("compares as integers, not lexically, beyond Number precision", () => {
    // Two values that share a numeric-string prefix but differ in the last digit,
    // large enough that a float compare would lose the difference.
    const notes = [
      note({ idx: 0, valueZat: "90071992547409930" }),
      note({ idx: 1, valueZat: "90071992547409920" }),
    ];
    const asc = sortNotes(notes, { key: "value", dir: "asc" });
    expect(idxOrder(asc)).toEqual([1, 0]);
  });

  it("reverses on descending", () => {
    const notes = [
      note({ idx: 0, valueZat: String(1 * ZEC) }),
      note({ idx: 1, valueZat: String(3 * ZEC) }),
      note({ idx: 2, valueZat: String(2 * ZEC) }),
    ];
    const sorted = sortNotes(notes, { key: "value", dir: "desc" });
    expect(idxOrder(sorted)).toEqual([1, 2, 0]);
  });
});

describe("matchesFilter", () => {
  it("keeps everything under 'all'", () => {
    expect(matchesFilter(note({ status: "spent" }), "all")).toBe(true);
  });

  it("matches a status filter against the note status", () => {
    expect(matchesFilter(note({ status: "spent" }), "spent")).toBe(true);
    expect(matchesFilter(note({ status: "unspent" }), "spent")).toBe(false);
  });

  it("'change' keeps only change notes", () => {
    expect(matchesFilter(note({ change: true }), "change")).toBe(true);
    expect(matchesFilter(note({ change: false }), "change")).toBe(false);
  });

  it("a pool filter keeps only that pool", () => {
    expect(matchesFilter(note({ pool: "sapling" }), "sapling")).toBe(true);
    expect(matchesFilter(note({ pool: "orchard" }), "sapling")).toBe(false);
  });
});

describe("matchesSearch", () => {
  it("matches an empty query", () => {
    expect(matchesSearch(note({}), "")).toBe(true);
  });

  it("matches a txid substring, case-insensitively", () => {
    expect(matchesSearch(note({ txid: "A3F8C2D901" }), "f8c2")).toBe(true);
  });

  it("matches a block height", () => {
    expect(matchesSearch(note({ height: 2453001 }), "2453001")).toBe(true);
  });

  it("matches the spent-at height", () => {
    expect(matchesSearch(note({ spentHeight: 2460000 }), "2460000")).toBe(true);
  });

  it("matches the rendered ZEC value", () => {
    // 1.5 ZEC renders "1.50000000", so "1.5" should find it.
    expect(matchesSearch(note({ valueZat: String(1.5 * ZEC) }), "1.5")).toBe(
      true,
    );
  });

  it("rejects a query that matches nothing", () => {
    expect(matchesSearch(note({ txid: "aa", height: 100 }), "zzz")).toBe(false);
  });
});

describe("sumSpendable", () => {
  const notes = [
    note({ pool: "orchard", status: "unspent", valueZat: String(2 * ZEC) }),
    note({ pool: "sapling", status: "unspent", valueZat: String(3 * ZEC) }),
    note({ pool: "orchard", status: "spent", valueZat: String(5 * ZEC) }),
    note({ pool: "orchard", status: "pending", valueZat: String(7 * ZEC) }),
  ];

  it("sums only unspent notes, ignoring spent and pending", () => {
    const { zat, count } = sumSpendable(notes);
    expect(zat).toBe(BigInt(5 * ZEC));
    expect(count).toBe(2);
  });

  it("narrows to one pool when given one", () => {
    const { zat, count } = sumSpendable(notes, "orchard");
    expect(zat).toBe(BigInt(2 * ZEC));
    expect(count).toBe(1);
  });

  it("is zero over an empty set", () => {
    expect(sumSpendable([])).toEqual({ zat: 0n, count: 0 });
  });
});
