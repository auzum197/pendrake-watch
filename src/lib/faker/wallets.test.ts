import { describe, expect, it } from "vitest";
import {
  balanceOf,
  buildLedger,
  chainFor,
  confirmEvents,
  generateEvents,
  ledgerAt,
  txidOf,
  type Ledger,
  type Persona,
  type TxEvent,
} from "./wallets";

const NOW = Date.UTC(2026, 9, 7, 12) / 1000;

const persona: Persona = {
  seed: "test",
  network: "mainnet",
  pools: ["orchard", "sapling", "transparent"],
  birthdayHeight: 2_450_000,
  txCount: 80,
  receiveShare: 0.7,
  typicalZat: 20_000_000,
  memoShare: 0.4,
  pendingTail: true,
};

const sumNet = (ledger: Ledger, upTo = Number.POSITIVE_INFINITY) =>
  ledger.txs
    .filter((t) => t.status === "confirmed" && (t.blockHeight ?? 0) <= upTo)
    .reduce((acc, t) => acc + Number(t.netZat), 0);

const sumConfirmed = (ledger: Ledger) =>
  Object.values(balanceOf(ledger.notes, persona.pools)).reduce(
    (acc, p) => acc + Number(p.confirmed),
    0,
  );

describe("generateEvents", () => {
  const events = generateEvents(persona, NOW);

  it("is a pure function of the persona and the day", () => {
    expect(generateEvents(persona, NOW)).toEqual(events);
    expect(generateEvents({ ...persona, seed: "other" }, NOW)).not.toEqual(
      events,
    );
  });

  it("mixes received and sent and ends on the pending tail", () => {
    expect(events).toHaveLength(persona.txCount + 1);
    expect(events[events.length - 1].pending).toBe(true);
    expect(events.filter((e) => e.kind === "sent").length).toBeGreaterThan(5);
    expect(events.filter((e) => e.kind === "received").length).toBeGreaterThan(
      40,
    );
  });
});

describe("buildLedger", () => {
  const events = generateEvents(persona, NOW);
  const ledger = buildLedger(persona, events);

  it("derives the same ledger from the same events", () => {
    expect(buildLedger(persona, events)).toEqual(ledger);
    expect(ledger.txs[0].txid).toBe(txidOf(events[events.length - 1].id));
  });

  it("keeps heights climbing with time and within the chain", () => {
    const confirmed = [...ledger.txs]
      .filter((t) => t.status === "confirmed")
      .sort((a, b) => a.datetime - b.datetime);
    const chain = chainFor("mainnet");
    for (let i = 1; i < confirmed.length; i++) {
      expect(confirmed[i].blockHeight).toBeGreaterThan(
        confirmed[i - 1].blockHeight ?? 0,
      );
    }
    expect(confirmed[0].blockHeight).toBeGreaterThan(persona.birthdayHeight);
    expect(confirmed[confirmed.length - 1].blockHeight).toBeLessThanOrEqual(
      chain.heightAt(NOW),
    );
  });

  it("nets every confirmed transaction into the unspent notes", () => {
    expect(sumConfirmed(ledger)).toBe(sumNet(ledger));
    const pendingValue = Number(ledger.txs[0].valueZat);
    const totals = Object.values(balanceOf(ledger.notes, persona.pools)).reduce(
      (acc, p) => acc + Number(p.total),
      0,
    );
    expect(totals - sumConfirmed(ledger)).toBe(pendingValue);
  });

  it("ties every note to a transaction and every spend to a later send", () => {
    const byId = new Map(ledger.txs.map((t) => [t.txid, t]));
    for (const note of ledger.notes) {
      expect(byId.get(note.txid)).toBeDefined();
      if (note.spentHeight !== null) {
        const spender = ledger.txs.find(
          (t) => t.kind === "sent" && t.blockHeight === note.spentHeight,
        );
        expect(spender).toBeDefined();
        expect(note.spentHeight).toBeGreaterThan(note.height ?? 0);
      }
    }
  });

  it("charges a sent transaction its inputs minus the change", () => {
    for (const tx of ledger.txs.filter((t) => t.kind === "sent")) {
      const inputs = ledger.notes
        .filter((n) => n.spentHeight === tx.blockHeight)
        .reduce((acc, n) => acc + Number(n.valueZat), 0);
      const change = tx.notes
        .filter((n) => n.direction === "received")
        .reduce((acc, n) => acc + Number(n.valueZat), 0);
      expect(Number(tx.netZat)).toBe(-(inputs - change));
      expect(Number(tx.netZat)).toBeLessThan(-Number(tx.valueZat));
    }
  });

  it("clamps a spend above the balance and drops one with nothing to draw on", () => {
    const edited: TxEvent[] = [
      {
        id: "a",
        kind: "sent",
        secs: NOW - 5 * 86_400,
        valueZat: 1e8,
        pool: "orchard",
      },
      {
        id: "b",
        kind: "received",
        secs: NOW - 4 * 86_400,
        valueZat: 3e7,
        pool: "orchard",
      },
      {
        id: "c",
        kind: "sent",
        secs: NOW - 3 * 86_400,
        valueZat: 1e9,
        pool: "sapling",
      },
    ];
    const built = buildLedger(persona, edited);
    expect(built.txs.map((t) => t.kind)).toEqual(["sent", "received"]);
    const spend = built.txs[0];
    expect(Number(spend.valueZat)).toBe(3e7 - 10_000);
    expect(sumConfirmed(built)).toBe(0);
  });

  it("carries an edited memo and pool through to the notes", () => {
    const edited: TxEvent[] = [
      {
        id: "m",
        kind: "received",
        secs: NOW - 86_400,
        valueZat: 5e6,
        pool: "sapling",
        memo: "edited by hand",
      },
    ];
    const built = buildLedger(persona, edited);
    expect(built.txs[0].notes[0]).toMatchObject({
      pool: "sapling",
      memo: "edited by hand",
    });
    expect(built.notes.every((n) => n.pool === "sapling")).toBe(true);
  });
});

describe("ledgerAt", () => {
  const ledger = buildLedger(persona, generateEvents(persona, NOW));
  const heights = ledger.txs
    .filter((t) => t.status === "confirmed")
    .map((t) => t.blockHeight ?? 0)
    .sort((a, b) => a - b);
  const cut = heights[Math.floor(heights.length / 2)];
  const partial = ledgerAt(ledger, cut);

  it("hides what a scan has not reached and keeps the mempool", () => {
    expect(partial.txs.every((t) => (t.blockHeight ?? 0) <= cut)).toBe(true);
    expect(partial.txs.some((t) => t.status === "pending")).toBe(true);
    expect(partial.txs.length).toBeLessThan(ledger.txs.length);
  });

  it("reads a note spent above the cut as still unspent", () => {
    expect(
      partial.notes.every(
        (n) => n.spentHeight === null || n.spentHeight <= cut,
      ),
    ).toBe(true);
    expect(sumConfirmed(partial)).toBe(sumNet(ledger, cut));
  });
});

describe("confirmEvents", () => {
  it("lands every pending event and leaves a settled list untouched", () => {
    const events = generateEvents(persona, NOW);
    const landed = confirmEvents(events);
    expect(landed.every((e) => !e.pending)).toBe(true);
    expect(
      buildLedger(persona, landed).txs.every((t) => t.status === "confirmed"),
    ).toBe(true);
    expect(confirmEvents(landed)).toBe(landed);
  });
});
