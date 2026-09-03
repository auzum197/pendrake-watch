import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./input";

const meta = {
  component: Input,
  args: { placeholder: "https://zec.rocks:443" },
  decorators: [(Story) => <div className="w-72"><Story /></div>],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Password: Story = {
  args: { type: "password", placeholder: "Enter your passphrase" },
};
export const Disabled: Story = { args: { disabled: true, value: "Locked" } };
export const Invalid: Story = { args: { "aria-invalid": true, value: "not a url" } };
