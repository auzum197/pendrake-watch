import type { Meta, StoryObj } from "@storybook/react-vite";
import { RingsIcon } from "./rings-icon";
import "./pool-tile.css";

const meta = {
  component: RingsIcon,
  args: { className: "size-8" },
} satisfies Meta<typeof RingsIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <span className="pool-tile pool-tile--transparent size-14">
      <RingsIcon {...args} />
    </span>
  ),
};
