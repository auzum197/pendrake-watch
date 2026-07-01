import type { Meta, StoryObj } from "@storybook/react-vite";
import { Label } from "./label";
import { Input } from "./input";

const meta = {
  component: Label,
  args: { children: "Indexer URL" },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithInput: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-2">
      <Label htmlFor="indexer">Indexer URL</Label>
      <Input id="indexer" placeholder="https://zec.rocks:443" />
    </div>
  ),
};
