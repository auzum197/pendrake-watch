import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { Calendar } from "./calendar";

const meta = {
  component: Calendar,
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { mode: "single", showOutsideDays: true },
};
