// PROTOTYPE. What every variant receives, plus the two bits they all place
// somewhere: the run button and the detach control.

import { IconArrowsMaximize, IconShieldCheck } from "@tabler/icons-react";
import { Button } from "@/components/ui/button/button";
import { hasSource, type Inputs, type Report } from "./mock";

export type VariantProps = {
	inputs: Inputs;
	setInputs: (next: Inputs) => void;
	report: Report | null;
	running: boolean;
	run: () => Promise<void>;
	detached: boolean;
	detach: () => void;
};

export function RunButton({
	inputs,
	running,
	run,
	onRan,
}: VariantProps & { onRan?: () => void }) {
	return (
		<Button
			disabled={running || !hasSource(inputs)}
			onClick={() => run().then(onRan)}
			className="w-fit"
		>
			<IconShieldCheck />
			{running ? "Verifying…" : "Verify"}
		</Button>
	);
}

export function TopBar({ detached, detach }: VariantProps) {
	return (
		<div className="flex items-start justify-between">
			<div>
				<h1 className="font-heading text-xl font-bold">Verify</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Recover a transaction's outputs from its outgoing cipher keys.
				</p>
			</div>
			{!detached && (
				<Button variant="outline" size="sm" onClick={detach}>
					<IconArrowsMaximize />
					Detach
				</Button>
			)}
		</div>
	);
}
