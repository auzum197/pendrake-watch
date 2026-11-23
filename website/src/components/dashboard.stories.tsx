import type { Meta, StoryObj } from "@storybook/react-vite";
import { series, wallet } from "../lib/samples";
import { Dashboard, useWallet } from "./dashboard";

function Live() {
  return <Dashboard wallet={useWallet()} />;
}

const meta = {
  component: Dashboard,
  args: { wallet },
  decorators: [
    (Story) => (
      <div
        className="flex flex-col gap-6 font-sans text-sm"
        style={{ width: 858 }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Dashboard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Static: Story = {};

export const Receiving: Story = { render: () => <Live /> };

export const NewWallet: Story = {
  args: {
    wallet: {
      ...wallet,
      balance: 0.25,
      points: series([0, 0, 0.1, 0.25]),
      rows: wallet.rows.slice(0, 1),
    },
  },
};

export const Still: Story = { parameters: { motion: false } };
