import type {
  Balance,
  Network,
  Note,
  Pool,
  Tx,
  TxKind,
  WalletAddress,
  WalletNote,
} from "../ipc";
import { hashSeed, rng, type Rng } from "./prng";

export type Chain = {
  heightAt(secs: number): number;
  timeAt(height: number): number;
  activation: number;
};

const BLOSSOM_HEIGHT = 653_600;
const BLOSSOM_SECS = Date.UTC(2019, 11, 11) / 1000;
const SAPLING_HEIGHT = 419_200;

// Mainnet block times: 150s until Blossom, 75s after. Anchoring on Blossom lands
// both Sapling activation and today's tip within a few days of the real chain, so
// a birthday height and a transaction date agree with what a block explorer says.
const MAINNET: Chain = {
  heightAt: (secs) =>
    secs >= BLOSSOM_SECS
      ? BLOSSOM_HEIGHT + Math.floor((secs - BLOSSOM_SECS) / 75)
      : BLOSSOM_HEIGHT - Math.ceil((BLOSSOM_SECS - secs) / 150),
  timeAt: (height) =>
    height >= BLOSSOM_HEIGHT
      ? BLOSSOM_SECS + (height - BLOSSOM_HEIGHT) * 75
      : BLOSSOM_SECS - (BLOSSOM_HEIGHT - height) * 150,
  activation: SAPLING_HEIGHT,
};

const REGTEST_GENESIS_SECS = Date.UTC(2026, 0, 1) / 1000;

const REGTEST: Chain = {
  heightAt: (secs) =>
    Math.max(1, 1 + Math.floor((secs - REGTEST_GENESIS_SECS) / 600)),
  timeAt: (height) => REGTEST_GENESIS_SECS + (height - 1) * 600,
  activation: 1,
};

export function chainFor(network: Network): Chain {
  return network === "regtest" ? REGTEST : MAINNET;
}

// The shape of a Wallet's history: how long it has existed, how often it moves,
// how big a typical transfer is, and how chatty its senders are.
export type Persona = {
  seed: string;
  network: Network;
  pools: Pool[];
  birthdayHeight: number;
  txCount: number;
  receiveShare: number;
  typicalZat: number;
  memoShare: number;
  pendingTail?: boolean;
};

// One transfer as the editable unit of a Wallet's history. The ledger (txids,
// inputs, change, fees, notes) is derived from the list, so editing an event keeps
// the balance and the notes view in agreement. `pool` is where a received amount
// lands, or the recipient's receiver type for a sent one.
export type TxEvent = {
  id: string;
  kind: TxKind;
  secs: number;
  valueZat: number;
  pool: Pool;
  memo?: string;
  pending?: boolean;
};

export type Shape = Pick<Persona, "pools" | "typicalZat" | "memoShare">;

export type Identity = Pick<
  Persona,
  "seed" | "network" | "pools" | "birthdayHeight"
>;

export type Ledger = {
  txs: Tx[];
  notes: WalletNote[];
  addresses: WalletAddress[];
};

const BECH32 = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const DAY = 86_400;
const MARGINAL_FEE = 5_000;
const DUST = 10_000;

const MEMOS = [
  "Thanks for lunch",
  "Invoice 2025-031",
  "gm",
  "Rent, June",
  "Order #1042\nShip to the usual address, please.",
  "For the concert tickets",
  "Happy birthday!",
  "Refund for the double charge",
  "Monthly DCA",
  "Split of the hotel bill. Let me know if the amount is off.",
  "☕",
];

const POOL_WEIGHT: Record<Pool, number> = {
  orchard: 6,
  sapling: 3,
  transparent: 1,
  ironwood: 2,
};

const RECIPIENT_POOLS: Pool[] = ["orchard", "sapling", "transparent"];

function pickPool(r: Rng, pools: Pool[]): Pool {
  const total = pools.reduce((acc, p) => acc + POOL_WEIGHT[p], 0);
  let roll = r.next() * total;
  for (const p of pools) {
    roll -= POOL_WEIGHT[p];
    if (roll < 0) return p;
  }
  return pools[pools.length - 1];
}

// Log-normal around the persona's typical amount, rounded to a figure a person
// would type rather than a random pile of zatoshis.
function amount(r: Rng, typical: number): number {
  const raw = typical * Math.exp(0.8 * r.gaussian());
  const unit = raw >= 1e8 ? 1e6 : raw >= 1e7 ? 1e5 : 1e4;
  return Math.max(unit, Math.round(raw / unit) * unit);
}

function unifiedAddress(r: Rng, network: Network): string {
  return (network === "regtest" ? "uregtest1" : "u1") + r.chars(BECH32, 139);
}

function saplingAddress(r: Rng, network: Network): string {
  return (
    (network === "regtest" ? "zregtestsapling1" : "zs1") + r.chars(BECH32, 76)
  );
}

function transparentAddress(r: Rng, network: Network): string {
  return (network === "regtest" ? "tm" : "t1") + r.chars(BASE58, 33);
}

function recipientFor(r: Rng, pool: Pool, network: Network): string {
  switch (pool) {
    case "transparent":
      return transparentAddress(r, network);
    case "sapling":
      return saplingAddress(r, network);
    default:
      return unifiedAddress(r, network);
  }
}

export function fakeUfvk(seed: string, network: Network): string {
  const r = rng(hashSeed(`${seed}:ufvk`));
  return (
    (network === "regtest" ? "uviewregtest1" : "uview1") + r.chars(BECH32, 278)
  );
}

export function txidOf(eventId: string): string {
  return rng(hashSeed(`${eventId}:txid`)).hex(64);
}

function spread(r: Rng, count: number, from: number, to: number): number[] {
  const gaps = Array.from({ length: count }, () => -Math.log(1 - r.next()));
  const total = gaps.reduce((a, b) => a + b, 0);
  let acc = 0;
  return gaps.map((g) => {
    acc += g;
    return Math.round(from + ((to - from) * acc) / total);
  });
}

function receivedEvent(r: Rng, shape: Shape, secs: number): TxEvent {
  const pool = pickPool(r, shape.pools);
  const ev: TxEvent = {
    id: r.hex(16),
    kind: "received",
    secs,
    valueZat: amount(r, shape.typicalZat),
    pool,
  };
  if (pool !== "transparent" && r.chance(shape.memoShare)) {
    ev.memo = r.pick(MEMOS);
  }
  return ev;
}

// The persona's history up to yesterday as events, a pure function of the persona
// and the day. A spend is only drawn while the running balance can carry it, so the
// list reads like a real wallet rather than a stream of bounced payments.
export function generateEvents(persona: Persona, now: number): TxEvent[] {
  const r = rng(hashSeed(persona.seed));
  const chain = chainFor(persona.network);
  const first = chain.timeAt(persona.birthdayHeight) + r.int(3600, 14 * DAY);
  const last = Math.max(first + DAY, now - (now % DAY) - 3600);
  const events: TxEvent[] = [];
  let running = 0;
  for (const secs of spread(r, persona.txCount, first, last)) {
    const sending =
      r.chance(1 - persona.receiveShare) && running > persona.typicalZat;
    if (sending) {
      const value = Math.min(
        amount(r, persona.typicalZat * 0.8),
        Math.floor((running * 0.7) / 1e4) * 1e4,
      );
      const pool = r.pick(RECIPIENT_POOLS);
      const ev: TxEvent = {
        id: r.hex(16),
        kind: "sent",
        secs,
        valueZat: value,
        pool,
      };
      if (pool !== "transparent" && r.chance(persona.memoShare / 2)) {
        ev.memo = r.pick(MEMOS);
      }
      events.push(ev);
      running -= value + 2 * MARGINAL_FEE;
    } else {
      const ev = receivedEvent(r, persona, secs);
      events.push(ev);
      running += ev.valueZat;
    }
  }
  if (persona.pendingTail) {
    events.push({ ...receivedEvent(r, persona, now - 200), pending: true });
  }
  return events;
}

// A fresh received event landing in the mempool now.
export function arrival(shape: Shape, r: Rng, secs: number): TxEvent {
  return { ...receivedEvent(r, shape, secs), pending: true };
}

export function confirmEvents(events: TxEvent[]): TxEvent[] {
  if (!events.some((e) => e.pending)) return events;
  return events.map((e) => (e.pending ? { ...e, pending: false } : e));
}

function receive(
  r: Rng,
  ev: TxEvent,
  height: number | null,
  notes: WalletNote[],
): Tx {
  const txid = txidOf(ev.id);
  const value = ev.valueZat;
  const parts =
    value >= 2e5 && r.chance(0.12)
      ? [Math.round((value * 0.6) / 1e4) * 1e4]
      : [];
  parts.push(value - parts.reduce((a, b) => a + b, 0));
  const outs = parts.map((v, i): Note => {
    const note: Note = {
      pool: ev.pool,
      direction: "received",
      outputIndex: i,
      valueZat: String(v),
    };
    if (i === 0 && ev.memo && ev.pool !== "transparent") note.memo = ev.memo;
    notes.push({
      idx: notes.length,
      pool: ev.pool,
      valueZat: String(v),
      status: height === null ? "pending" : "unspent",
      height,
      time: height === null ? null : ev.secs,
      txid,
      change: false,
      spentHeight: null,
      spentTime: null,
    });
    return note;
  });
  const tx: Tx = {
    txid,
    datetime: ev.secs,
    kind: "received",
    valueZat: String(value),
    netZat: String(value),
    status: height === null ? "pending" : "confirmed",
    notes: outs,
  };
  if (height !== null) tx.blockHeight = height;
  return tx;
}

// A spend selects real inputs from the unspent shielded notes, largest first, pays
// the ZIP-317 fee for that many logical actions, and returns the rest as a change
// note. That is what keeps the notes view, the balance and the history agreeing:
// every zatoshi that leaves is an input the notes view shows as spent. An amount
// the Wallet cannot carry is clamped to what it can, and a spend with nothing to
// draw on is dropped.
function send(
  r: Rng,
  ev: TxEvent,
  identity: Identity,
  height: number,
  notes: WalletNote[],
): Tx | null {
  const unspent = notes
    .filter((n) => n.status === "unspent" && n.pool !== "transparent")
    .sort((a, b) => Number(b.valueZat) - Number(a.valueZat));
  const inputs: WalletNote[] = [];
  let sum = 0;
  let fee = 2 * MARGINAL_FEE;
  for (const n of unspent) {
    inputs.push(n);
    sum += Number(n.valueZat);
    fee = MARGINAL_FEE * Math.max(2, inputs.length);
    if (sum >= ev.valueZat + fee) break;
  }
  const want = Math.min(ev.valueZat, sum - fee);
  if (want < DUST) return null;
  const txid = txidOf(ev.id);
  for (const n of inputs) {
    n.status = "spent";
    n.spentHeight = height;
    n.spentTime = ev.secs;
  }
  const out: Note = {
    pool: ev.pool,
    direction: "sent",
    outputIndex: 0,
    valueZat: String(want),
    recipient: recipientFor(r, ev.pool, identity.network),
  };
  if (ev.memo && ev.pool !== "transparent") out.memo = ev.memo;
  const outs = [out];
  const change = sum - want - fee;
  if (change > 0) {
    const changePool = identity.pools.includes("orchard")
      ? "orchard"
      : (identity.pools.find((p) => p !== "transparent") ?? "orchard");
    outs.push({
      pool: changePool,
      direction: "received",
      outputIndex: 1,
      valueZat: String(change),
    });
    notes.push({
      idx: notes.length,
      pool: changePool,
      valueZat: String(change),
      status: "unspent",
      height,
      time: ev.secs,
      txid,
      change: true,
      spentHeight: null,
      spentTime: null,
    });
  }
  return {
    txid,
    datetime: ev.secs,
    blockHeight: height,
    kind: "sent",
    valueZat: String(want),
    netZat: String(-(want + fee)),
    status: "confirmed",
    notes: outs,
  };
}

// The ledger a list of events describes, newest transaction first. Heights follow
// the chain's clock so dates and blocks agree, and every derived detail (txid,
// split, recipient) is seeded by the event's id, so the same event always yields
// the same transaction.
export function buildLedger(identity: Identity, events: TxEvent[]): Ledger {
  const chain = chainFor(identity.network);
  const r = rng(hashSeed(identity.seed));
  const ua = unifiedAddress(r, identity.network);
  const address: WalletAddress = identity.pools.includes("transparent")
    ? { ua, transparent: transparentAddress(r, identity.network) }
    : { ua };
  const ordered = [...events].sort((a, b) => a.secs - b.secs);
  const txs: Tx[] = [];
  const notes: WalletNote[] = [];
  let lastHeight = identity.birthdayHeight;
  for (const ev of ordered) {
    const er = rng(hashSeed(ev.id));
    if (ev.pending) {
      if (ev.kind === "received") txs.push(receive(er, ev, null, notes));
      continue;
    }
    const height = Math.max(lastHeight + 1, chain.heightAt(ev.secs));
    lastHeight = height;
    const tx =
      ev.kind === "sent"
        ? send(er, ev, identity, height, notes)
        : receive(er, ev, height, notes);
    if (tx) txs.push(tx);
  }
  return { txs: txs.reverse(), notes, addresses: [address] };
}

// The ledger as a scan that has reached `height` would know it: later transactions
// are not found yet, and a note spent above that height still reads as unspent.
export function ledgerAt(ledger: Ledger, height: number): Ledger {
  return {
    addresses: ledger.addresses,
    txs: ledger.txs.filter(
      (tx) => tx.blockHeight === undefined || tx.blockHeight <= height,
    ),
    notes: ledger.notes
      .filter((n) => n.height === null || n.height <= height)
      .map((n): WalletNote =>
        n.spentHeight !== null && n.spentHeight > height
          ? { ...n, status: "unspent", spentHeight: null, spentTime: null }
          : n,
      ),
  };
}

export function balanceOf(notes: WalletNote[], pools: Pool[]): Balance {
  const balance: Balance = {};
  for (const pool of pools) {
    let confirmed = 0;
    let pending = 0;
    for (const n of notes) {
      if (n.pool !== pool || n.status === "spent") continue;
      if (n.status === "pending") pending += Number(n.valueZat);
      else confirmed += Number(n.valueZat);
    }
    balance[pool] = {
      confirmed: String(confirmed),
      total: String(confirmed + pending),
    };
  }
  return balance;
}

export function confirmedTotal(notes: WalletNote[]): string {
  return String(
    notes.reduce(
      (acc, n) => (n.status === "unspent" ? acc + Number(n.valueZat) : acc),
      0,
    ),
  );
}
