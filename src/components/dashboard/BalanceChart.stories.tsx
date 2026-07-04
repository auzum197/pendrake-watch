import type { Meta, StoryObj } from "@storybook/react-vite";
import { BalanceChart } from "./BalanceChart";
import { balanceSeries } from "@/stories/fixtures";

const meta = {
  component: BalanceChart,
  args: { points: balanceSeries, freshKeys: new Set<string>() },
  decorators: [(Story) => <div className="w-[40rem]"><Story /></div>],
} satisfies Meta<typeof BalanceChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const FreshArrival: Story = {
  args: { freshKeys: new Set(["tx2"]) },
};
