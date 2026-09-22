import type { Meta, StoryObj } from "@storybook/react-vite";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./chart";

const config = {
  value: { label: "Balance", color: "var(--color-brand)" },
} satisfies ChartConfig;

const data = [
  { label: "Mon", value: 0.2 },
  { label: "Tue", value: 0.5 },
  { label: "Wed", value: 0.5 },
  { label: "Thu", value: 1.0 },
  { label: "Fri", value: 1.2 },
];

const meta = {
  component: ChartContainer,
  args: { config, children: <div /> },
} satisfies Meta<typeof ChartContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Area_: Story = {
  name: "Area",
  render: () => (
    <ChartContainer config={config} className="aspect-video w-[36rem]">
      <AreaChart data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} strokeDasharray="4 6" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          dataKey="value"
          type="stepAfter"
          stroke="var(--color-brand)"
          fill="var(--color-brand)"
          fillOpacity={0.15}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  ),
};
