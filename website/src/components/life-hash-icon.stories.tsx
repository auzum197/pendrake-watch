import type { Meta, StoryObj } from "@storybook/react-vite";
import { LifeHashIcon } from "./shared";

const meta = {
  component: LifeHashIcon,
  args: { fingerprint: "a1b2c3d4e5f6", size: 40, className: "rounded-full" },
} satisfies Meta<typeof LifeHashIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Medium: Story = {};

export const Small: Story = { args: { size: 20 } };

export const Large: Story = { args: { size: 96 } };

export const Square: Story = { args: { size: 64, className: "rounded-lg" } };

export const Fingerprints: Story = {
  render: () => (
    <div className="flex gap-4">
      {["a1b2c3d4e5f6", "0d9e4b2a7c61f3e8", "7b3f1e9c2a5d8e04"].map((fp) => (
        <LifeHashIcon
          key={fp}
          fingerprint={fp}
          size={48}
          className="rounded-full"
        />
      ))}
    </div>
  ),
};
