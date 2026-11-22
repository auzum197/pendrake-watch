import type {
  BatchPhase,
  BatchProgress,
  BirthdayInput,
  Network,
  ParseUfvkResult,
  Pool,
  PricePoint,
  PriceSpot,
  SyncEvent,
  SyncPhase,
  SyncStatus,
  WalletState,
  WalletSummary,
} from "../ipc";
import { priceHistory, spotFrom } from "./prices";
import { hashSeed, rng, type Rng } from "./prng";
import {
  DEFAULT_INDEXER,
  DEFAULT_SCENARIO,
  type Scenario,
  type WalletSpec,
} from "./scenario";
import {
  arrival,
  balanceOf,
  buildLedger,
  chainFor,
  confirmEvents,
  confirmedTotal,
  fakeUfvk,
  generateEvents,
  ledgerAt,
  txidOf,
  type Ledger,
  type Persona,
  type TxEvent,
} from "./wallets";

const BLOCK_SECONDS = 75;
const ARRIVAL_SECONDS = 90;
const INITIAL_SCAN_SECONDS = 480;
const IMPORT_SCAN_SECONDS = 60;
const RESCAN_SECONDS = 90;
const RESUME_SECONDS = 12;
const OUTPUTS_PER_BLOCK = 35;

type Scan = { target: number; step: number };

type FakeWallet = {
  id: string;
  spec: WalletSpec;
  events: TxEvent[];
  ledger: Ledger;
  sync: SyncStatus;
  scan: Scan | null;
};

type Args = Record<string, unknown>;

export type WalletPatch = Partial<Omit<WalletSpec, "persona" | "events">> & {
  persona?: Partial<Persona>;
};

export type AppPatch = Partial<
  Pick<
    Scenario,
    | "sessionHeld"
    | "passphrase"
    | "fiatEnabled"
    | "discreet"
    | "keepRunning"
    | "usdPerZec"
  >
>;

export function walletId(spec: WalletSpec): string {
  return spec.fingerprint ?? rng(hashSeed(spec.persona.seed)).hex(32);
}

function str(args: Args, key: string): string {
  const v = args[key];
  if (typeof v !== "string") throw `${key} must be a string`;
  return v;
}

function optStr(args: Args, key: string): string | undefined {
  const v = args[key];
  return typeof v === "string" ? v : undefined;
}

function bool(args: Args, key: string): boolean {
  const v = args[key];
  if (typeof v !== "boolean") throw `${key} must be a boolean`;
  return v;
}

function isBirthday(v: unknown): v is BirthdayInput {
  return typeof v === "object" && v !== null && "kind" in v;
}

function resolveBirthday(input: unknown, network: Network): number {
  const chain = chainFor(network);
  if (!isBirthday(input) || input.kind === "default") return chain.activation;
  const height =
    input.kind === "height" ? input.value : chain.heightAt(input.value);
  return Math.max(chain.activation, Math.floor(height));
}

// Decode by prefix alone: the fake cannot read a real key, so the fingerprint is a
// hash of the text and the pools are drawn from it. The same text always yields
// the same identity, which is all the Identity screen needs.
export function parseUfvk(ufvk: string): ParseUfvkResult {
  const key = ufvk.trim().toLowerCase();
  const network: Network | null = key.startsWith("uviewregtest1")
    ? "regtest"
    : key.startsWith("uviewtest1")
      ? "testnet"
      : key.startsWith("uview1")
        ? "mainnet"
        : null;
  if (network === null) {
    return {
      kind: "malformed",
      reason:
        "not a unified full viewing key (expected a uview1, uviewtest1 or uviewregtest1 prefix)",
    };
  }
  if (key.length < 40) {
    return {
      kind: "malformed",
      reason: "the key is too short to carry a viewing key",
    };
  }
  const r = rng(hashSeed(key));
  const fingerprint = r.hex(32);
  const pools: Pool[] = r.chance(0.5)
    ? ["orchard", "sapling", "transparent"]
    : r.chance(0.5)
      ? ["orchard", "sapling"]
      : ["orchard"];
  return { kind: "valid", network, fingerprint, pools };
}

function idle(tip: number, now: number): SyncStatus {
  return {
    state: "idle",
    syncedHeight: tip,
    chainTip: tip,
    percent: 100,
    lastSyncedAt: now,
  };
}

function scanning(
  w: FakeWallet,
  syncedHeight: number,
  tip: number,
  scan: Scan,
  phase: SyncPhase,
): SyncStatus {
  const birthday = w.spec.persona.birthdayHeight;
  const span = Math.max(1, scan.target - birthday);
  const done = Math.min(span, Math.max(0, syncedHeight - birthday));
  return {
    state: "syncing",
    syncedHeight,
    chainTip: tip,
    percent: (done / span) * 100,
    phase,
    scannedOutputs: done * OUTPUTS_PER_BLOCK,
    totalOutputs: span * OUTPUTS_PER_BLOCK,
    etaSeconds: Math.ceil((scan.target - syncedHeight) / scan.step),
  };
}

function unreachable(
  w: FakeWallet,
  syncedHeight: number,
  tip: number,
): SyncStatus {
  let host = w.spec.indexerUri;
  try {
    host = new URL(w.spec.indexerUri).host;
  } catch {
    host = w.spec.indexerUri;
  }
  return {
    state: "error",
    syncedHeight,
    chainTip: tip,
    percent: 100,
    error: `transport error: failed to connect to ${host}: Connection refused`,
    unreachable: true,
  };
}

const NEW_WALLET_SEEDS = [
  "harbour",
  "orchard-row",
  "lantern",
  "meadow",
  "quarry",
  "tidepool",
];

export class FakeDaemon {
  private wallets: FakeWallet[] = [];
  private selectedId: string | null = null;
  private locked = false;
  private sessionHeld: boolean;
  private passphrase: string;
  private fiatEnabled: boolean;
  private discreet: boolean;
  private keepRunning: boolean;
  private usdPerZec: number | undefined;
  private readonly tip: Record<Network, number>;
  private readonly history: PricePoint[];
  private spot: PriceSpot;
  private readonly arrivals: Rng = rng(hashSeed("arrivals"));
  private readonly subscribers = new Set<(ev: SyncEvent) => void>();
  private readonly watchers = new Set<() => void>();
  private readonly clock: () => number;
  private readonly persist: (scenario: Scenario) => void;
  private snapshot: Scenario | null = null;
  private seconds = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    scenario: Scenario = DEFAULT_SCENARIO,
    clock: () => number = () => Math.floor(Date.now() / 1000),
    persist: (scenario: Scenario) => void = () => {},
  ) {
    this.clock = clock;
    this.persist = persist;
    const now = clock();
    this.tip = {
      mainnet: chainFor("mainnet").heightAt(now),
      testnet: chainFor("testnet").heightAt(now),
      regtest: chainFor("regtest").heightAt(now),
    };
    this.history = priceHistory(now * 1000);
    this.spot = spotFrom(this.history[this.history.length - 1], now - 40, 0);
    this.sessionHeld = scenario.sessionHeld;
    this.passphrase = scenario.passphrase;
    this.fiatEnabled = scenario.fiatEnabled;
    this.discreet = scenario.discreet;
    this.keepRunning = scenario.keepRunning;
    this.setPrice(scenario.usdPerZec, now);
    this.wallets = scenario.wallets.map((spec) => this.build(spec, now));
    const wanted = this.wallets.find((w) => w.id === scenario.selected);
    this.selectedId =
      wanted?.id ??
      this.wallets.find((w) => w.spec.persona.seed === "corner-shop")?.id ??
      this.wallets[0]?.id ??
      null;
  }

  subscribe(fn: (ev: SyncEvent) => void): () => void {
    this.subscribers.add(fn);
    return () => {
      this.subscribers.delete(fn);
    };
  }

  // Fires after anything the editor can show has changed, from either side.
  onChange = (fn: () => void): (() => void) => {
    this.watchers.add(fn);
    return () => {
      this.watchers.delete(fn);
    };
  };

  start(): void {
    if (this.timer === null) {
      this.timer = setInterval(() => this.tick(), 1000);
    }
  }

  // One second of daemon life: scans advance, a block lands every 75s and confirms
  // what was pending, a payment arrives every 90s, and the spot price refreshes
  // every minute. Public so a test can drive the clock by hand.
  tick(): void {
    this.seconds += 1;
    const now = this.clock();
    for (const w of this.wallets) {
      if (w.scan) this.advanceScan(w, now);
    }
    if (this.seconds % BLOCK_SECONDS === 0) {
      this.newBlock("mainnet", now);
      this.newBlock("testnet", now);
      const regtestPending = this.wallets.some(
        (w) =>
          w.spec.persona.network === "regtest" &&
          w.events.some((e) => e.pending),
      );
      if (regtestPending) this.newBlock("regtest", now);
    }
    if (this.seconds % ARRIVAL_SECONDS === 30) this.deliver(now);
    if (this.seconds % 60 === 0 && this.fiatEnabled) this.refreshSpot(now);
  }

  // The persisted view: what the editor shows and localStorage keeps.
  scenario = (): Scenario => {
    this.snapshot ??= {
      selected: this.selectedId,
      sessionHeld: this.sessionHeld,
      passphrase: this.passphrase,
      fiatEnabled: this.fiatEnabled,
      discreet: this.discreet,
      keepRunning: this.keepRunning,
      usdPerZec: this.usdPerZec,
      wallets: this.wallets.map((w) => w.spec),
    };
    return this.snapshot;
  };

  isLocked = (): boolean => this.locked;

  eventsOf(id: string): TxEvent[] {
    return this.lookup(id).events;
  }

  patchApp(patch: AppPatch): void {
    if (patch.sessionHeld !== undefined) this.sessionHeld = patch.sessionHeld;
    if (patch.passphrase !== undefined) this.passphrase = patch.passphrase;
    if (patch.fiatEnabled !== undefined) this.fiatEnabled = patch.fiatEnabled;
    if (patch.discreet !== undefined) this.discreet = patch.discreet;
    if (patch.keepRunning !== undefined) this.keepRunning = patch.keepRunning;
    if ("usdPerZec" in patch) this.setPrice(patch.usdPerZec, this.clock());
    this.changed();
  }

  setLocked(locked: boolean): void {
    this.locked = locked;
    this.changed();
  }

  // Identity and persona edits rebuild the ledger from the Wallet's current events,
  // so a hand-edited history survives a change of pools or birthday. A condition
  // change restarts that Wallet's runtime sync from the chosen state.
  patchWallet(id: string, patch: WalletPatch): void {
    const w = this.lookup(id);
    const { persona, ...rest } = patch;
    w.spec = {
      ...w.spec,
      ...rest,
      persona: { ...w.spec.persona, ...persona },
    };
    if (w.spec.label !== undefined && w.spec.label.trim() === "") {
      delete w.spec.label;
    }
    this.rebuild(w, this.clock(), patch.condition !== undefined);
    this.changed();
  }

  setEvents(id: string, events: TxEvent[]): void {
    const w = this.lookup(id);
    w.spec = { ...w.spec, events };
    w.events = events;
    this.rebuild(w, this.clock(), false);
    this.changed();
  }

  regenerate(id: string): void {
    const w = this.lookup(id);
    const { events: _dropped, ...spec } = w.spec;
    w.spec = spec;
    w.events = generateEvents(w.spec.persona, this.clock());
    this.rebuild(w, this.clock(), false);
    this.changed();
  }

  addWallet(): string {
    const taken = new Set(this.wallets.map((w) => w.spec.persona.seed));
    const base =
      NEW_WALLET_SEEDS.find((s) => !taken.has(s)) ??
      `wallet-${this.wallets.length + 1}`;
    let seed = base;
    for (let n = 2; taken.has(seed); n++) seed = `${base}-${n}`;
    const spec: WalletSpec = {
      persona: {
        seed,
        network: "mainnet",
        pools: ["orchard", "sapling"],
        birthdayHeight: 2_800_000,
        txCount: 12,
        receiveShare: 0.75,
        typicalZat: 50_000_000,
        memoShare: 0.3,
      },
      indexerUri: DEFAULT_INDEXER,
      notificationsEnabled: true,
      condition: { kind: "synced" },
    };
    const w = this.build(spec, this.clock());
    this.wallets.push(w);
    this.selectedId ??= w.id;
    this.changed();
    return w.id;
  }

  deleteWallet(id: string): void {
    this.lookup(id);
    this.wallets = this.wallets.filter((w) => w.id !== id);
    if (this.selectedId === id) this.selectedId = this.wallets[0]?.id ?? null;
    this.changed();
  }

  replace(scenario: Scenario): void {
    const now = this.clock();
    this.sessionHeld = scenario.sessionHeld;
    this.passphrase = scenario.passphrase;
    this.fiatEnabled = scenario.fiatEnabled;
    this.discreet = scenario.discreet;
    this.keepRunning = scenario.keepRunning;
    this.setPrice(scenario.usdPerZec, now);
    this.wallets = scenario.wallets.map((spec) => this.build(spec, now));
    this.selectedId =
      this.wallets.find((w) => w.id === scenario.selected)?.id ??
      this.wallets[0]?.id ??
      null;
    this.changed();
  }

  reset(): void {
    this.replace(DEFAULT_SCENARIO);
  }

  call(cmd: string, args: Args): unknown {
    const now = this.clock();
    switch (cmd) {
      case "get_wallet_state":
        return this.state();
      case "list_wallets":
        return this.wallets.map((w) => this.summary(w));
      case "select_wallet":
        this.selectedId = this.lookup(str(args, "id")).id;
        this.changed();
        return this.state();
      case "set_wallet_label": {
        const w = this.lookup(str(args, "id"));
        const label = str(args, "label").trim();
        w.spec = { ...w.spec, label: label || undefined };
        this.changed();
        return this.state();
      }
      case "set_notifications": {
        const id = optStr(args, "id");
        const w = id ? this.lookup(id) : this.selected();
        w.spec = { ...w.spec, notificationsEnabled: bool(args, "enabled") };
        this.changed();
        return this.state();
      }
      case "set_indexer": {
        const w = this.selected();
        const uri = str(args, "indexerUri");
        const changed = uri !== w.spec.indexerUri;
        w.spec = { ...w.spec, indexerUri: uri };
        if (changed && w.sync.state === "error") {
          w.spec = { ...w.spec, condition: { kind: "synced" } };
          this.startScan(w, w.sync.syncedHeight, RESUME_SECONDS);
        }
        this.changed();
        return this.state();
      }
      case "set_fiat_enabled":
        this.fiatEnabled = bool(args, "enabled");
        this.changed();
        return this.state();
      case "set_discreet":
        this.discreet = bool(args, "enabled");
        this.changed();
        return this.state();
      case "get_spot_price":
        return this.fiatEnabled ? this.spot : null;
      case "get_price_history":
        return this.fiatEnabled ? this.history : [];
      case "get_addresses":
        return this.open().ledger.addresses;
      case "get_sync_status":
        return this.open().sync;
      case "get_balance": {
        const w = this.open();
        return balanceOf(this.visible(w).notes, w.spec.persona.pools);
      }
      case "get_transactions":
        return this.visible(this.open()).txs;
      case "get_transaction": {
        const txid = str(args, "txid");
        return (
          this.visible(this.open()).txs.find((t) => t.txid === txid) ?? null
        );
      }
      case "get_notes":
        return this.visible(this.open()).notes;
      case "unlock":
        this.checkPassphrase(args);
        this.locked = false;
        this.sessionHeld = true;
        this.changed();
        return this.state();
      case "lock":
        this.locked = true;
        this.changed();
        return null;
      case "verify_passphrase":
        return str(args, "passphrase") === this.passphrase;
      case "export_ufvk": {
        this.checkPassphrase(args);
        const w = this.lookup(str(args, "id"));
        return fakeUfvk(w.id, w.spec.persona.network);
      }
      case "parse_ufvk":
        return parseUfvk(str(args, "ufvk"));
      case "import_ufvk":
        return this.importUfvk(args, now);
      case "remove_wallet": {
        const id = this.lookup(str(args, "id")).id;
        this.wallets = this.wallets.filter((w) => w.id !== id);
        if (this.selectedId === id) {
          this.selectedId =
            optStr(args, "select") ?? this.wallets[0]?.id ?? null;
        }
        this.changed();
        return this.state();
      }
      case "rescan_wallet": {
        const w = this.lookup(str(args, "id"));
        this.startScan(w, w.spec.persona.birthdayHeight, RESCAN_SECONDS);
        return this.state();
      }
      case "restart_sync": {
        const id = optStr(args, "id");
        const w = id ? this.lookup(id) : this.selected();
        const reason = this.unavailableOf(w);
        if (reason) throw `this Wallet can't be restarted: ${reason}`;
        this.startScan(w, w.sync.syncedHeight, RESUME_SECONDS);
        this.changed();
        return this.state();
      }
      case "start_over":
        this.wallets = [];
        this.selectedId = null;
        this.locked = false;
        this.sessionHeld = false;
        this.passphrase = "";
        this.changed();
        return null;
      case "set_keep_running_in_background":
        this.keepRunning = bool(args, "enabled");
        this.changed();
        return null;
      case "get_keep_running_in_background":
        return this.keepRunning;
      default:
        throw `unknown command: ${cmd}`;
    }
  }

  private changed(): void {
    this.snapshot = null;
    this.persist(this.scenario());
    for (const fn of this.watchers) fn();
  }

  private setPrice(usdPerZec: number | undefined, now: number): void {
    this.usdPerZec = usdPerZec;
    const last = this.history[this.history.length - 1];
    if (usdPerZec !== undefined && usdPerZec > 0) {
      last.usdPerZec = usdPerZec;
    }
    this.spot = spotFrom(last, now, 0);
  }

  private build(spec: WalletSpec, now: number): FakeWallet {
    const tip = this.tip[spec.persona.network];
    const w: FakeWallet = {
      id: walletId(spec),
      spec,
      events: spec.events ?? generateEvents(spec.persona, now),
      ledger: { txs: [], notes: [], addresses: [] },
      sync: idle(tip, now),
      scan: null,
    };
    this.rebuild(w, now, true);
    return w;
  }

  private rebuild(w: FakeWallet, now: number, resetSync: boolean): void {
    w.ledger = buildLedger(w.spec.persona, w.events);
    if (!resetSync) return;
    const tip = this.tip[w.spec.persona.network];
    const { persona, condition } = w.spec;
    w.scan = null;
    w.sync = idle(tip, now);
    switch (condition.kind) {
      case "scanning": {
        const from =
          persona.birthdayHeight +
          Math.round((tip - persona.birthdayHeight) * condition.done);
        this.startScan(w, from, condition.seconds ?? INITIAL_SCAN_SECONDS);
        break;
      }
      case "unreachable":
        w.sync = unreachable(w, tip - 3_100, tip);
        break;
      case "unavailable":
      case "synced":
        break;
    }
  }

  private importUfvk(args: Args, now: number): WalletState {
    const parsed = parseUfvk(str(args, "ufvk"));
    if (parsed.kind === "malformed") throw `invalid UFVK: ${parsed.reason}`;
    if (args.network !== parsed.network) {
      throw `the key belongs to ${parsed.network}, not ${String(args.network)}`;
    }
    if (this.wallets.some((w) => w.id === parsed.fingerprint)) {
      throw "this key is already imported as a Wallet";
    }
    if (!this.sessionHeld) {
      const passphrase = optStr(args, "passphrase");
      if (!passphrase) throw "a passphrase is required for the first Wallet";
      this.passphrase = passphrase;
      this.sessionHeld = true;
    }
    const spec: WalletSpec = {
      persona: {
        seed: parsed.fingerprint,
        network: parsed.network,
        pools: parsed.pools,
        birthdayHeight: resolveBirthday(args.birthday, parsed.network),
        txCount: 14,
        receiveShare: 0.75,
        typicalZat: 40_000_000,
        memoShare: 0.3,
      },
      fingerprint: parsed.fingerprint,
      indexerUri: str(args, "indexerUri"),
      notificationsEnabled: true,
      condition: { kind: "scanning", done: 0, seconds: IMPORT_SCAN_SECONDS },
    };
    const w = this.build(spec, now);
    this.wallets.push(w);
    this.selectedId = w.id;
    this.locked = false;
    this.changed();
    return this.state();
  }

  private checkPassphrase(args: Args): void {
    if (str(args, "passphrase") !== this.passphrase) throw "wrong passphrase";
  }

  private lookup(id: string): FakeWallet {
    const w = this.wallets.find((x) => x.id === id);
    if (!w) throw `no Wallet with id ${id}`;
    return w;
  }

  private selected(): FakeWallet {
    if (this.selectedId === null) throw "no Wallet exists";
    return this.lookup(this.selectedId);
  }

  private unavailableOf(w: FakeWallet): string | undefined {
    return w.spec.condition.kind === "unavailable"
      ? w.spec.condition.reason
      : undefined;
  }

  private open(): FakeWallet {
    const w = this.selected();
    const reason = this.unavailableOf(w);
    if (reason) throw `Wallet is unavailable: ${reason}`;
    return w;
  }

  private visible(w: FakeWallet): Ledger {
    return ledgerAt(w.ledger, w.sync.syncedHeight);
  }

  private state(): WalletState {
    const w = this.selectedId
      ? this.wallets.find((x) => x.id === this.selectedId)
      : undefined;
    const state: WalletState = {
      exists: this.wallets.length > 0,
      locked: this.locked,
      sessionHeld: this.sessionHeld,
      fingerprint: w?.id ?? null,
      importType: "ufvk",
      viewMode: "full",
      network: w?.spec.persona.network ?? "mainnet",
      birthdayHeight: w?.spec.persona.birthdayHeight ?? 0,
      indexerUri: w?.spec.indexerUri ?? "",
      notificationsEnabled: w?.spec.notificationsEnabled ?? true,
    };
    if (w) state.walletId = w.id;
    if (w?.spec.label) state.label = w.spec.label;
    const reason = w ? this.unavailableOf(w) : undefined;
    if (reason) state.unavailable = reason;
    if (this.fiatEnabled) state.fiatEnabled = true;
    if (this.discreet) state.discreet = true;
    return state;
  }

  private summary(w: FakeWallet): WalletSummary {
    const summary: WalletSummary = {
      id: w.id,
      label: w.spec.label ?? w.id.slice(0, 8),
      fingerprint: w.id,
      network: w.spec.persona.network,
      birthdayHeight: w.spec.persona.birthdayHeight,
      selected: w.id === this.selectedId,
      lastBalance: confirmedTotal(this.visible(w).notes),
      notificationsEnabled: w.spec.notificationsEnabled,
      indexerUri: w.spec.indexerUri,
    };
    const reason = this.unavailableOf(w);
    if (reason) summary.unavailable = reason;
    else summary.sync = w.sync;
    return summary;
  }

  private startScan(w: FakeWallet, from: number, seconds: number): void {
    const tip = this.tip[w.spec.persona.network];
    w.scan = {
      target: tip,
      step: Math.max(1, Math.ceil((tip - from) / seconds)),
    };
    w.sync = scanning(w, from, tip, w.scan, "scanning");
  }

  private advanceScan(w: FakeWallet, now: number): void {
    const scan = w.scan;
    if (!scan) return;
    const tip = this.tip[w.spec.persona.network];
    const synced = Math.min(scan.target, w.sync.syncedHeight + scan.step);
    if (synced >= scan.target) {
      w.scan = null;
      w.sync = idle(tip, now);
      this.emit({ event: "finished", walletId: w.id, status: w.sync });
      return;
    }
    const phase: SyncPhase = this.seconds % 8 < 6 ? "scanning" : "committing";
    w.sync = scanning(w, synced, tip, scan, phase);
    const batch = (offset: number, batchPhase: BatchPhase): BatchProgress => {
      const start = synced + offset;
      const progress: BatchProgress = {
        id: `${w.id.slice(0, 6)}-${start}`,
        start,
        end: start + scan.step - 1,
        priority: "Historic",
        outputs: scan.step * OUTPUTS_PER_BLOCK,
        phase: batchPhase,
        phaseStartedAtMs: (now - (this.seconds % 3)) * 1000,
      };
      if (batchPhase !== "waiting") progress.expectedSecs = 3;
      return progress;
    };
    this.emit({
      event: "progress",
      walletId: w.id,
      status: w.sync,
      batches: [batch(0, phase), batch(scan.step, "waiting")],
    });
    if (this.seconds % 8 === 7) {
      this.emit({
        event: "batchDone",
        walletId: w.id,
        batch: {
          id: `${w.id.slice(0, 6)}-${synced - scan.step}`,
          start: synced - scan.step,
          end: synced - 1,
          priority: "Historic",
          outputs: scan.step * OUTPUTS_PER_BLOCK,
          timing: {
            totalSecs: 7.9,
            waitSecs: 1.1,
            fetchSecs: 0.8,
            decryptionSecs: 4.2,
            treeSecs: 0.9,
            commitSecs: 0.9,
            commit: {
              checkpoints: 0.1,
              frontiers: 0.2,
              insertTree: 0.3,
              spendFetch: 0.1,
              spendCpu: 0.1,
              cleanup: 0.05,
              other: 0.05,
            },
          },
        },
      });
    }
  }

  private newBlock(network: Network, now: number): void {
    this.tip[network] += 1;
    const tip = this.tip[network];
    for (const w of this.wallets) {
      if (w.spec.persona.network !== network || this.unavailableOf(w)) continue;
      if (w.sync.state === "idle") {
        const confirmed = confirmEvents(w.events);
        if (confirmed !== w.events) {
          w.events = confirmed;
          if (w.spec.events) w.spec.events = confirmed;
          this.rebuild(w, now, false);
        }
        w.sync = idle(tip, now);
        this.emit({ event: "finished", walletId: w.id, status: w.sync });
      } else {
        w.sync = { ...w.sync, chainTip: tip };
      }
    }
  }

  // A payment lands on the Selected Wallet when it is in Tip-follow, else on the
  // first Wallet that is, so the screen in front of the developer is the one that
  // moves. Arrivals are runtime only: they join a hand-edited history but are not
  // written back to the scenario on their own.
  private deliver(now: number): void {
    const ready = (w: FakeWallet) =>
      w.sync.state === "idle" && !this.unavailableOf(w);
    const target =
      this.wallets.find((w) => w.id === this.selectedId && ready(w)) ??
      this.wallets.find(ready);
    if (!target) return;
    const ev = arrival(target.spec.persona, this.arrivals, now);
    target.events = [...target.events, ev];
    this.rebuild(target, now, false);
    this.emit({
      event: "transaction",
      walletId: target.id,
      txid: txidOf(ev.id),
      kind: "received",
      valueZat: String(ev.valueZat),
      received: true,
    });
  }

  private refreshSpot(now: number): void {
    const wobble = (this.arrivals.next() - 0.5) * 0.008;
    this.spot = spotFrom(this.history[this.history.length - 1], now, wobble);
    this.emit({ event: "priceUpdate", spot: this.spot });
  }

  private emit(ev: SyncEvent): void {
    for (const fn of this.subscribers) fn(ev);
  }
}
