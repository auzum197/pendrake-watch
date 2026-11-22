import type { Meta, StoryObj } from "@storybook/react-vite";
import { rows } from "../lib/samples";
import { TxRow } from "./dashboard";

const received = rows[0];

const meta = {
  component: TxRow,
  args: { tx: received },
  decorators: [
    (Story) => (
      <div className="frame-tx" style={{ width: 760 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TxRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReceivedSapling: Story = {};

export const ReceivedOrchard: Story = {
  args: { tx: { ...received, pool: "orchard", amount: "2.2" } },
};

export const ReceivedTransparent: Story = {
  args: { tx: { ...received, pool: "transparent", amount: "12" } },
};

export const SentOrchard: Story = {
  args: { tx: { ...received, dir: "Sent", pool: "orchard", amount: "3.14" } },
};

export const SentSapling: Story = {
  args: { tx: { ...received, dir: "Sent", pool: "sapling", amount: "0.5" } },
};

export const Today: Story = { args: { tx: { ...received, date: "Today" } } };
