import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";
import { PearlLogo } from "./pearl";

const tall = (height: string) => ({ "--h": height }) as CSSProperties;

const meta = {
  component: PearlLogo,
  parameters: { sky: true },
} satisfies Meta<typeof PearlLogo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Header: Story = {
  render: () => (
    <div style={tall("2rem")}>
      <PearlLogo />
    </div>
  ),
};

export const Hero: Story = {
  render: () => (
    <div style={tall("9rem")}>
      <PearlLogo />
    </div>
  ),
};

export const Static: Story = { ...Hero, parameters: { motion: false } };
