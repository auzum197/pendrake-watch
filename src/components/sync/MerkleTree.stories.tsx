import type { Meta, StoryObj } from "@storybook/react-vite";
import { MerkleTree } from "./MerkleTree";

const meta = {
  component: MerkleTree,
  args: { frac: 0.5, pulseSeq: 0, active: true, synced: false },
  decorators: [(Story) => <div className="w-96"><Story /></div>],
} satisfies Meta<typeof MerkleTree>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Scanning: Story = {
  args: { frac: 0.5, total: 4_200_000, scanned: 2_100_000 },
};
export const NearlyDone: Story = {
  args: { frac: 0.9, total: 4_200_000, scanned: 3_780_000 },
};
export const Complete: Story = {
  args: { frac: 1, synced: true },
};
