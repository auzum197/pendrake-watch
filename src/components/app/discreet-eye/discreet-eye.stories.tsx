import type { Meta, StoryObj } from "@storybook/react-vite";
import { hydrateDiscreet, useDiscreet } from "@/lib/discreet";
import { DiscreetValue } from "@/components/ui/discreet-value/discreet-value";
import { DiscreetEye } from "./discreet-eye";

function Demo() {
	const hidden = useDiscreet();
	return (
		<div className="flex items-center gap-4 rounded-xl bg-ink p-5 text-white">
			<DiscreetEye />
			<span className="font-mono text-sm">
				<DiscreetValue kind="zec">1,234.5678</DiscreetValue> ZEC
			</span>
			<button
				type="button"
				onClick={() => hydrateDiscreet(!hidden)}
				className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-white/70"
			>
				Force {hidden ? "off" : "on"}
			</button>
		</div>
	);
}

const meta = { component: DiscreetEye } satisfies Meta<typeof DiscreetEye>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Toggle: Story = { render: () => <Demo /> };
