import type { Persona, TxEvent } from "./wallets";

// What the fake daemon keeps on disk, where the real one keeps wallet files and
// Meta: every Wallet's identity and persona, the app settings, and any history the
// developer edited by hand. Sync progress, the chain tip, the mempool and the lock
// are runtime and are rebuilt on every start, as they are for the real daemon.

export type Condition =
  | { kind: "synced" }
  | { kind: "scanning"; done: number; seconds?: number }
  | { kind: "unreachable" }
  | { kind: "unavailable"; reason: string };

export type WalletSpec = {
  persona: Persona;
  fingerprint?: string;
  label?: string;
  indexerUri: string;
  notificationsEnabled: boolean;
  condition: Condition;
  events?: TxEvent[];
};

export type Scenario = {
  selected: string | null;
  sessionHeld: boolean;
  passphrase: string;
  fiatEnabled: boolean;
  discreet: boolean;
  keepRunning: boolean;
  usdPerZec?: number;
  wallets: WalletSpec[];
};

export const DEFAULT_INDEXER = "https://zec.rocks:443";

// One Wallet per state the UI has to draw: a long quiet history, a busy one with
// every Pool and a mempool entry, one with no label, one still in its Initial scan,
// a regtest one, one whose Indexer is down, and one whose file will not open.
export const DEFAULT_SCENARIO: Scenario = {
  selected: null,
  sessionHeld: true,
  passphrase: "pendrake",
  fiatEnabled: true,
  discreet: false,
  keepRunning: true,
  wallets: [
    {
      persona: {
        seed: "savings",
        network: "mainnet",
        pools: ["orchard", "sapling"],
        birthdayHeight: 1_700_000,
        txCount: 28,
        receiveShare: 0.85,
        typicalZat: 250_000_000,
        memoShare: 0.35,
      },
      label: "Savings",
      indexerUri: DEFAULT_INDEXER,
      notificationsEnabled: true,
      condition: { kind: "synced" },
    },
    {
      persona: {
        seed: "corner-shop",
        network: "mainnet",
        pools: ["orchard", "sapling", "transparent"],
        birthdayHeight: 2_450_000,
        txCount: 120,
        receiveShare: 0.8,
        typicalZat: 18_000_000,
        memoShare: 0.6,
        pendingTail: true,
      },
      label: "Corner shop",
      indexerUri: "https://eu.zec.rocks:443",
      notificationsEnabled: true,
      condition: { kind: "synced" },
    },
    {
      persona: {
        seed: "unlabelled",
        network: "mainnet",
        pools: ["orchard"],
        birthdayHeight: 2_900_000,
        txCount: 4,
        receiveShare: 1,
        typicalZat: 12_000_000,
        memoShare: 0.2,
      },
      indexerUri: DEFAULT_INDEXER,
      notificationsEnabled: true,
      condition: { kind: "synced" },
    },
    {
      persona: {
        seed: "cold-storage",
        network: "mainnet",
        pools: ["sapling", "orchard", "transparent"],
        birthdayHeight: 419_200,
        txCount: 9,
        receiveShare: 0.9,
        typicalZat: 1_500_000_000,
        memoShare: 0.1,
      },
      label: "Cold storage",
      indexerUri: "https://na.zec.rocks:443",
      notificationsEnabled: true,
      condition: { kind: "scanning", done: 0.37 },
    },
    {
      persona: {
        seed: "regtest-dev",
        network: "regtest",
        pools: ["orchard", "sapling", "transparent"],
        birthdayHeight: 1,
        txCount: 16,
        receiveShare: 0.6,
        typicalZat: 1_000_000_000,
        memoShare: 0.5,
      },
      label: "Regtest dev",
      indexerUri: "http://localhost:9067",
      notificationsEnabled: true,
      condition: { kind: "synced" },
    },
    {
      persona: {
        seed: "travel",
        network: "mainnet",
        pools: ["orchard"],
        birthdayHeight: 2_600_000,
        txCount: 11,
        receiveShare: 0.6,
        typicalZat: 30_000_000,
        memoShare: 0.3,
      },
      label: "Travel",
      indexerUri: "https://lwd.example.org:9067",
      notificationsEnabled: false,
      condition: { kind: "unreachable" },
    },
    {
      persona: {
        seed: "old-laptop",
        network: "mainnet",
        pools: ["sapling"],
        birthdayHeight: 1_200_000,
        txCount: 7,
        receiveShare: 0.7,
        typicalZat: 90_000_000,
        memoShare: 0.2,
      },
      label: "Old laptop",
      indexerUri: DEFAULT_INDEXER,
      notificationsEnabled: true,
      condition: {
        kind: "unavailable",
        reason:
          "could not open wallet file: unexpected end of file while reading the header",
      },
    },
  ],
};

const KEY = "pendrake.faker.scenario";

function hasStorage(): boolean {
  return typeof localStorage !== "undefined";
}

export function loadScenario(): Scenario {
  if (!hasStorage()) return DEFAULT_SCENARIO;
  const raw = localStorage.getItem(KEY);
  if (!raw) return DEFAULT_SCENARIO;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isScenario(parsed) ? parsed : DEFAULT_SCENARIO;
  } catch {
    return DEFAULT_SCENARIO;
  }
}

export function saveScenario(scenario: Scenario): void {
  if (hasStorage()) localStorage.setItem(KEY, JSON.stringify(scenario));
}

export function clearScenario(): void {
  if (hasStorage()) localStorage.removeItem(KEY);
}

// A light shape check for a pasted or stored scenario, enough to refuse a stray
// object without a schema; a field of the wrong type still fails loudly in use.
export function isScenario(v: unknown): v is Scenario {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    Array.isArray(s.wallets) &&
    s.wallets.every(
      (w) =>
        typeof w === "object" &&
        w !== null &&
        typeof (w as WalletSpec).persona === "object" &&
        typeof (w as WalletSpec).indexerUri === "string" &&
        typeof (w as WalletSpec).condition === "object",
    ) &&
    typeof s.passphrase === "string"
  );
}
