import { describe, expect, it } from "vitest";
import {
  athStanding,
  balanceHistory,
  fiatSeries,
  filterRange,
  formatBlock,
  formatEta,
  isSynced,
  priceLookup,
  splitAddress,
  txHasMemo,
  txsToCsv,
} from "./format";
import type { BalancePoint } from "./format";
import type { Balance, Note, PricePoint, SyncStatus, Tx } from "./ipc";

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

  it("keeps decimals instead of rounding a tiny holding to 0%", () => {
    expect(athStanding(pts([0, 1000, 3]))).toEqual({ pct: 0.3, atPeak: false });
    expect(athStanding(pts([0, 1000, 0.04]))).toEqual({
      pct: 0.004,
      atPeak: false,
    });
  });
});

function tx(part: Partial<Tx>): Tx {
  const base: Tx = {
    txid: "t",
    datetime: 0,
    kind: "received",
    valueZat: "0",
    netZat: "0",
    status: "confirmed",
    notes: [],
    ...part,
  };
  // Default the net delta to the simple case (received +value, sent −value) so the
  // existing reconstruction tests hold; a test sets netZat explicitly to model a
  // shield or self-send, where the net change differs from the display value.
  if (part.netZat === undefined) {
    base.netZat = base.kind === "received" ? base.valueZat : `-${base.valueZat}`;
  }
  return base;
}

function note(part: Partial<Note>): Note {
  return {
    pool: "orchard",
    direction: "received",
    outputIndex: 0,
    valueZat: "0",
    ...part,
  };
}

describe("txHasMemo", () => {
  it("is false with no notes or only empty memos", () => {
    expect(txHasMemo(tx({}))).toBe(false);
    expect(txHasMemo(tx({ notes: [note({}), note({ memo: "" })] }))).toBe(false);
  });

  it("never trips on a transparent-only transaction", () => {
    expect(
      txHasMemo(tx({ notes: [note({ pool: "transparent", valueZat: "5" })] })),
    ).toBe(false);
  });

  it("is true when any note carries a memo", () => {
    expect(
      txHasMemo(tx({ notes: [note({}), note({ memo: "gm" })] })),
    ).toBe(true);
  });
});

describe("splitAddress", () => {
  it("splits a unified address at its bech32 separator", () => {
    const { prefix, head, tail } = splitAddress("u1abcdefghijklmnopqrstuvwx");
    expect(prefix).toBe("u1");
    expect(head).toBe("abcdef");
    expect(tail).toBe("stuvwx");
  });

  it("keeps the human-readable part for Sapling addresses", () => {
    expect(splitAddress("zs1qqqqqqqqqqwwwwww").prefix).toBe("zs1");
  });

  it("uses the two-char version prefix for transparent addresses", () => {
    // base58 t-addrs hold no "1" separator, so lastIndexOf would over-eat.
    const { prefix } = splitAddress("t1Xyz12345abcde67890fghij");
    expect(prefix).toBe("t1");
  });

  it("leaves a short body whole with no tail", () => {
    expect(splitAddress("u1abc")).toEqual({
      prefix: "u1",
      head: "abc",
      tail: "",
    });
  });
});

describe("formatBlock", () => {
  it("groups the height and prefixes it", () => {
    expect(formatBlock(2_345_678)).toBe("#2,345,678");
  });

  it("dashes a pending transaction with no height", () => {
    expect(formatBlock(undefined)).toBe("—");
  });
});

describe("txsToCsv", () => {
  it("emits a header and one comma-free row per transaction, newest block first", () => {
    const txs = [
      tx({
        txid: "old",
        blockHeight: 100,
        datetime: 0,
        kind: "received",
        valueZat: String(2.5 * ZEC),
      }),
      tx({
        txid: "new",
        blockHeight: 200,
        datetime: 60,
        kind: "sent",
        valueZat: String(ZEC / 2),
      }),
    ];
    const lines = txsToCsv(txs).split("\n");

    expect(lines[0]).toBe("Block,Date,Type,Status,Amount (ZEC),Txid");
    // Block 200 sorts above 100, and the plain amount carries no thousands grouping
    // so no cell smuggles in a comma.
    expect(lines[1]).toBe(
      "200,1970-01-01T00:01:00.000Z,sent,confirmed,0.5,new",
    );
    expect(lines[2]).toBe(
      "100,1970-01-01T00:00:00.000Z,received,confirmed,2.5,old",
    );
    expect(lines.every((l) => l.split(",").length === 6)).toBe(true);
  });

  it("leaves the block cell empty for a pending transaction", () => {
    const csv = txsToCsv([
      tx({ txid: "p", status: "pending", valueZat: String(ZEC) }),
    ]);
    expect(csv.split("\n")[1]).toBe(
      ",1970-01-01T00:00:00.000Z,received,pending,1,p",
    );
  });
});

function orchard(zat: number): Balance {
  return { orchard: { confirmed: String(zat), total: String(zat) } };
}

describe("balanceHistory", () => {
  describe("filtering and ordering", () => {
    it("returns nothing without confirmed transactions", () => {
      expect(balanceHistory([], orchard(0))).toEqual([]);
      expect(
        balanceHistory([tx({ status: "pending", valueZat: String(ZEC) })], null),
      ).toEqual([]);
    });

    it("sorts by time and ignores pending transactions", () => {
      const txs = [
        tx({ datetime: 2000, kind: "sent", valueZat: String(ZEC / 2) }),
        tx({ datetime: 500, status: "pending", valueZat: String(9 * ZEC) }),
        tx({ datetime: 1000, kind: "received", valueZat: String(2 * ZEC) }),
      ];
      expect(balanceHistory(txs, orchard(1.5 * ZEC)).map((p) => p.value)).toEqual([
        0, 2, 1.5,
      ]);
    });
  });

  describe("reconstruction from net deltas", () => {
    it("reconstructs the running balance, ending on the live total", () => {
      const txs = [
        tx({ datetime: 1000, kind: "received", valueZat: String(2 * ZEC) }),
        tx({ datetime: 2000, kind: "sent", valueZat: String(ZEC / 2) }),
      ];
      const points = balanceHistory(txs, orchard(1.5 * ZEC));

      expect(points.map((p) => p.value)).toEqual([0, 2, 1.5]);
      expect(points[points.length - 1].value).toBe(1.5);
    });

    it("climbs cumulatively through a run of receives", () => {
      const txs = [
        tx({ datetime: 1000, kind: "received", valueZat: String(ZEC) }),
        tx({ datetime: 2000, kind: "received", valueZat: String(2 * ZEC) }),
        tx({ datetime: 3000, kind: "received", valueZat: String(3 * ZEC) }),
      ];
      expect(balanceHistory(txs, orchard(6 * ZEC)).map((p) => p.value)).toEqual([
        0, 1, 3, 6,
      ]);
    });

    it("tracks the net change, not a shield's display value", () => {
      // A shield is kind=sent with a large display value but a ~zero balance change
      // (only the fee leaves). Reconstructing against netZat must not subtract the
      // shielded amount, which is what produced the phantom starting balance.
      const txs = [
        tx({
          datetime: 1000,
          kind: "received",
          valueZat: String(10 * ZEC),
          netZat: String(10 * ZEC),
        }),
        tx({ datetime: 2000, kind: "sent", valueZat: String(8 * ZEC), netZat: "0" }),
      ];
      // Climbs to 10 and holds, not dropping to 2 as the display value implies.
      expect(balanceHistory(txs, orchard(10 * ZEC)).map((p) => p.value)).toEqual([
        0, 10, 10,
      ]);
    });

    it("charges a self-send only its fee, not its display value", () => {
      const txs = [
        tx({
          datetime: 1000,
          kind: "received",
          valueZat: String(5 * ZEC),
          netZat: String(5 * ZEC),
        }),
        // 3 ZEC moved to self; only the 0.0001 ZEC fee leaves the wallet.
        tx({ datetime: 2000, kind: "sent", valueZat: String(3 * ZEC), netZat: "-10000" }),
      ];
      expect(
        balanceHistory(txs, orchard(5 * ZEC - 10000)).map((p) => p.value),
      ).toEqual([0, 5, 4.9999]);
    });

    it("falls back to the signed display value when netZat is absent", () => {
      // A daemon predating netZat omits the field; the chart must still render off
      // valueZat instead of throwing on BigInt(undefined).
      const txs: Tx[] = [
        {
          txid: "a",
          datetime: 1000,
          kind: "received",
          valueZat: String(2 * ZEC),
          status: "confirmed",
          notes: [],
        },
        {
          txid: "b",
          datetime: 2000,
          kind: "sent",
          valueZat: String(ZEC),
          status: "confirmed",
          notes: [],
        },
      ];
      expect(balanceHistory(txs, orchard(ZEC)).map((p) => p.value)).toEqual([0, 2, 1]);
    });
  });

  describe("anchoring on the live balance", () => {
    it("ends the curve exactly on the headline balance", () => {
      // The newest point equals the headline total regardless of how the per-tx
      // values add up; earlier points are that total minus each later transaction.
      const txs = [
        tx({ datetime: 1000, kind: "received", valueZat: String(3 * ZEC) }),
        tx({ datetime: 2000, kind: "sent", valueZat: String(ZEC) }),
      ];
      const points = balanceHistory(txs, orchard(2 * ZEC));

      expect(points[points.length - 1].value).toBe(2);
      expect(points.map((p) => p.value)).toEqual([0, 3, 2]);
    });

    it("surfaces the implied pre-history balance when txs don't reconcile", () => {
      // When the visible transactions spend more than they receive (e.g. a watch-only
      // scan missing early receives), anchoring on the real balance makes the leading
      // point show the balance the wallet must have held before the first visible tx.
      // The chart can't invent the missing history.
      const txs = [
        tx({
          datetime: 1000,
          kind: "sent",
          valueZat: String(5 * ZEC),
          netZat: String(-5 * ZEC),
        }),
      ];
      // Balance 2, one send of 5 → implied start of 7 (2 − (−5)).
      expect(balanceHistory(txs, orchard(2 * ZEC)).map((p) => p.value)).toEqual([7, 2]);
    });
  });

  describe("flooring at zero", () => {
    it("floors intermediate points instead of going negative", () => {
      // A low live balance against larger receives makes the backward walk dip below
      // zero; those points floor rather than render a negative balance.
      const txs = [
        tx({ datetime: 1000, kind: "received", valueZat: String(ZEC) }),
        tx({ datetime: 2000, kind: "received", valueZat: String(3 * ZEC) }),
      ];
      expect(balanceHistory(txs, orchard(ZEC)).map((p) => p.value)).toEqual([0, 0, 1]);
    });
  });

  describe("leading runway point", () => {
    it("opens with a flat run sized to 7% of the time span", () => {
      const txs = [
        tx({ datetime: 1000, kind: "received", valueZat: String(2 * ZEC) }),
        tx({ datetime: 2000, kind: "sent", valueZat: String(ZEC / 2) }),
      ];
      const points = balanceHistory(txs, orchard(1.5 * ZEC));

      expect(points.map((p) => p.t)).toEqual([930, 1000, 2000]);
      expect(points[0].key).toBe("start");
      expect(points[0].label).toBe("");
    });

    it("falls back to a day before a lone transaction (no span to scale)", () => {
      const txs = [
        tx({ datetime: 1000, kind: "received", valueZat: String(2 * ZEC) }),
      ];
      const points = balanceHistory(txs, orchard(2 * ZEC));

      expect(points.map((p) => p.value)).toEqual([0, 2]);
      expect(points.map((p) => p.t)).toEqual([1000 - 86_400, 1000]);
    });

    it("falls back to a day when every transaction shares a timestamp", () => {
      const txs = [
        tx({ datetime: 1000, kind: "received", valueZat: String(ZEC) }),
        tx({ datetime: 1000, kind: "received", valueZat: String(ZEC) }),
      ];
      expect(balanceHistory(txs, orchard(2 * ZEC)).map((p) => p.t)).toEqual([
        1000 - 86_400, 1000, 1000,
      ]);
    });

    it("sizes the margin off the span, not point density", () => {
      // Three receives packed 10s apart, then one far later. A margin sized off the
      // gap between adjacent points would all but vanish; the span keeps it visible.
      const txs = [
        tx({ datetime: 1000, kind: "received", valueZat: String(ZEC) }),
        tx({ datetime: 1010, kind: "received", valueZat: String(ZEC) }),
        tx({ datetime: 1020, kind: "received", valueZat: String(ZEC) }),
        tx({ datetime: 11000, kind: "received", valueZat: String(ZEC) }),
      ];
      const points = balanceHistory(txs, orchard(4 * ZEC));

      expect(points[0].t).toBe(1000 - Math.round((11000 - 1000) * 0.07));
    });
  });

  describe("point identity and labels", () => {
    it("keys transaction points by txid and the leading point as start", () => {
      const txs = [
        tx({ txid: "abc", datetime: 1000, kind: "received", valueZat: String(ZEC) }),
      ];
      expect(balanceHistory(txs, orchard(ZEC)).map((p) => p.key)).toEqual([
        "start",
        "abc",
      ]);
    });

    it("carries block height on transaction points but not the leading point", () => {
      const txs = [
        tx({
          datetime: 1000,
          kind: "received",
          valueZat: String(ZEC),
          blockHeight: 2_500_000,
        }),
      ];
      const points = balanceHistory(txs, orchard(ZEC));

      expect(points[0].height).toBeUndefined();
      expect(points[1].height).toBe(2_500_000);
      expect(points[1].label).not.toBe("");
    });
  });
});

describe("filterRange", () => {
  const nowSec = Math.floor(Date.now() / 1000);
  const DAY = 86_400;
  const pt = (key: string, daysAgo: number, value: number): BalancePoint => ({
    key,
    t: nowSec - daysAgo * DAY,
    value,
    label: "",
  });

  it("passes the full series through for 'all'", () => {
    const pts = [pt("start", 100, 0), pt("a", 50, 1), pt("b", 1, 2)];
    expect(filterRange(pts, "all")).toBe(pts);
  });

  it("returns empty input untouched", () => {
    expect(filterRange([], "week")).toEqual([]);
  });

  it("clips to the window and opens at the entering balance", () => {
    const pts = [pt("start", 100, 0), pt("a", 30, 5), pt("b", 2, 8)];
    const out = filterRange(pts, "week");
    expect(out[0].key).toBe("range-start");
    expect(out[0].value).toBe(5);
    expect(out.slice(1).map((p) => p.key)).toEqual(["b"]);
  });

  it("draws a flat line when nothing lands in the window", () => {
    const pts = [pt("start", 100, 0), pt("a", 30, 7)];
    const out = filterRange(pts, "week");
    expect(out).toHaveLength(2);
    expect(out.map((p) => p.key)).toEqual(["range-start", "range-now"]);
    expect(out.every((p) => p.value === 7)).toBe(true);
  });

  it("returns the full series when the window reaches past all history", () => {
    const pts = [pt("start", 3, 0), pt("a", 2, 4), pt("b", 1, 6)];
    expect(filterRange(pts, "year")).toBe(pts);
  });
});

// Days as unix seconds, matching the daemon's balance/point time unit.
const daySec = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / 1000);

function price(date: string, usd: number): PricePoint {
  return { date, usdPerZec: usd, confidence: "high" };
}

describe("priceLookup", () => {
  const prices = [
    price("2024-01-01", 30),
    price("2024-01-03", 50),
  ];

  it("returns null for an empty series", () => {
    expect(priceLookup([])(daySec("2024-01-01"))).toBeNull();
  });

  it("holds the earliest price for instants before coverage", () => {
    expect(priceLookup(prices)(daySec("2023-06-01"))).toBe(30);
  });

  it("carries the last known price forward across a gap", () => {
    // No 2024-01-02 mark, so it reads the prior day's price.
    expect(priceLookup(prices)(daySec("2024-01-02"))).toBe(30);
    expect(priceLookup(prices)(daySec("2024-01-05"))).toBe(50);
  });

  it("accepts millisecond instants too", () => {
    expect(priceLookup(prices)(Date.parse("2024-01-03T00:00:00Z"))).toBe(50);
  });
});

describe("fiatSeries", () => {
  const prices = [
    price("2024-01-01", 30),
    price("2024-01-02", 40),
    price("2024-01-03", 50),
  ];
  const nowMs = Date.parse("2024-01-03T12:00:00Z");

  it("is empty when either input is empty (falls back to ZEC)", () => {
    const bal = [{ key: "start", t: daySec("2024-01-01"), value: 2, label: "" }];
    expect(fiatSeries(bal, [], null, "all", nowMs)).toEqual([]);
    expect(fiatSeries([], prices, null, "all", nowMs)).toEqual([]);
  });

  it("waves with the price while the balance holds flat", () => {
    // A constant 2 ZEC balance across a rising price must trace the price, not a flat
    // line. Interpolated between the daily marks, the value sweeps 60 -> 100 continuously,
    // so there are many distinct values, all within balance (2) times the price range.
    const bal = [
      { key: "start", t: daySec("2024-01-01"), value: 2, label: "" },
      { key: "t1", t: daySec("2024-01-01"), value: 2, label: "" },
    ];
    const out = fiatSeries(bal, prices, 50, "all", nowMs);
    const values = out.map((p) => p.value);
    expect(new Set(values).size).toBeGreaterThan(5);
    expect(Math.min(...values)).toBeGreaterThanOrEqual(60);
    expect(Math.max(...values)).toBeLessThanOrEqual(100);
    // The curve actually moves rather than holding one value.
    expect(Math.max(...values)).toBeGreaterThan(Math.min(...values));
  });

  it("gives a continuous hover: a value and its ZEC balance at points between changes", () => {
    const bal = [
      { key: "start", t: daySec("2024-01-01"), value: 2, label: "" },
      { key: "t1", t: daySec("2024-01-01"), value: 2, label: "" },
    ];
    const out = fiatSeries(bal, prices, 50, "all", nowMs);
    // Dense enough that hover lands anywhere, and every sample carries its ZEC balance.
    expect(out.length).toBeGreaterThan(100);
    expect(out.every((p) => p.zec === 2)).toBe(true);
  });

  it("drops a sharp step flagged for a dot at a balance change", () => {
    // A receive on 2024-01-02 (price 40) jumps the balance 0 -> 3. The step must be
    // vertical: two points at the same instant carrying old*price and new*price, and only
    // the new one is flagged as a change (the point that gets a dot).
    const bal = [
      { key: "start", t: daySec("2024-01-01"), value: 0, label: "" },
      { key: "t1", t: daySec("2024-01-02"), value: 3, label: "" },
    ];
    const out = fiatSeries(bal, prices, 50, "all", nowMs);
    const change = out.find((p) => p.change);
    // jump is the USD size of the step (|3 - 0| * 40), which the chart tests against the
    // axis peak to decide whether the change is big enough to dot.
    expect(change).toMatchObject({ value: 120, zec: 3, jump: 120 });
    const pre = out.find((p) => p.key === "t1:pre");
    expect(pre).toMatchObject({ value: 0, zec: 0 }); // 0 * 40
  });

  it("windows to the selected Span", () => {
    // A year of flat balance, asking for the last week, keeps only ~week of samples.
    const bal = [
      { key: "start", t: daySec("2023-01-01"), value: 1, label: "" },
      { key: "t1", t: daySec("2023-01-01"), value: 1, label: "" },
    ];
    const yearPrices = [price("2023-01-01", 30), price("2024-01-03", 50)];
    const week = fiatSeries(bal, yearPrices, 50, "week", nowMs);
    const span = week[week.length - 1].t - week[0].t;
    // Seconds in the series' unit: a week (plus a sample's slack), not a year.
    expect(span).toBeLessThanOrEqual(8 * 86_400);
  });
});
