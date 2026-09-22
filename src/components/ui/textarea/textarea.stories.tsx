import type { Meta, StoryObj } from "@storybook/react-vite";
import { Textarea } from "./textarea";

const meta = {
  component: Textarea,
  args: { placeholder: "Paste your UFVK" },
  decorators: [(Story) => <div className="w-96"><Story /></div>],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Filled: Story = {
  args: { defaultValue: "uview1qexampleexampleexampleexampleexample" },
};
export const Disabled: Story = { args: { disabled: true, value: "Locked" } };
