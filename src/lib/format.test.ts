import { describe, expect, it } from "vitest";
import { athStanding, balanceHistory, formatEta, isSynced } from "./format";
import type { BalancePoint } from "./format";
import type { Balance, SyncStatus, Tx } from "./ipc";

const ZEC = 100_000_000;

function sync(part: Partial<SyncStatus>): SyncStatus {
  return {
    state: "syncing",
    syncedHeight: 0,
    chainTip: 0,
    percent: 0,
    ...part,
  };
}

describe("isSynced", () => {
  it("is synced when the daemon reports idle", () => {
    expect(isSynced(sync({ state: "idle" }))).toBe(true);
  });

  it("is not synced when an error is set", () => {
    expect(isSynced(sync({ state: "error", percent: 100 }))).toBe(false);
  });

  it("holds synced through a tip maintenance round at 100%", () => {
    expect(
      isSynced(
        sync({ syncedHeight: 2_000_000 - 2, chainTip: 2_000_000, percent: 100 }),
      ),
    ).toBe(true);
  });

  it("is not synced when scanning has only touched the tip region", () => {
    // Priority scanning reaches the tip early, so height proximity passes while
    // most of the backlog is unscanned. Low percent must keep this "syncing".
    expect(
      isSynced(
        sync({ syncedHeight: 2_000_000, chainTip: 2_000_000, percent: 6 }),
      ),
    ).toBe(false);
  });
});

describe("formatEta", () => {
  it("has no estimate before the daemon reports a rate", () => {
    expect(formatEta(undefined)).toBeNull();
    expect(formatEta(0)).toBeNull();
  });

  it("reads under a minute, minutes, then hours", () => {
    expect(formatEta(30)).toBe("less than a minute left");
    expect(formatEta(150)).toBe("~3 min left");
    expect(formatEta(3600)).toBe("~1 hr left");
    expect(formatEta(9000)).toBe("~3 hrs left");
  });
});

describe("athStanding", () => {
  const pts = (vals: number[]): BalancePoint[] =>
    vals.map((value, i) => ({ key: String(i), t: i, value, label: "" }));

  it("is null without positive history", () => {
    expect(athStanding([])).toBeNull();
    expect(athStanding(pts([0, 0]))).toBeNull();
  });

  it("reports the percent of the peak when below it", () => {
    expect(athStanding(pts([0, 2, 1.5]))).toEqual({ pct: 75, atPeak: false });
  });

  it("reads as at-peak when the current balance is the high", () => {
    expect(athStanding(pts([0, 1, 2]))).toEqual({ pct: 100, atPeak: true });
  });
});

function tx(part: Partial<Tx>): Tx {
  return {
    txid: "t",
    datetime: 0,
    kind: "received",
    valueZat: "0",
    status: "confirmed",
    ...part,
  };
}

function orchard(zat: number): Balance {
  return { orchard: { confirmed: String(zat), total: String(zat) } };
}

describe("balanceHistory", () => {
  it("returns nothing without confirmed transactions", () => {
    expect(balanceHistory([], orchard(0))).toEqual([]);
    expect(
      balanceHistory([tx({ status: "pending", valueZat: String(ZEC) })], null),
    ).toEqual([]);
  });

  it("reconstructs the running balance, ending on the live total", () => {
    const txs = [
      tx({ datetime: 1000, kind: "received", valueZat: String(2 * ZEC) }),
      tx({ datetime: 2000, kind: "sent", valueZat: String(ZEC / 2) }),
    ];
    const points = balanceHistory(txs, orchard(1.5 * ZEC));

    expect(points.map((p) => p.value)).toEqual([0, 2, 1.5]);
    // The leading point shares the first transaction's time, so the time axis
    // starts there and steps up at it.
    expect(points.map((p) => p.t)).toEqual([1000, 1000, 2000]);
    expect(points[0].label).toBe("");
    expect(points[points.length - 1].value).toBe(1.5);
  });

  it("sorts by time and ignores pending transactions", () => {
    const txs = [
      tx({ datetime: 2000, kind: "sent", valueZat: String(ZEC / 2) }),
      tx({ datetime: 500, status: "pending", valueZat: String(9 * ZEC) }),
      tx({ datetime: 1000, kind: "received", valueZat: String(2 * ZEC) }),
    ];
    const points = balanceHistory(txs, orchard(1.5 * ZEC));

    expect(points.map((p) => p.value)).toEqual([0, 2, 1.5]);
  });
});
