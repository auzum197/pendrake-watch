import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WalletState } from "./ipc";
import {
  hydrateDiscreet,
  isMasked,
  setPeeking,
  toggleDiscreet,
} from "./discreet";
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
  setPeeking(false);
});

describe("isMasked", () => {
  it("derives from hidden and peeking", () => {
    expect(isMasked()).toBe(false);
    hydrateDiscreet(true);
    expect(isMasked()).toBe(true);
    setPeeking(true);
    expect(isMasked()).toBe(false);
    setPeeking(false);
    expect(isMasked()).toBe(true);
  });

  it("peek never flips the persisted flag", async () => {
    hydrateDiscreet(true);
    setPeeking(true);
    setPeeking(false);
    expect(isMasked()).toBe(true);
    expect(setDiscreet).not.toHaveBeenCalled();
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
    // A stale wallet-state load lands mid-flight; the optimistic flip holds.
    hydrateDiscreet(false);
    expect(isMasked()).toBe(true);
    settle(state(true));
    await done;
    expect(isMasked()).toBe(true);
  });
});
