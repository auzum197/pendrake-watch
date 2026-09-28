// PROTOTYPE. The input side of the verifier, shared by the three variants so
// they only disagree about layout and about what the report looks like.

import { IconPlus, IconX } from "@tabler/icons-react";
import { Segmented } from "@/components/app/segmented/segmented";
import { Input } from "@/components/ui/input/input";
import { Textarea } from "@/components/ui/textarea/textarea";
import type { Inputs, OckEntry, ShieldedPool } from "./mock";

function parsePool(value: string): ShieldedPool {
	return value === "sapling" || value === "ironwood" ? value : "orchard";
}

export function SourceFields({
	inputs,
	onChange,
}: {
	inputs: Inputs;
	onChange: (next: Inputs) => void;
}) {
	const set = (patch: Partial<Inputs>) => onChange({ ...inputs, ...patch });
	return (
		<div className="flex flex-col gap-4">
			<Segmented
				value={inputs.source}
				onChange={(source) => set({ source })}
				tone="neutral"
				options={[
					{ value: "txid", label: "Txid" },
					{ value: "hex", label: "Raw hex" },
				]}
			/>
			{inputs.source === "txid" ? (
				<Input
					value={inputs.txid}
					onChange={(e) => set({ txid: e.target.value })}
					placeholder="64 hex characters, fetched from the Indexer"
					className="font-mono text-xs"
					spellCheck={false}
				/>
			) : (
				<Textarea
					value={inputs.txHex}
					onChange={(e) => set({ txHex: e.target.value })}
					placeholder="Serialized transaction, hex"
					className="max-h-40 font-mono text-xs"
					spellCheck={false}
				/>
			)}
		</div>
	);
}

export function KeyFields({
	inputs,
	onChange,
}: {
	inputs: Inputs;
	onChange: (next: Inputs) => void;
}) {
	const set = (patch: Partial<Inputs>) => onChange({ ...inputs, ...patch });
	const setOck = (i: number, patch: Partial<OckEntry>) =>
		set({ ocks: inputs.ocks.map((o, j) => (j === i ? { ...o, ...patch } : o)) });
	return (
		<div className="flex flex-col gap-3 text-sm">
			<label className="flex items-center gap-2">
				<input
					type="checkbox"
					checked={inputs.walletKeys}
					onChange={(e) => set({ walletKeys: e.target.checked })}
				/>
				This Wallet's outgoing keys
			</label>
			<label className="flex flex-col gap-1">
				<span className="text-xs text-muted-foreground">Outgoing viewing key (OVK)</span>
				<Input
					value={inputs.ovk}
					onChange={(e) => set({ ovk: e.target.value })}
					placeholder="32 bytes, hex"
					className="font-mono text-xs"
					spellCheck={false}
				/>
			</label>
			<div className="flex flex-col gap-2">
				<span className="text-xs text-muted-foreground">
					Outgoing cipher keys (OCK), one per output
				</span>
				{inputs.ocks.map((o, i) => (
					<div key={i} className="flex items-center gap-2">
						<select
							value={o.pool}
							onChange={(e) => setOck(i, { pool: parsePool(e.target.value) })}
							className="h-9 rounded-md border border-input bg-transparent px-2 text-xs"
						>
							<option value="orchard">orchard</option>
							<option value="sapling">sapling</option>
							<option value="ironwood">ironwood</option>
						</select>
						<Input
							type="number"
							min={0}
							value={o.index}
							onChange={(e) => setOck(i, { index: Number(e.target.value) })}
							className="w-16 font-mono text-xs"
						/>
						<Input
							value={o.ock}
							onChange={(e) => setOck(i, { ock: e.target.value })}
							placeholder="32 bytes, hex"
							className="font-mono text-xs"
							spellCheck={false}
						/>
						<button
							type="button"
							onClick={() => set({ ocks: inputs.ocks.filter((_, j) => j !== i) })}
							className="text-muted-foreground hover:text-foreground"
							aria-label="Remove OCK"
						>
							<IconX className="size-4" />
						</button>
					</div>
				))}
				<button
					type="button"
					onClick={() =>
						set({ ocks: [...inputs.ocks, { pool: "orchard", index: inputs.ocks.length, ock: "" }] })
					}
					className="flex w-fit items-center gap-1 text-xs text-primary hover:underline"
				>
					<IconPlus className="size-3" />
					Add an OCK
				</button>
			</div>
			<label className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-300">
				<input
					type="checkbox"
					checked={inputs.tamper}
					onChange={(e) => set({ tamper: e.target.checked })}
				/>
				Demo: include a tampered output
			</label>
		</div>
	);
}
