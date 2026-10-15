import { describe, expect, it } from "vitest";
import type { SyncEvent, Tx, WalletState, WalletSummary } from "../ipc";
import { FakeDaemon, parseUfvk, walletId } from "./daemon";
import { DEFAULT_SCENARIO, type Scenario } from "./scenario";

const START = Date.UTC(2026, 9, 7, 12) / 1000;
const PASSPHRASE = DEFAULT_SCENARIO.passphrase;

const last = (saved: Scenario[]) => saved[saved.length - 1];

function boot(scenario: Scenario = DEFAULT_SCENARIO) {
  let now = START;
  const saved: Scenario[] = [];
  const daemon = new FakeDaemon(
    scenario,
    () => now,
    (s) => saved.push(s),
  );
  const events: SyncEvent[] = [];
  daemon.subscribe((ev) => events.push(ev));
  const run = (seconds: number) => {
    for (let i = 0; i < seconds; i++) {
      now += 1;
      daemon.tick();
    }
  };
  const wallets = () => daemon.call("list_wallets", {}) as WalletSummary[];
  const state = () => daemon.call("get_wallet_state", {}) as WalletState;
  const txs = () => daemon.call("get_transactions", {}) as Tx[];
  const byLabel = (label: string) => {
    const w = wallets().find((x) => x.label === label);
    if (!w) throw new Error(`no wallet ${label}`);
    return w;
  };
  return { daemon, events, saved, run, wallets, state, txs, byLabel };
}

describe("FakeDaemon", () => {
  it("seeds one Wallet per state the UI draws", () => {
    const { wallets, state } = boot();
    const all = wallets();
    expect(all).toHaveLength(7);
    expect(all.filter((w) => w.unavailable)).toHaveLength(1);
    expect(all.filter((w) => w.sync?.state === "error")).toHaveLength(1);
    expect(all.filter((w) => w.sync?.state === "syncing")).toHaveLength(1);
    expect(all.filter((w) => w.network === "regtest")).toHaveLength(1);
    expect(all.filter((w) => w.selected)).toHaveLength(1);
    expect(state()).toMatchObject({
      exists: true,
      locked: false,
      sessionHeld: true,
      label: "Corner shop",
      fiatEnabled: true,
    });
  });

  it("holds the passphrase for unlock, verify and the UFVK reveal", () => {
    const { daemon, state } = boot();
    daemon.call("lock", {});
    expect(state().locked).toBe(true);
    expect(() => daemon.call("unlock", { passphrase: "nope" })).toThrow();
    expect(daemon.call("verify_passphrase", { passphrase: "nope" })).toBe(
      false,
    );
    daemon.call("unlock", { passphrase: PASSPHRASE });
    expect(state().locked).toBe(false);
    const id = state().walletId;
    const ufvk = daemon.call("export_ufvk", { id, passphrase: PASSPHRASE });
    expect(ufvk).toMatch(/^uview1[a-z0-9]+$/);
  });

  it("lands a payment in the mempool, then confirms it on the next block", () => {
    const { run, events, txs } = boot();
    const before = txs().length;
    run(30);
    const arrival = events.find((ev) => ev.event === "transaction");
    expect(arrival).toMatchObject({ kind: "received", received: true });
    expect(txs()).toHaveLength(before + 1);
    expect(txs().filter((t) => t.status === "pending").length).toBeGreaterThan(
      0,
    );
    run(45);
    expect(txs().every((t) => t.status === "confirmed")).toBe(true);
    expect(events.some((ev) => ev.event === "finished")).toBe(true);
  });

  it("walks the Initial scan to the tip and reveals history as it goes", () => {
    const { daemon, run, byLabel, txs } = boot();
    daemon.call("select_wallet", { id: byLabel("Cold storage").id });
    const seen = txs().length;
    run(480);
    expect(byLabel("Cold storage").sync?.state).toBe("idle");
    expect(txs().length).toBeGreaterThan(seen);
  });

  it("recovers an unreachable Wallet when its Indexer changes", () => {
    const { daemon, run, byLabel } = boot();
    daemon.call("select_wallet", { id: byLabel("Travel").id });
    daemon.call("set_indexer", { indexerUri: "https://zec.rocks:443" });
    run(15);
    expect(byLabel("Travel").sync?.state).toBe("idle");
  });

  it("falls over to another Wallet on remove and to onboarding on start over", () => {
    const { daemon, wallets, state } = boot();
    const selected = state().walletId;
    daemon.call("remove_wallet", { id: selected });
    expect(wallets()).toHaveLength(6);
    expect(state().walletId).not.toBe(selected);
    daemon.call("start_over", {});
    expect(state()).toMatchObject({ exists: false, sessionHeld: false });
  });

  it("imports a key into a scanning Wallet under a new passphrase", () => {
    const { daemon, state, wallets } = boot();
    daemon.call("start_over", {});
    const ufvk = `uview1${"q".repeat(60)}`;
    expect(parseUfvk(ufvk)).toMatchObject({
      kind: "valid",
      network: "mainnet",
    });
    expect(parseUfvk("uviewtest1abc")).toEqual({ kind: "testnet" });
    expect(parseUfvk("zs1abc").kind).toBe("malformed");
    const importArgs = {
      ufvk,
      birthday: { kind: "default" },
      indexerUri: "https://zec.rocks:443",
      network: "mainnet",
    };
    daemon.call("import_ufvk", { ...importArgs, passphrase: "hunter2" });
    expect(state()).toMatchObject({
      exists: true,
      locked: false,
      sessionHeld: true,
    });
    expect(wallets()[0].sync?.state).toBe("syncing");
    expect(daemon.call("verify_passphrase", { passphrase: "hunter2" })).toBe(
      true,
    );
    expect(() => daemon.call("import_ufvk", importArgs)).toThrow();
  });
});

describe("FakeDaemon editing", () => {
  it("persists the scenario on every change the app or the editor makes", () => {
    const { daemon, saved, state } = boot();
    daemon.call("set_wallet_label", { id: state().walletId, label: "Till" });
    expect(last(saved)?.wallets.find((w) => w.label === "Till")).toBeDefined();
    daemon.patchApp({ discreet: true, usdPerZec: 42 });
    expect(last(saved)).toMatchObject({ discreet: true, usdPerZec: 42 });
    expect(state().discreet).toBe(true);
    expect(daemon.call("get_spot_price", {})).toMatchObject({ usdPerZec: 42 });
  });

  it("boots back into a saved scenario, selection included", () => {
    const first = boot();
    first.daemon.call("select_wallet", { id: first.byLabel("Savings").id });
    first.daemon.patchApp({ passphrase: "other" });
    const again = boot(last(first.saved));
    expect(again.state().label).toBe("Savings");
    expect(
      again.daemon.call("verify_passphrase", { passphrase: "other" }),
    ).toBe(true);
  });

  it("rebuilds a Wallet from edited events and keeps them across a persona edit", () => {
    const { daemon, state, txs, saved } = boot();
    const id = state().walletId ?? "";
    const events = daemon
      .eventsOf(id)
      .slice(0, 3)
      .map((e) => ({ ...e, pending: false }));
    events[0] = {
      ...events[0],
      kind: "received",
      valueZat: 123_000_000,
      memo: "hand",
    };
    daemon.setEvents(id, events);
    expect(txs()).toHaveLength(3);
    expect(txs().some((t) => t.notes[0]?.memo === "hand")).toBe(true);
    daemon.patchWallet(id, {
      persona: { pools: ["orchard"] },
      label: "Edited",
    });
    expect(txs()).toHaveLength(3);
    expect(state().label).toBe("Edited");
    expect(
      last(saved)?.wallets.find((w) => w.label === "Edited")?.events,
    ).toHaveLength(3);
    daemon.regenerate(id);
    expect(txs().length).toBeGreaterThan(3);
    expect(
      last(saved)?.wallets.find((w) => w.label === "Edited")?.events,
    ).toBeUndefined();
  });

  it("restarts a Wallet's runtime sync from an edited condition", () => {
    const { daemon, byLabel, run } = boot();
    const id = byLabel("Savings").id;
    daemon.patchWallet(id, { condition: { kind: "scanning", done: 0.5 } });
    expect(byLabel("Savings").sync).toMatchObject({ state: "syncing" });
    expect(byLabel("Savings").sync?.percent).toBeCloseTo(50, 0);
    daemon.patchWallet(id, {
      condition: { kind: "unavailable", reason: "gone" },
    });
    expect(byLabel("Savings").unavailable).toBe("gone");
    daemon.patchWallet(id, { condition: { kind: "synced" } });
    run(1);
    expect(byLabel("Savings").sync?.state).toBe("idle");
  });

  it("adds, deletes and resets", () => {
    const { daemon, wallets, saved } = boot();
    const id = daemon.addWallet();
    expect(wallets()).toHaveLength(8);
    expect(wallets().find((w) => w.id === id)?.sync?.state).toBe("idle");
    daemon.deleteWallet(id);
    expect(wallets()).toHaveLength(7);
    daemon.setLocked(true);
    expect(daemon.isLocked()).toBe(true);
    daemon.reset();
    expect(last(saved)?.wallets).toHaveLength(7);
    expect(
      walletId(last(saved)?.wallets[0] ?? DEFAULT_SCENARIO.wallets[0]),
    ).toBe(walletId(DEFAULT_SCENARIO.wallets[0]));
  });
});
