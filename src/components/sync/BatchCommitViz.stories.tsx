import type { Meta, StoryObj } from "@storybook/react-vite";
import { BatchCommitViz } from "./BatchCommitViz";

const meta = {
  component: BatchCommitViz,
  args: { committing: true, frac: 0.6 },
  decorators: [(Story) => <div className="w-64"><Story /></div>],
} satisfies Meta<typeof BatchCommitViz>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Waiting: Story = { args: { committing: false, frac: 0 } };
export const Committing: Story = { args: { committing: true, frac: 0.6 } };
export const Done: Story = { args: { committing: true, frac: 1 } };
