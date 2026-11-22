import type { Meta, StoryObj } from "@storybook/react-vite";
import { ICON_NAMES } from "../lib/icon-paths";
import { Icon } from "./icons";

const meta = {
  component: Icon,
  args: { name: "eye", className: "size-8" },
  argTypes: { name: { control: "select", options: ICON_NAMES } },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {};

export const Labelled: Story = { args: { label: "Viewing key" } };

export const All: Story = {
  render: () => (
    <ul className="grid grid-cols-4 gap-6">
      {ICON_NAMES.map((name) => (
        <li key={name} className="flex w-24 flex-col items-center gap-2">
          <Icon name={name} className="size-6" />
          <span className="text-xs text-muted-foreground">{name}</span>
        </li>
      ))}
    </ul>
  ),
};
