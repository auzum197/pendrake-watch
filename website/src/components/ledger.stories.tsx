import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { randomTx } from "../lib/content";
import { rows } from "../lib/samples";
import { Ledger, type Row } from "./dashboard";

function Arriving() {
  const [list, setList] = useState<Row[]>(rows);
  useEffect(() => {
    let id = 0;
    let block = rows[0].block;
    const timer = setInterval(() => {
      const tx = randomTx(block, 10);
      block = tx.block;
      id += 1;
      const row = { ...tx, id, fresh: true };
      setList((prev) => [row, ...prev].slice(0, 9));
    }, 2500);
    return () => clearInterval(timer);
  }, []);
  return <Ledger rows={list} limit={4} />;
}

const meta = {
  component: Ledger,
  args: { rows, limit: 4 },
  decorators: [
    (Story) => (
      <div className="frame-card" style={{ width: 860 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Ledger>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FourRows: Story = {};

export const TwoRows: Story = { args: { limit: 2 } };

export const SixRows: Story = { args: { limit: 6 } };

export const Arrivals: Story = { render: () => <Arriving /> };
