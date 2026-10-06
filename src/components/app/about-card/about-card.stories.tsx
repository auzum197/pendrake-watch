import type { Meta, StoryObj } from "@storybook/react-vite";
import { AboutCard } from "./about-card";

const ADDRESS =
  "u1" +
  Array.from(
    { length: 210 },
    (_, i) => "qpzry9x8gf2tvdw0s3jn54khce6mua7l"[(i * 7 + 3) % 32],
  ).join("");

const meta = {
  component: AboutCard,
  render: (args) => (
    <div className="mx-auto flex h-114 w-100 items-center rounded-2xl border border-border bg-ink">
      <AboutCard {...args} />
    </div>
  ),
} satisfies Meta<typeof AboutCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { address: "" },
};

export const WithSupport: Story = {
  args: { address: ADDRESS },
};

export const Support: Story = {
  args: { address: ADDRESS, initialFace: "support" },
};
