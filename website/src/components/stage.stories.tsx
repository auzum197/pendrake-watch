import type { Meta, StoryObj } from "@storybook/react-vite";
import { asset } from "../lib/asset";
import { Stage } from "./stage";

const meta = {
  component: Stage,
  parameters: { layout: "fullscreen" },
  args: { still: asset("sky-still.png") },
  decorators: [
    (Story) => (
      <main className="home">
        <div className="home-anchor">
          <Story />
        </div>
      </main>
    ),
  ],
} satisfies Meta<typeof Stage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loop: Story = { parameters: { motion: true } };

export const Static: Story = { parameters: { motion: false } };
