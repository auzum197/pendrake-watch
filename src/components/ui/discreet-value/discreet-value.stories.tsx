import type { Meta, StoryObj } from "@storybook/react-vite";
import { hydrateDiscreet, useDiscreet } from "@/lib/discreet";
import { DiscreetValue } from "./discreet-value";

// The store is module-global, so the toggle here drives it directly through
// hydrateDiscreet (no daemon in Storybook). Flipping it plays the one-shot
// scramble on every value below.
function AllKindsDemo() {
	const hidden = useDiscreet();
	return (
		<div className="flex flex-col gap-3 font-mono text-sm">
			<button
				type="button"
				onClick={() => hydrateDiscreet(!hidden)}
				className="w-fit rounded-lg border border-border px-3 py-1.5 text-xs font-medium"
			>
				{hidden ? "Show values" : "Hide values"}
			</button>
			<span>
				Balance: <DiscreetValue kind="zec">1,234.5678</DiscreetValue> ZEC
			</span>
			<span>
				Fiat: <DiscreetValue kind="usd">$4,521.09</DiscreetValue>
			</span>
			<span>
				Date: <DiscreetValue kind="date">Jan 5, 2026, 09:14</DiscreetValue>
			</span>
			<span>
				Block: <DiscreetValue kind="block">#2,381,554</DiscreetValue>
			</span>
			<span>
				Txid:{" "}
				<DiscreetValue kind="txid">
					f4184fc596403b9d638783cf57adfe4c
				</DiscreetValue>
			</span>
			<span>
				Address:{" "}
				<DiscreetValue kind="address">
					u1l8xunezsvhq8fgzfl796uzsdvz9wibfidhrkf4pv
				</DiscreetValue>
			</span>
			<span>
				Memo: <DiscreetValue kind="memo">Thanks for lunch!</DiscreetValue>
			</span>
		</div>
	);
}

const meta = {
	component: DiscreetValue,
} satisfies Meta<typeof DiscreetValue>;
export default meta;
type Story = StoryObj<typeof meta>;

export const AllKinds: Story = {
	args: { kind: "zec", children: "1,234.5678" },
	render: () => <AllKindsDemo />,
};
