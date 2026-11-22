import type { Meta, StoryObj } from "@storybook/react-vite";
import { Segmented } from "./dashboard";

const meta = {
  component: Segmented,
  args: { options: ["ZEC", "USD"], initial: "ZEC" },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Segmented>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TwoOptions: Story = {};

export const SecondSelected: Story = { args: { initial: "USD" } };

export const FiveOptions: Story = {
  args: { options: ["All", "1Y", "1M", "1W", "1D"], initial: "1D" },
};
