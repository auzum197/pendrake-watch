import type { Meta, StoryObj } from "@storybook/react-vite";
import { TxList } from "./tx-list";
import { withRouter } from "@/stories/with-router";
import { txs } from "@/stories/fixtures";

const meta = {
  component: TxList,
  decorators: [withRouter],
  args: { txs },
} satisfies Meta<typeof TxList>;

export default meta;
type Story = StoryObj<typeof meta>;

// The dashboard preview: a capped, plain-table variant with its entrance cascade.
export const Preview: Story = {
  args: { limit: 5 },
};

// The full Activity list virtualizes against the routed page's scroller, so the
// story reproduces that scroll container.
export const Full: Story = {
  render: (args) => (
    <div
      data-scroll-restoration-id="app-main"
      className="h-96 overflow-y-auto"
    >
      <TxList {...args} />
    </div>
  ),
};

export const Empty: Story = {
  args: { txs: [], limit: 5 },
};
