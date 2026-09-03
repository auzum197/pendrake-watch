import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { Tx, TxKind, TxStatus } from "@/lib/ipc";
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

export const Preview: Story = {
  args: { limit: 5 },
};

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

function InteractiveDemo() {
  const [rows, setRows] = useState<Tx[]>(txs);

  function add(kind: TxKind, status: TxStatus) {
    const height =
      2_400_200 +
      rows.reduce((n, t) => Math.max(n, t.blockHeight ?? 0), 0) -
      2_400_000;
    const valueZat = String(1_000_000 + Math.floor(Math.random() * 90_000_000));
    setRows((r) => [
      ...r,
      {
        txid: Math.random().toString(16).slice(2, 14),
        datetime: Math.floor(Date.now() / 1000),
        blockHeight: status === "confirmed" ? height : undefined,
        kind,
        valueZat,
        netZat: kind === "received" ? valueZat : `-${valueZat}`,
        status,
        notes: [
          { pool: "orchard", direction: kind, outputIndex: 0, valueZat },
        ],
      },
    ]);
  }

  const button =
    "rounded-lg border border-border px-3 py-1.5 text-xs font-medium";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button type="button" className={button} onClick={() => add("received", "confirmed")}>
          Receive
        </button>
        <button type="button" className={button} onClick={() => add("sent", "confirmed")}>
          Send
        </button>
        <button type="button" className={button} onClick={() => add("received", "pending")}>
          Pending
        </button>
      </div>
      <TxList txs={rows} limit={100} />
    </div>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveDemo />,
};
