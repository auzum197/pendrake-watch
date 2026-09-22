import type { Meta, StoryObj } from "@storybook/react-vite";
import { HeartwoodIcon } from "./heartwood-icon";
import "./pool-tile.css";

const meta = {
  component: HeartwoodIcon,
  args: { className: "size-8" },
} satisfies Meta<typeof HeartwoodIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <span className="pool-tile size-14">
      <HeartwoodIcon {...args} />
    </span>
  ),
};
