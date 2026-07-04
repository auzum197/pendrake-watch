import type { Meta, StoryObj } from "@storybook/react-vite";
import { LifeHashIcon } from "./lifehash";

const meta = {
  component: LifeHashIcon,
  args: { fingerprint: "a1b2c3d4e5f6", className: "size-24 rounded-xl" },
} satisfies Meta<typeof LifeHashIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Row: Story = {
  render: () => (
    <div className="flex gap-4">
      {["zec-rocks", "pendrake", "watch-only", "a1b2c3d4"].map((fp) => (
        <LifeHashIcon key={fp} fingerprint={fp} className="size-16 rounded-full" />
      ))}
    </div>
  ),
};
