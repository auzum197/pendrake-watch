import type { Meta, StoryObj } from "@storybook/react-vite";
import type { Tx, TxKind, TxStatus } from "@/lib/ipc";
import { TxRow } from "./tx-list";

function RowDemo({
	kind,
	status,
	memo,
	flash,
	reveal,
}: {
	kind: TxKind;
	status: TxStatus;
	memo: boolean;
	flash: boolean;
	reveal: boolean;
}) {
	const tx: Tx = {
		txid: "a1b2c3d4e5f6",
		datetime: 1_701_200_000,
		blockHeight: status === "confirmed" ? 2_400_120 : undefined,
		kind,
		valueZat: "73450000",
		netZat: kind === "received" ? "73450000" : "-73450000",
		status,
		notes: [
			{
				pool: "orchard",
				direction: kind,
				outputIndex: 0,
				valueZat: "73450000",
				memo: memo ? "Coffee money" : undefined,
			},
		],
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
		flash: false,
		reveal: false,
	},
	argTypes: {
		kind: { control: "radio", options: ["received", "sent"] },
		status: { control: "radio", options: ["confirmed", "pending"] },
	},
} satisfies Meta<typeof RowDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Received: Story = {};
export const Sent: Story = { args: { kind: "sent", memo: false } };
export const Pending: Story = { args: { status: "pending" } };
export const ReturnFlash: Story = { args: { flash: true } };
