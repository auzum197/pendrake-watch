import type { Meta, StoryObj } from "@storybook/react-vite";
import { PearlButton } from "./pearl";

const meta = {
  component: PearlButton,
  args: { href: "#", label: "Download" },
  argTypes: {
    icon: {
      control: "select",
      options: [undefined, "detect", "macos", "windows", "linux"],
    },
  },
  parameters: { sky: true },
} satisfies Meta<typeof PearlButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Large: Story = {};

export const Small: Story = { args: { small: true } };

export const MacOS: Story = { args: { icon: "macos" } };

export const Windows: Story = { args: { icon: "windows" } };

export const Linux: Story = { args: { icon: "linux" } };

export const DetectedPlatform: Story = { args: { icon: "detect" } };

export const LongLabel: Story = {
  args: { label: "Download Pendrake Watch", icon: "macos" },
};

export const Static: Story = {
  args: { icon: "macos" },
  parameters: { motion: false },
};

export const All: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-6">
      <PearlButton href="#" label="Download" />
      <PearlButton href="#" label="Download" small />
      <PearlButton href="#" label="Download" icon="macos" />
      <PearlButton href="#" label="Download" icon="windows" />
      <PearlButton href="#" label="Download" icon="linux" />
    </div>
  ),
};
