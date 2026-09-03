import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WalletState } from "./ipc";
import { hydrateDiscreet, isMasked, toggleDiscreet } from "./discreet";
import { setDiscreet } from "./ipc";

vi.mock("./ipc", () => ({ setDiscreet: vi.fn() }));

function state(discreet: boolean): WalletState {
  return {
    exists: true,
    locked: false,
    sessionHeld: true,
    fingerprint: null,
    importType: "ufvk",
    viewMode: "full",
    network: "mainnet",
    birthdayHeight: 0,
    indexerUri: "",
    notificationsEnabled: true,
    discreet,
  };
}

beforeEach(() => {
  vi.mocked(setDiscreet).mockReset();
  hydrateDiscreet(false);
});

describe("isMasked", () => {
  it("mirrors the hidden flag", () => {
    expect(isMasked()).toBe(false);
    hydrateDiscreet(true);
    expect(isMasked()).toBe(true);
    hydrateDiscreet(false);
    expect(isMasked()).toBe(false);
  });
});

describe("toggleDiscreet", () => {
  it("flips optimistically and settles on the daemon's answer", async () => {
    vi.mocked(setDiscreet).mockResolvedValue(state(true));
    const done = toggleDiscreet();
    expect(isMasked()).toBe(true);
    await done;
    expect(isMasked()).toBe(true);
    expect(setDiscreet).toHaveBeenCalledWith(true);
  });

  it("reverts when the daemon is unreachable", async () => {
    vi.mocked(setDiscreet).mockRejectedValue(new Error("daemon down"));
    await toggleDiscreet();
    expect(isMasked()).toBe(false);
  });

  it("ignores hydration while a toggle is in flight", async () => {
    let settle: (s: WalletState) => void = () => {};
    vi.mocked(setDiscreet).mockImplementation(
      () =>
        new Promise((resolve) => {
          settle = resolve;
        }),
    );
    const done = toggleDiscreet();
    expect(isMasked()).toBe(true);
    hydrateDiscreet(false);
    expect(isMasked()).toBe(true);
    settle(state(true));
    await done;
    expect(isMasked()).toBe(true);
  });
});
