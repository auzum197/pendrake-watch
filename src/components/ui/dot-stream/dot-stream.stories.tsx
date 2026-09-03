import type { Meta, StoryObj } from "@storybook/react-vite";
import { DotStream } from "./dot-stream";

const meta = {
  component: DotStream,
  argTypes: { className: { control: false } },
  decorators: [
    (Story) => (
      <div className="flex items-center gap-8 rounded-2xl bg-ink p-8 text-white/45">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DotStream>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Tinted: Story = {
  render: () => (
    <>
      <span className="text-white">
        <DotStream />
      </span>
      <span className="text-brand">
        <DotStream />
      </span>
    </>
  ),
};
