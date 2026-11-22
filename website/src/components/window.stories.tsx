import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";
import { wallet } from "../lib/samples";
import { useWallet } from "./dashboard";
import { MacWindow } from "./window";

function Live() {
  return <MacWindow wallet={useWallet()} />;
}

const scaled = (scale: number) =>
  ({
    width: 1180 * scale,
    height: 900 * scale,
    "--s": scale,
    "--frame-r": "40px",
  }) as CSSProperties;

const meta = {
  component: MacWindow,
  args: { wallet },
  decorators: [
    (Story) => (
      <div style={scaled(0.6)}>
        <div className="home-frame">
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof MacWindow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Static: Story = {};

export const Receiving: Story = { render: () => <Live /> };

export const FullSize: Story = {
  parameters: { bare: true },
  decorators: [
    (Story) => (
      <div
        className="bg-ink p-8"
        style={{ width: 1244, "--frame-r": "40px" } as CSSProperties}
      >
        <div style={{ width: 1180, height: 900 }}>
          <Story />
        </div>
      </div>
    ),
  ],
};
