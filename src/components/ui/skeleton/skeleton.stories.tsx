import type { Meta, StoryObj } from "@storybook/react-vite";
import { Skeleton } from "./skeleton";

const meta = {
  component: Skeleton,
  args: { className: "h-4 w-48" },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Circle: Story = { args: { className: "size-12 rounded-full" } };

// The primitive composed into a loading placeholder, the way the views assemble it.
export const CardPlaceholder: Story = {
  render: () => (
    <div className="w-64 rounded-xl border border-border bg-card p-4">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-2.5 h-6 w-28" />
      <Skeleton className="mt-2 h-3 w-12" />
    </div>
  ),
};
