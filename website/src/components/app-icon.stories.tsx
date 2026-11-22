import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppIcon } from "./shared";

const meta = {
  component: AppIcon,
  args: { className: "size-16" },
} satisfies Meta<typeof AppIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Medium: Story = {};

export const Small: Story = { args: { className: "size-9" } };

export const Large: Story = { args: { className: "size-32" } };
