import type { Meta, StoryObj } from "@storybook/react-vite";
import { Sparkline } from "./sparkline";

const meta = {
  component: Sparkline,
  args: { className: "h-14 w-60" },
} satisfies Meta<typeof Sparkline>;

export default meta;
type Story = StoryObj<typeof meta>;

// The step trace holds flat between transactions, then jumps, matching the full
// chart's read of a balance over time.
export const Rising: Story = {
  args: { values: [0, 0.5, 0.5, 1.2, 1.2, 1.2, 2.4, 3.1] },
};

export const Volatile: Story = {
  args: { values: [1, 3, 2, 4, 1.5, 3.5, 2, 5] },
};

// Stretched wide to show the stroke stays crisp at any box size (non-scaling-stroke).
export const Wide: Story = {
  args: { values: [0, 1, 1, 2, 2, 3], className: "h-10 w-full" },
};
