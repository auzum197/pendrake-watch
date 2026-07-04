import type { Meta, StoryObj } from "@storybook/react-vite";
import { BatchScanViz } from "./BatchScanViz";

const meta = {
  component: BatchScanViz,
  args: { active: true, sparkSeq: 0, canSpark: true },
  decorators: [(Story) => <div className="w-80"><Story /></div>],
} satisfies Meta<typeof BatchScanViz>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Active: Story = {};
export const Idle: Story = { args: { active: false } };
export const Match: Story = { args: { sparkSeq: 1 } };
