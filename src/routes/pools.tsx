import { type ComponentType, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
	IconArrowLeft,
	IconChevronRight,
	IconPlant,
	IconTrees,
} from "@tabler/icons-react";
import { RingsIcon } from "@/components/pools/rings-icon";
import { Sparkline } from "@/components/pools/sparkline";
import { useNotesData } from "@/hooks/use-notes-data";
import { useWalletData } from "@/hooks/use-wallet-data";
import { formatZat, formatZec } from "@/lib/format";
import type { Pool } from "@/lib/ipc";
import { type PoolStat, poolStats } from "@/lib/pools";
import { animationsEnabled } from "@/lib/motion";
import "@/components/app/reveal.css";

// The Pools breakdown, reachable from the Home hero's Pools button and absent from
// the sidebar (it's a drill-down, not a primary screen). Each pool reads as a card
// with its share and recent movement up front; the arrow expands the note-level
// detail beneath it.

const POOL_META: Record<
	Pool,
	{
		title: string;
		Icon: ComponentType<{ className?: string }>;
		tile: string;
		iconClass: string;
	}
> = {
	orchard: {
		title: "Orchard",
		Icon: IconTrees,
		tile: "bg-brand/15 text-brand",
		iconClass: "size-8",
	},
	sapling: {
		title: "Sapling",
		Icon: IconPlant,
		tile: "bg-brand/15 text-brand",
		iconClass: "size-8",
	},
	transparent: {
		title: "Transparent",
		Icon: RingsIcon,
		tile: "bg-[#4a2913]",
		iconClass: "size-8",
	},
};

export function PoolsPage() {
	const navigate = useNavigate();
	const { balance, txs } = useWalletData();
	const { notes } = useNotesData();
	const [reveal] = useState(animationsEnabled);

	const stats = useMemo(
		() => poolStats(balance, txs, notes),
		[balance, txs, notes],
	);

	return (
		<>
			<div className="flex items-center gap-3">
				<button
					type="button"
					onClick={() => navigate({ to: "/dashboard" })}
					className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground active:scale-[0.97]"
				>
					<IconArrowLeft className="size-4" />
					Back
				</button>
				<h1 className="font-heading text-xl font-bold">Pools</h1>
			</div>

			<div className="flex flex-col gap-4">
				{stats.map((stat, i) => (
					<div
						key={stat.pool}
						className={reveal ? "reveal-up" : ""}
						style={reveal ? { animationDelay: `${i * 60}ms` } : undefined}
					>
						<PoolCard stat={stat} />
					</div>
				))}
			</div>
		</>
	);
}

function PoolCard({ stat }: { stat: PoolStat }) {
	const [open, setOpen] = useState(false);
	const meta = POOL_META[stat.pool];

	return (
		<section className="rounded-2xl border border-border bg-card p-8">
			<div className="flex items-center gap-6">
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-4">
						<span
							className={`flex size-14 shrink-0 items-center justify-center rounded-lg ${meta.tile}`}
						>
							<meta.Icon className={meta.iconClass} />
						</span>
						<h2 className="font-heading text-4xl font-bold">{meta.title}</h2>
					</div>
					<hr className="my-6 border-border" />
					{/* Fixed first column so "Last activity" lines up across cards no matter
              how wide the share figure is (7% vs 100%). */}
					<div className="grid grid-cols-[7rem_auto] gap-x-10">
						<Stat label="Share" value={`${Math.round(stat.share)}%`} />
						<Stat
							label="Last activity"
							value={lastActivity(stat.lastActivity)}
						/>
					</div>
				</div>

				{/* The trend takes half the card's width, with the toggle pinned right.
            A pool that never moved off zero has nothing to plot, so it shows a
            "No data" box in the same slot. */}
				{stat.trend.length >= 2 && Math.max(...stat.trend) > 0 ? (
					<Sparkline
						values={stat.trend}
						className="hidden h-20 w-1/2 shrink-0 md:block"
					/>
				) : (
					<div className="hidden h-20 w-1/2 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-sm font-medium text-muted-foreground md:flex">
						No data
					</div>
				)}
				<button
					type="button"
					onClick={() => setOpen((o) => !o)}
					aria-expanded={open}
					aria-label={open ? "Hide pool details" : "Show pool details"}
					className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-muted-foreground/40 hover:text-foreground active:scale-[0.97]"
				>
					<IconChevronRight
						className={`size-5 transition-transform duration-200 ease-out-soft ${
							open ? "rotate-90" : ""
						}`}
					/>
				</button>
			</div>

			{/* The detail grid expands beneath the card. Animating grid-template-rows
          (with opacity) resizes the card smoothly; the border-top rides inside the
          clipped region so it doesn't peek through while collapsed. */}
			<div
				className="grid duration-300 ease-out-soft motion-safe:transition-[grid-template-rows,opacity]"
				style={{
					gridTemplateRows: open ? "1fr" : "0fr",
					opacity: open ? 1 : 0,
				}}
			>
				<div className="overflow-hidden">
					<div className="mt-5 grid grid-cols-2 gap-x-12 gap-y-5 border-t border-border pt-5 sm:grid-cols-4">
						<Stat
							label="Largest note"
							value={stat.largest != null ? formatZat(stat.largest) : "—"}
							unit={stat.largest != null ? "zat" : undefined}
						/>
						<Stat
							label="Smallest note"
							value={stat.smallest != null ? formatZat(stat.smallest) : "—"}
							unit={stat.smallest != null ? "zat" : undefined}
						/>
						<Stat label="Notes" value={String(stat.noteCount)} />
						<NetFlow flow={stat.netFlow} />
					</div>
				</div>
			</div>
		</section>
	);
}

function Stat({
	label,
	value,
	unit,
}: {
	label: string;
	value: string;
	unit?: string;
}) {
	return (
		<div>
			<div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
				{label}
			</div>
			<div className="mt-2 font-heading text-3xl font-bold tabular-nums">
				{value}
				{unit && (
					<span className="ml-1.5 text-base font-normal text-muted-foreground">
						{unit}
					</span>
				)}
			</div>
		</div>
	);
}

function NetFlow({ flow }: { flow: bigint }) {
	if (flow === 0n) return <Stat label="Net flow" value="—" />;
	const positive = flow > 0n;
	const abs = positive ? flow : -flow;
	return (
		<div>
			<div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
				Net flow
			</div>
			<div
				className={`mt-2 font-heading text-3xl font-bold tabular-nums ${
					positive ? "text-emerald-400" : "text-foreground"
				}`}
			>
				{positive ? "+" : "−"}
				{formatZec(abs)}
				<span className="ml-1.5 text-base font-normal text-muted-foreground">
					ZEC
				</span>
			</div>
		</div>
	);
}

// The pool's last movement as a relative day: Today / Yesterday, then a short date.
// Timestamps arrive in the daemon's unit (unix seconds), so sniff seconds vs millis.
function lastActivity(epoch: number | null): string {
	if (!epoch) return "—";
	const ms = epoch < 1e12 ? epoch * 1000 : epoch;
	const d = new Date(ms);
	const now = new Date();
	const sameDay = (a: Date, b: Date) =>
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate();
	if (sameDay(d, now)) return "Today";
	const yesterday = new Date(now);
	yesterday.setDate(now.getDate() - 1);
	if (sameDay(d, yesterday)) return "Yesterday";
	return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
