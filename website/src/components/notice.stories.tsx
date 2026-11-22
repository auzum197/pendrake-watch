import type { Meta, StoryObj } from "@storybook/react-vite";
import { Notice } from "./shared";

const meta = {
  component: Notice,
  args: { title: "Received 1.5 ZEC", body: "Cold storage" },
} satisfies Meta<typeof Notice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Received: Story = {};

export const Sent: Story = { args: { title: "Sent 0.2 ZEC" } };

export const LargeAmount: Story = {
  args: { title: "Received 12,480.2501 ZEC", body: "Grants" },
};

export const Opaque: Story = { args: { className: "home-mini" } };
