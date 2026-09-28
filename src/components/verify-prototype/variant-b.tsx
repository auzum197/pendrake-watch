// PROTOTYPE variant B, "Pipeline": inputs live in a left rail, and each output is
// drawn as the seven-step OCK track with the failing step marked. The mechanism
// is the primary thing on screen.

import { IconCheck, IconX } from "@tabler/icons-react";
import { PoolBadge } from "@/components/notes/badges";
import { DiscreetValue } from "@/components/ui/discreet-value/discreet-value";
import { formatZec } from "@/lib/format";
import { STAGES, stageIndex, type OutputReport } from "./mock";
import { KeyFields, SourceFields } from "./source-fields";
import type { VariantProps } from "./variant";
import { RunButton, TopBar } from "./variant";

export const name = "Pipeline";

export function VariantB(props: VariantProps) {
	const { inputs, setInputs, report } = props;
	return (
		<div className="flex flex-col gap-6">
			<TopBar {...props} />
			<div className="grid grid-cols-[18rem_1fr] gap-8">
				<aside className="flex flex-col gap-5 border-r border-border pr-6">
					<SourceFields inputs={inputs} onChange={setInputs} />
					<KeyFields inputs={inputs} onChange={setInputs} />
					<RunButton {...props} />
				</aside>
				<section className="flex flex-col gap-4">
					{!report && (
						<p className="text-sm text-muted-foreground">
							Each output will show as a track from OCK derivation to the ephemeral key check.
						</p>
					)}
					{report?.outputs.map((o) => (
						<Track key={`${o.pool}-${o.index}`} output={o} />
					))}
				</section>
			</div>
		</div>
	);
}

function Track({ output }: { output: OutputReport }) {
	const failedAt = output.failedAt ? stageIndex(output.failedAt) : STAGES.length;
	// With a pasted OCK the first stage is skipped: the key was given, not derived.
	const given = output.key === "pasted OCK";
	return (
		<article className="rounded-xl border border-border bg-card p-4">
			<header className="mb-3 flex items-center justify-between">
				<span className="flex items-center gap-2">
					<PoolBadge pool={output.pool} />
					<span className="font-mono text-xs text-muted-foreground">output #{output.index}</span>
				</span>
				<span className="text-xs text-muted-foreground">{output.key ?? "no key opened it"}</span>
			</header>
			<ol className="grid grid-cols-7 gap-1">
				{STAGES.map((s, i) => {
					const state =
						i === 0 && given
							? "given"
							: i < failedAt
								? "pass"
								: i === failedAt
									? "fail"
									: "skip";
					return (
						<li key={s.key} className="flex flex-col items-center gap-1 text-center" title={s.detail}>
							<span
								className={`flex size-6 items-center justify-center rounded-full text-[10px] ${
									state === "pass"
										? "bg-green-600 text-white"
										: state === "fail"
											? "bg-destructive text-white"
											: state === "given"
												? "bg-brand text-brand-foreground"
												: "bg-muted text-muted-foreground"
								}`}
							>
								{state === "pass" ? <IconCheck className="size-3" /> : state === "fail" ? <IconX className="size-3" /> : i + 1}
							</span>
							<span className={`font-mono text-[10px] ${state === "skip" ? "text-muted-foreground/60" : ""}`}>
								{s.label}
							</span>
						</li>
					);
				})}
			</ol>
			<footer className="mt-3 text-sm">
				{output.note ? (
					<div className="flex flex-col gap-1">
						<span className="font-mono tabular-nums">
							<DiscreetValue kind="zec">{formatZec(output.note.valueZat)}</DiscreetValue> ZEC to{" "}
							<span className="break-all text-xs">
								<DiscreetValue kind="address">{output.note.recipient}</DiscreetValue>
							</span>
						</span>
						{output.note.memo && (
							<p className="whitespace-pre-wrap rounded-lg bg-muted/60 px-3 py-2 text-xs">
								<DiscreetValue kind="memo">{output.note.memo}</DiscreetValue>
							</p>
						)}
					</div>
				) : (
					<p className="text-destructive">
						{output.failedAt === "outCiphertext" && !output.key
							? "None of the keys opened out_ciphertext. Either this output isn't ours or the key is wrong."
							: `${STAGES[failedAt].detail}: failed.`}
					</p>
				)}
			</footer>
		</article>
	);
}
