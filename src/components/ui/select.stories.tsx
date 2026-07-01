import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

// Inlined rather than imported from "@/lib/ipc": that module is auto-mocked in the
// workbench, which drops its constant exports.
const indexers = [
  { label: "Default (auto-routed)", uri: "https://zec.rocks:443" },
  { label: "North America", uri: "https://na.zec.rocks:443" },
  { label: "Europe", uri: "https://eu.zec.rocks:443" },
];

const meta = {
  component: Select,
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Indexers: Story = {
  render: () => (
    <Select defaultValue={indexers[0].uri}>
      <SelectTrigger className="w-72">
        <SelectValue placeholder="Pick an Indexer" />
      </SelectTrigger>
      <SelectContent>
        {indexers.map((indexer) => (
          <SelectItem key={indexer.uri} value={indexer.uri}>
            {indexer.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ),
};
