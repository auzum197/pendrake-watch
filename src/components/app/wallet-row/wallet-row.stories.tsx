import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { SyncStatus, WalletSummary } from "@/lib/ipc";
import { WalletRow, type WalletRowState } from "./wallet-row";

const FINGERPRINT = "a1b2c3d4e5f6a7b8";

const SYNC: Record<Exclude<WalletRowState, "unavailable" | "closed">, SyncStatus> = {
  synced: {
    state: "idle",
    syncedHeight: 2_400_000,
    chainTip: 2_400_000,
    percent: 100,
    lastSyncedAt: 1_700_000_000,
  },
  syncing: {
    state: "syncing",
    syncedHeight: 2_390_000,
    chainTip: 2_400_000,
    percent: 62,
    phase: "scanning",
    etaSeconds: 540,
  },
  error: {
    state: "error",
    syncedHeight: 2_390_000,
    chainTip: 2_400_000,
    percent: 62,
    error: "connection refused",
    unreachable: true,
  },
  wrongChain: {
    state: "error",
    syncedHeight: 2_390_000,
    chainTip: 251_000,
    percent: 62,
    error: "your Indexer is serving a different chain than this Wallet synced",
    wrongChain: true,
  },
};

type Knobs = {
  state: WalletRowState;
  selected: boolean;
  named: boolean;
  hasBalance: boolean;
  disabled: boolean;
  onPick: (id: string) => void;
};

function summaryFor({ state, selected, named, hasBalance }: Knobs): WalletSummary {
  return {
    id: FINGERPRINT,
    label: named ? "Cold storage" : FINGERPRINT.slice(0, 8),
    fingerprint: FINGERPRINT,
    network: "mainnet",
    birthdayHeight: 419_200,
    selected,
    lastBalance: hasBalance ? "897091655" : null,
    sync: state === "unavailable" || state === "closed" ? undefined : SYNC[state],
    unavailable:
      state === "unavailable" ? "wallet file could not be read" : undefined,
  };
}

function Row(knobs: Knobs) {
  return (
    <WalletRow
      wallet={summaryFor(knobs)}
      disabled={knobs.disabled}
      onPick={knobs.onPick}
    />
  );
}

const meta = {
  component: Row,
  decorators: [
    (Story) => (
      <div className="w-64 rounded-[1rem] border border-white/10 bg-ink-soft">
        <ul role="listbox" className="divide-y divide-white/[0.06]">
          <Story />
        </ul>
      </div>
    ),
  ],
  argTypes: {
    state: {
      control: "radio",
      options: ["synced", "syncing", "error", "wrongChain", "unavailable", "closed"],
    },
    onPick: { control: false },
  },
  args: {
    state: "synced",
    selected: false,
    named: true,
    hasBalance: true,
    disabled: false,
    onPick: fn(),
  },
} satisfies Meta<typeof Row>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Selected: Story = { args: { selected: true } };
export const Syncing: Story = { args: { state: "syncing" } };
export const SyncError: Story = { args: { state: "error" } };
export const WrongChain: Story = { args: { state: "wrongChain" } };
export const Unavailable: Story = { args: { state: "unavailable" } };
export const Closed: Story = { args: { state: "closed" } };
export const Unnamed: Story = { args: { named: false } };
export const NeverSynced: Story = {
  args: { state: "closed", hasBalance: false },
};

const CYCLE: WalletRowState[] = ["synced", "syncing", "error", "syncing", "wrongChain", "unavailable"];

function Cycling({ states, every, ...knobs }: Knobs & { states: WalletRowState[]; every: number }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), every);
    return () => clearInterval(t);
  }, [every]);
  return <Row {...knobs} state={states[tick % states.length]} />;
}

export const Live: Story = {
  render: (args) => (
    <>
      <Cycling {...args} states={["synced", "syncing"]} every={1600} />
      <Cycling {...args} states={CYCLE} every={1600} named={false} />
    </>
  ),
};

export const Gallery: Story = {
  render: (args) => (
    <>
      <Row {...args} state="synced" selected />
      <Row {...args} state="syncing" />
      <Row {...args} state="error" />
      <Row {...args} state="wrongChain" />
      <Row {...args} state="unavailable" />
      <Row {...args} state="closed" named={false} />
    </>
  ),
};
