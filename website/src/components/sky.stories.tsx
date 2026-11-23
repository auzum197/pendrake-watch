import type { Meta, StoryObj } from "@storybook/react-vite";
import { asset } from "../lib/asset";
import { Sky } from "./sky";

const lens = { x: 0.5, y: 0.52, radius: 0.56, power: 0.14 };
const vignette = { from: 0.1, to: 1, dim: 0.85, sink: 0.92 };

const meta = {
  component: Sky,
  parameters: { bare: true },
  args: {
    video: asset("sky-slow.mp4"),
    still: asset("sky-still.png"),
    fallback: asset("sky-fallback.png"),
    band: 0.66,
    px: 3,
    vignette,
    lens,
  },
  decorators: [
    (Story) => (
      <div className="relative h-svh bg-background">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Sky>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Live: Story = {};

export const Still: Story = { parameters: { motion: false } };

export const FineBlocks: Story = { args: { px: 2 } };

export const CoarseBlocks: Story = { args: { px: 6 } };

export const NoVignette: Story = {
  args: { vignette: { ...vignette, dim: 0, sink: 0 } },
};

export const FlatLens: Story = { args: { lens: { ...lens, power: 0 } } };

export const StrongLens: Story = { args: { lens: { ...lens, power: 0.4 } } };

export const UpperBand: Story = { args: { band: 0.2 } };
