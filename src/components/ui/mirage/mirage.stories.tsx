import type { Meta, StoryObj } from "@storybook/react-vite";
import { Mirage } from "./mirage";

const meta = {
  component: Mirage,
  args: { size: 24, speed: 2.5 },
  argTypes: {
    size: { control: { type: "range", min: 12, max: 120, step: 4 } },
    speed: { control: { type: "range", min: 0.5, max: 6, step: 0.25 } },
    className: { control: false },
  },
  decorators: [
    (Story) => (
      <div className="flex items-center gap-8 rounded-2xl bg-ink p-8 text-white/45">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Mirage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Large: Story = { args: { size: 80 } };

export const Tinted: Story = {
  render: (args) => (
    <>
      <span className="text-white">
        <Mirage {...args} />
      </span>
      <span className="text-brand">
        <Mirage {...args} />
      </span>
      <span className="text-amber-400">
        <Mirage {...args} />
      </span>
    </>
  ),
};
