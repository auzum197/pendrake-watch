// PROTOTYPE variant A, "Ledger": the form sits in a panel on top and the report is
// one dense row per output, expandable for the hex. Optimised for scanning many
// outputs at once.

import { useState } from "react";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { PoolBadge } from "@/components/notes/badges";
import { DiscreetValue } from "@/components/ui/discreet-value/discreet-value";
import { useMasked } from "@/lib/discreet";
import { formatZec, splitAddress } from "@/lib/format";
import { STAGES, isRecovered, type OutputReport } from "./mock";
import { KeyFields, SourceFields } from "./source-fields";
import type { VariantProps } from "./variant";
import { RunButton, TopBar } from "./variant";

export const name = "Ledger";

export function VariantA(props: VariantProps) {
	const { inputs, setInputs, report } = props;
	return (
		<div className="flex flex-col gap-6">
			<TopBar {...props} />
			<section className="grid grid-cols-2 gap-6 rounded-xl border border-border bg-card p-5">
				<div className="flex flex-col gap-2">
					<h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						Transaction
					</h2>
					<SourceFields inputs={inputs} onChange={setInputs} />
				</div>
				<div className="flex flex-col gap-2">
					<h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						Keys
					</h2>
					<KeyFields inputs={inputs} onChange={setInputs} />
				</div>
				<div className="col-span-2 flex items-center justify-between border-t border-border pt-4">
					<p className="text-xs text-muted-foreground">
						{report
							? `${report.version} · ${report.outputs.length} shielded outputs · ${report.transparentOutputs} transparent · keys: ${report.keysTried.join(", ") || "none"}`
							: "Nothing verified yet."}
					</p>
					<RunButton {...props} />
				</div>
			</section>

			{report && (
				<table className="w-full border-separate border-spacing-0 text-sm">
					<thead className="text-left text-xs text-muted-foreground">
						<tr>
							<th className="w-6 pb-2" />
							<th className="pb-2 font-medium">Output</th>
							<th className="pb-2 font-medium">Result</th>
							<th className="pb-2 font-medium">Key</th>
							<th className="pb-2 text-right font-medium">Amount</th>
							<th className="pb-2 pl-6 font-medium">Recipient</th>
						</tr>
					</thead>
					<tbody>
						{report.outputs.map((o) => (
							<Row key={`${o.pool}-${o.index}`} output={o} />
						))}
					</tbody>
				</table>
			)}
		</div>
	);
}

function Row({ output }: { output: OutputReport }) {
	const [open, setOpen] = useState(false);
	const ok = isRecovered(output);
	const stage = output.failedAt && STAGES.find((s) => s.key === output.failedAt);
	return (
		<>
			<tr
				onClick={() => setOpen((v) => !v)}
				className="cursor-pointer border-t border-border hover:bg-muted/40"
			>
				<td className="border-t border-border py-2 text-muted-foreground">
					{open ? <IconChevronDown className="size-4" /> : <IconChevronRight className="size-4" />}
				</td>
				<td className="border-t border-border py-2">
					<span className="flex items-center gap-2">
						<PoolBadge pool={output.pool} />
						<span className="font-mono text-xs text-muted-foreground">#{output.index}</span>
					</span>
				</td>
				<td className="border-t border-border py-2">
					{ok ? (
						<span className="text-green-600 dark:text-green-400">recovered</span>
					) : (
						<span className="text-destructive">
							stopped at {stage?.label}
						</span>
					)}
				</td>
				<td className="border-t border-border py-2 text-muted-foreground">{output.key ?? "—"}</td>
				<td className="border-t border-border py-2 text-right font-mono tabular-nums">
					{output.note ? (
						<>
							<DiscreetValue kind="zec">{formatZec(output.note.valueZat)}</DiscreetValue> ZEC
						</>
					) : (
						"—"
					)}
				</td>
				<td className="border-t border-border py-2 pl-6 font-mono text-xs">
					{output.note ? <ShortAddress value={output.note.recipient} /> : "—"}
				</td>
			</tr>
			{open && (
				<tr>
					<td colSpan={6} className="bg-muted/30 px-6 py-3">
						<dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 font-mono text-xs">
							<dt className="text-muted-foreground">cm*</dt>
							<dd className="break-all">{output.cmstar}</dd>
							<dt className="text-muted-foreground">epk</dt>
							<dd className="break-all">{output.ephemeralKey}</dd>
							{output.ock && (
								<>
									<dt className="text-muted-foreground">ock</dt>
									<dd className="break-all select-text">{output.ock}</dd>
								</>
							)}
							{output.note?.memo && (
								<>
									<dt className="text-muted-foreground">memo</dt>
									<dd className="whitespace-pre-wrap font-sans">
										<DiscreetValue kind="memo">{output.note.memo}</DiscreetValue>
									</dd>
								</>
							)}
							{stage && (
								<>
									<dt className="text-muted-foreground">why</dt>
									<dd className="font-sans text-destructive">{stage.detail}: failed</dd>
								</>
							)}
						</dl>
					</td>
				</tr>
			)}
		</>
	);
}

function ShortAddress({ value }: { value: string }) {
	const masked = useMasked();
	const { prefix, head, tail } = splitAddress(value);
	if (masked) return <DiscreetValue kind="address">{value}</DiscreetValue>;
	return (
		<span title={value}>
			<span className="text-brand">{prefix}</span>
			{head}…{tail}
		</span>
	);
}
