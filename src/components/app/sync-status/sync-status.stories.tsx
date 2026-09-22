import type { Meta, StoryObj } from "@storybook/react-vite";
import type { SyncStatus } from "@/lib/ipc";
import { SyncBar, SyncChip } from "./sync-status";

const syncing: SyncStatus = {
  state: "syncing",
  syncedHeight: 2_390_000,
  chainTip: 2_400_000,
  percent: 62,
  phase: "scanning",
  etaSeconds: 540,
};

const synced: SyncStatus = {
  state: "idle",
  syncedHeight: 2_400_000,
  chainTip: 2_400_000,
  percent: 100,
};

const errored: SyncStatus = {
  state: "error",
  syncedHeight: 2_390_000,
  chainTip: 2_400_000,
  percent: 62,
  error: "Indexer unreachable",
  unreachable: true,
};

const wrongChain: SyncStatus = {
  state: "error",
  syncedHeight: 2_390_000,
  chainTip: 251_000,
  percent: 62,
  error: "your Indexer is serving a different chain than this Wallet synced",
  wrongChain: true,
};

const meta = {
  component: SyncChip,
  args: { sync: syncing },
} satisfies Meta<typeof SyncChip>;

export default meta;
type Story = StoryObj<typeof meta>;

// The chip on its own reads the state name. Null is the pre-connect state; the rest
// walk syncing → synced → error → wrong chain.
export const Chip: Story = {
  render: () => (
    <div className="flex flex-col gap-3 rounded-2xl bg-ink p-6">
      <SyncChip sync={null} />
      <SyncChip sync={syncing} />
      <SyncChip sync={synced} />
      <SyncChip sync={errored} />
      <SyncChip sync={wrongChain} />
    </div>
  ),
};

// The bar carries the percent and ETA. Parked at zero once synced, so it's shown
// mid-scan here.
export const Bar: Story = {
  render: () => (
    <div className="w-64 rounded-2xl bg-ink p-6">
      <SyncBar sync={syncing} />
    </div>
  ),
};

// Chip and bar together, the way the wallet card stacks them.
export const Card: Story = {
  render: () => (
    <div className="flex w-64 flex-col gap-3 rounded-2xl bg-ink p-6">
      <SyncChip sync={syncing} />
      <SyncBar sync={syncing} />
    </div>
  ),
};
