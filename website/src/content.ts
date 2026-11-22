export const LINKS = {
  download: "https://github.com/auzum197/pendrake-watch/releases",
  source: "https://github.com/auzum197/pendrake-watch",
};

export type Pool = "orchard" | "sapling" | "transparent";
export type Tx = {
  dir: "Received" | "Sent";
  amount: string;
  pool: Pool;
  txid: string;
  date: string;
  block: number;
};

export const POOL_NAME: Record<Pool, string> = {
  orchard: "Orchard",
  sapling: "Sapling",
  transparent: "Transparent",
};

export const TXS: Tx[] = [
  {
    dir: "Received",
    amount: "1.5",
    pool: "orchard",
    txid: "9f3a1c…b2e4",
    date: "Today",
    block: 2_843_112,
  },
  {
    dir: "Received",
    amount: "0.8",
    pool: "sapling",
    txid: "4d81e7…0a9c",
    date: "Today",
    block: 2_843_140,
  },
  {
    dir: "Sent",
    amount: "0.2",
    pool: "orchard",
    txid: "c07b55…71de",
    date: "Today",
    block: 2_843_166,
  },
  {
    dir: "Received",
    amount: "2.2",
    pool: "orchard",
    txid: "e2a9d0…3f18",
    date: "Today",
    block: 2_843_201,
  },
  {
    dir: "Received",
    amount: "0.65",
    pool: "transparent",
    txid: "17fc4b…9e02",
    date: "Today",
    block: 2_843_233,
  },
  {
    dir: "Sent",
    amount: "0.45",
    pool: "sapling",
    txid: "b6e03a…c4d7",
    date: "Today",
    block: 2_843_260,
  },
  {
    dir: "Received",
    amount: "1.1",
    pool: "orchard",
    txid: "5a2c8e…d410",
    date: "Today",
    block: 2_843_287,
  },
  {
    dir: "Received",
    amount: "1.8",
    pool: "orchard",
    txid: "d9b4f1…6c2a",
    date: "Today",
    block: 2_843_315,
  },
  {
    dir: "Sent",
    amount: "0.3",
    pool: "orchard",
    txid: "2e7a90…f8b3",
    date: "Today",
    block: 2_843_342,
  },
];

export const ACTIVITY: Tx[] = [
  {
    dir: "Received",
    amount: "0.75",
    pool: "sapling",
    txid: "a1b2c3…e5f6",
    date: "Oct 18",
    block: 2_842_901,
  },
  {
    dir: "Sent",
    amount: "3.14",
    pool: "orchard",
    txid: "88ab1f…22c0",
    date: "Oct 13",
    block: 2_836_410,
  },
  {
    dir: "Received",
    amount: "12",
    pool: "transparent",
    txid: "5c6d7e…9a0b",
    date: "Sep 28",
    block: 2_818_077,
  },
  {
    dir: "Received",
    amount: "2.2",
    pool: "orchard",
    txid: "0f1e2d…4b5a",
    date: "Sep 09",
    block: 2_796_344,
  },
  {
    dir: "Received",
    amount: "1.05",
    pool: "orchard",
    txid: "7a8b9c…e1f2",
    date: "Aug 21",
    block: 2_773_912,
  },
  {
    dir: "Sent",
    amount: "0.5",
    pool: "sapling",
    txid: "3e4f5a…b7c8",
    date: "Aug 02",
    block: 2_751_300,
  },
  {
    dir: "Received",
    amount: "4.2",
    pool: "orchard",
    txid: "9d0e1f…2a3b",
    date: "Jul 15",
    block: 2_729_118,
  },
  {
    dir: "Received",
    amount: "0.3",
    pool: "transparent",
    txid: "c4d5e6…7f80",
    date: "Jun 30",
    block: 2_709_402,
  },
];

export type Point = { t: number; value: number; label: string };

const STEP = 25 * 60;

const clock = (epoch: number) =>
  new Date(epoch * 1000).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const NOW = Math.floor(Date.now() / 1000 / STEP) * STEP;

const HEX = "0123456789abcdef";
const hex = (n: number) =>
  Array.from({ length: n }, () => HEX[Math.floor(Math.random() * 16)]).join("");

function pickPool(): Pool {
  const r = Math.random();
  return r < 0.55 ? "orchard" : r < 0.85 ? "sapling" : "transparent";
}

const round = (n: number) => Math.round(n * 100) / 100;

export function randomTx(block: number, balance: number, inbound = false): Tx {
  const received = inbound || Math.random() < 0.72 || balance < 2;
  const r = Math.random();
  const amount = received
    ? round(0.15 + r * r * 2.6)
    : round(0.05 + r * r * Math.min(1.1, balance * 0.12));
  return {
    dir: received ? "Received" : "Sent",
    amount: String(Math.max(0.01, amount)),
    pool: pickPool(),
    txid: `${hex(6)}…${hex(4)}`,
    date: "Today",
    block: block + 6 + Math.floor(Math.random() * 34),
  };
}

export function seedHistory(points = 16, start = 10.5): Point[] {
  let value = start;
  return Array.from({ length: points }, (_, i) => {
    if (i > 0) {
      const tx = randomTx(0, value);
      value = round(value + Number(tx.amount) * (tx.dir === "Sent" ? -1 : 1));
    }
    const t = NOW - (points - 1 - i) * STEP;
    return { t, value, label: clock(t) };
  });
}

export const HISTORY: Point[] = seedHistory();

export const clockLabel = clock;

export const FINGERPRINTS = [
  "a1b2c3d4e5f6",
  "0d9e4b2a7c61f3e8",
  "7b3f1e9c2a5d8e04",
];

export const noticeTitle = (tx: Tx) => `${tx.dir} ${tx.amount} ZEC`;
