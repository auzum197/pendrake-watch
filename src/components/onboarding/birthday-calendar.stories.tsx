import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { BirthdayCalendar } from "./birthday-calendar";

const meta = {
  component: BirthdayCalendar,
  args: { onSelect: fn() },
} satisfies Meta<typeof BirthdayCalendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Preselected: Story = {
  args: { selected: new Date(2022, 5, 15) },
};
