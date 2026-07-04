import type { Meta, StoryObj } from "@storybook/react-vite";
import { RingsIcon } from "./rings-icon";

const meta = {
  component: RingsIcon,
  args: { className: "size-10" },
} satisfies Meta<typeof RingsIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

// The gradient rings glow against the pool tile's dark fill, so the story sits the
// icon on that surface.
export const Default: Story = {
  render: (args) => (
    <span className="flex size-16 items-center justify-center rounded-2xl bg-ink">
      <RingsIcon {...args} />
    </span>
  ),
};
