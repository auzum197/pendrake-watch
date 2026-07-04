import type { Meta, StoryObj } from "@storybook/react-vite";
import type { Pool } from "@/lib/ipc";
import {
  ChangeBadge,
  MempoolBadge,
  PoolBadge,
  PoolDot,
  StatusBadge,
} from "./badges";

const pools: Pool[] = ["orchard", "sapling", "transparent"];

const meta = {
  component: PoolBadge,
  args: { pool: "orchard" },
} satisfies Meta<typeof PoolBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pools: Story = {
  render: () => (
    <div className="flex gap-2">
      {pools.map((pool) => (
        <PoolBadge key={pool} pool={pool} />
      ))}
    </div>
  ),
};

export const Statuses: Story = {
  render: () => (
    <div className="flex gap-2">
      <StatusBadge status="unspent" />
      <StatusBadge status="spent" />
      <StatusBadge status="pending" />
    </div>
  ),
};

// The flag badges the note row appends: change output, and a note still in the mempool.
export const Flags: Story = {
  render: () => (
    <div className="flex gap-2">
      <ChangeBadge />
      <MempoolBadge />
    </div>
  ),
};

// The bare pool dot, used where a full badge is too much (the activity list's note rows).
export const Dots: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      {pools.map((pool) => (
        <PoolDot key={pool} pool={pool} />
      ))}
    </div>
  ),
};
