import type { Meta, StoryObj } from "@storybook/react-vite";
import { HISTORY } from "../lib/content";
import { series } from "../lib/samples";
import { DitherChart } from "./dither-chart";

const meta = {
  component: DitherChart,
  args: { points: HISTORY, className: "aspect-900/240 w-full" },
  decorators: [
    (Story) => (
      <div className="frame-card" style={{ width: 860 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DitherChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rising: Story = {};

export const Flat: Story = {
  args: { points: series(Array.from({ length: 16 }, () => 8)) },
};

export const Volatile: Story = {
  args: {
    points: series([4, 11, 6, 15, 3, 9, 17, 8, 13, 5, 18, 7, 12, 4, 16, 10]),
  },
};

export const FewPoints: Story = { args: { points: series([2, 5, 4, 9]) } };

export const LargeValues: Story = {
  args: { points: series([1200, 1850, 2400, 2250, 3100, 4020, 3980, 5200]) },
};

export const SmallValues: Story = {
  args: { points: series([0.05, 0.12, 0.1, 0.22, 0.31, 0.28, 0.4, 0.52]) },
};

export const Still: Story = { parameters: { motion: false } };
