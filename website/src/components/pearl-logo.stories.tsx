import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";
import { PearlLogo } from "./pearl";

const sky = (height: string) =>
  ({ background: "#0a1a8c", padding: "3rem", "--h": height }) as CSSProperties;

const meta = {
  component: PearlLogo,
} satisfies Meta<typeof PearlLogo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Header: Story = {
  render: () => (
    <div style={sky("2rem")}>
      <PearlLogo />
    </div>
  ),
};

export const Hero: Story = {
  render: () => (
    <div style={sky("9rem")}>
      <PearlLogo />
    </div>
  ),
};

export const Static: Story = { ...Hero, parameters: { motion: false } };
