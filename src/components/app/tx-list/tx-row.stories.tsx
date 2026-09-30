import type { Meta, StoryObj } from "@storybook/react-vite";
import type { Note, Pool, Tx, TxKind, TxStatus } from "@/lib/ipc";
import { TxRow } from "./tx-list";

function RowDemo({
	kind,
	status,
	memo,
	pools,
	flash,
	reveal,
}: {
	kind: TxKind;
	status: TxStatus;
	memo: boolean;
	pools: Pool[];
	flash: boolean;
	reveal: boolean;
}) {
	const notes: Note[] = pools.map((pool, i) => ({
		pool,
		direction: kind,
		outputIndex: i,
		valueZat: "73450000",
		memo: memo && i === 0 ? "Coffee money" : undefined,
	}));
	const tx: Tx = {
		txid: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
		datetime: 1_701_200_000,
		blockHeight: status === "confirmed" ? 2_400_120 : undefined,
		kind,
		valueZat: "73450000",
		netZat: kind === "received" ? "73450000" : "-73450000",
		status,
		notes,
	};
	return (
		<div className="text-sm" style={{ height: 49 }}>
			<TxRow tx={tx} flash={flash} reveal={reveal} />
		</div>
	);
}

const meta = {
	component: RowDemo,
	args: {
		kind: "received",
		status: "confirmed",
		memo: true,
		pools: ["orchard"],
		flash: false,
		reveal: false,
	},
	argTypes: {
		kind: { control: "radio", options: ["received", "sent"] },
		status: { control: "radio", options: ["confirmed", "pending"] },
		pools: {
			control: "check",
			options: ["orchard", "sapling", "ironwood", "transparent"],
		},
	},
} satisfies Meta<typeof RowDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Received: Story = {};
export const Sent: Story = { args: { kind: "sent", memo: false } };
export const Pending: Story = { args: { status: "pending" } };
export const TwoPools: Story = { args: { pools: ["orchard", "sapling"] } };
export const ReturnFlash: Story = { args: { flash: true } };
