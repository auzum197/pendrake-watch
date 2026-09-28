// PROTOTYPE variant C, "Receipt": the verdict comes first in one line, recovered
// payments read as a receipt with the OCK to hand over as proof, and the outputs
// that stayed closed fold away. Inputs sit in a drawer that closes after a run.

import { useState } from "react";
import { IconCopy } from "@tabler/icons-react";
import { PoolBadge } from "@/components/notes/badges";
import { Button } from "@/components/ui/button/button";
import { DiscreetValue } from "@/components/ui/discreet-value/discreet-value";
import { formatZec } from "@/lib/format";
import { STAGES, isRecovered } from "./mock";
import { KeyFields, SourceFields } from "./source-fields";
import type { VariantProps } from "./variant";
import { RunButton, TopBar } from "./variant";

export const name = "Receipt";

export function VariantC(props: VariantProps) {
	const { inputs, setInputs, report } = props;
	const [drawerOpen, setDrawerOpen] = useState(true);
	const recovered = report?.outputs.filter(isRecovered) ?? [];
	const closed = report?.outputs.filter((o) => !isRecovered(o)) ?? [];
	const total = recovered.reduce((sum, o) => sum + (o.note?.valueZat ?? 0n), 0n);

	return (
		<div className="mx-auto flex w-full max-w-xl flex-col gap-6">
			<TopBar {...props} />
			<details
				open={drawerOpen || !report}
				onToggle={(e) => setDrawerOpen(e.currentTarget.open)}
				className="rounded-xl border border-border bg-card"
			>
				<summary className="cursor-pointer px-4 py-3 text-sm font-medium">
					{report ? `Source · ${report.txid.slice(0, 8)}…` : "Source"}
				</summary>
				<div className="flex flex-col gap-4 border-t border-border p-4">
					<SourceFields inputs={inputs} onChange={setInputs} />
					<KeyFields inputs={inputs} onChange={setInputs} />
					<RunButton {...props} onRan={() => setDrawerOpen(false)} />
				</div>
			</details>

			{report && (
				<header className="flex flex-col gap-1">
					<h2 className="font-heading text-2xl font-bold tracking-tight">
						{recovered.length === report.outputs.length
							? "Every output recovered"
							: recovered.length === 0
								? "Nothing recovered"
								: `${recovered.length} of ${report.outputs.length} outputs recovered`}
					</h2>
					<p className="text-sm text-muted-foreground">
						<DiscreetValue kind="txid">{report.txid}</DiscreetValue>
						{report.height ? ` · block ${report.height.toLocaleString()}` : " · height unknown"}
					</p>
				</header>
			)}

			{recovered.length > 0 && (
				<section className="rounded-xl border border-border bg-card">
					<ul className="divide-y divide-border">
						{recovered.map((o) => (
							<li key={`${o.pool}-${o.index}`} className="flex flex-col gap-2 p-4">
								<div className="flex items-baseline justify-between">
									<span className="flex items-center gap-2 text-xs text-muted-foreground">
										<PoolBadge pool={o.pool} /> #{o.index} · {o.key}
									</span>
									<span className="font-heading text-lg font-semibold tabular-nums">
										<DiscreetValue kind="zec">{formatZec(o.note?.valueZat ?? 0n)}</DiscreetValue> ZEC
									</span>
								</div>
								<p className="break-all font-mono text-xs">
									<DiscreetValue kind="address">{o.note?.recipient ?? ""}</DiscreetValue>
								</p>
								{o.note?.memo && (
									<p className="whitespace-pre-wrap rounded-lg bg-muted/60 px-3 py-2 text-sm">
										<DiscreetValue kind="memo">{o.note.memo}</DiscreetValue>
									</p>
								)}
								<div className="flex items-center gap-2 text-xs text-muted-foreground">
									<span className="shrink-0">proof</span>
									<code className="truncate select-text">{o.ock}</code>
									<Button
										variant="ghost"
										size="icon-xs"
										aria-label="Copy OCK"
										onClick={() => navigator.clipboard.writeText(o.ock ?? "")}
									>
										<IconCopy />
									</Button>
								</div>
							</li>
						))}
					</ul>
					<footer className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
						<span className="text-muted-foreground">Total recovered</span>
						<span className="font-mono tabular-nums">
							<DiscreetValue kind="zec">{formatZec(total)}</DiscreetValue> ZEC
						</span>
					</footer>
				</section>
			)}

			{closed.length > 0 && (
				<details className="text-sm">
					<summary className="cursor-pointer text-muted-foreground">
						{closed.length} output{closed.length === 1 ? "" : "s"} not recovered
					</summary>
					<ul className="mt-2 flex flex-col gap-1">
						{closed.map((o) => {
							const stage = STAGES.find((s) => s.key === o.failedAt);
							return (
								<li key={`${o.pool}-${o.index}`} className="flex items-center gap-2 text-xs">
									<PoolBadge pool={o.pool} />
									<span className="font-mono">#{o.index}</span>
									<span className={o.key ? "text-destructive" : "text-muted-foreground"}>
										{o.key ? `${o.key} opened it, then ${stage?.label} failed` : "no key opened it"}
									</span>
								</li>
							);
						})}
					</ul>
				</details>
			)}
		</div>
	);
}
