import type { Meta, StoryObj } from "@storybook/react-vite";
import { NotesContentSkeleton, SummaryBarSkeleton } from "./notes-skeleton";

const meta = {
  component: SummaryBarSkeleton,
} satisfies Meta<typeof SummaryBarSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SummaryBar: Story = {
  render: () => <SummaryBarSkeleton />,
};

export const Content: Story = {
  render: () => <NotesContentSkeleton />,
};

// The whole cold-start view: summary cards over the filter row and table placeholder,
// tracing the notes page's real layout.
export const FullPage: Story = {
  render: () => (
    <div className="space-y-6">
      <SummaryBarSkeleton />
      <NotesContentSkeleton />
    </div>
  ),
};
