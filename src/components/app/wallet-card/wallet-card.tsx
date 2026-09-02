import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { IconPlus, IconSelector, IconWallet } from "@tabler/icons-react";
import {
	listWallets,
	type Network,
	selectWallet,
	type SyncStatus,
	type WalletState,
	type WalletSummary,
} from "@/lib/ipc";
import { formatZecApprox, isActivelySyncing } from "@/lib/format";
import {
	beginWalletSwitch,
	clearWalletSnapshotCache,
	reloadWalletData,
	setCachedWallet,
} from "@/hooks/use-wallet-data";
import { LifeHashIcon } from "@/components/onboarding/lifehash";
import { LifeHashAvatar } from "@/components/onboarding/lifehash-avatar";
import { DiscreetValue } from "@/components/ui/discreet-value/discreet-value";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { DotStream } from "@/components/ui/dot-stream/dot-stream";
import { SyncGlyph } from "../sync-status/sync-status";
import { DiscreetEye } from "../discreet-eye/discreet-eye";

function activeDisplayName(wallet: WalletState | null): string {
	const custom = wallet?.label?.trim();
	if (custom) return custom;
	if (wallet?.fingerprint) return wallet.fingerprint.slice(0, 8);
	return "—";
}

function shortFingerprint(fingerprint: string | null): string {
	return fingerprint ? fingerprint.slice(0, 8) : "watch-only";
}

const TICKER: Record<Network, string> = {
	mainnet: "ZEC",
	regtest: "ZEC",
};

async function softSwitchTo(state: WalletState) {
	setCachedWallet(state);
	clearWalletSnapshotCache();
	reloadWalletData();
}

const RECENCY_KEY = "pendrake.walletRecency";

function readRecency(): Record<string, number> {
	try {
		const raw = localStorage.getItem(RECENCY_KEY);
		return raw ? JSON.parse(raw) : {};
	} catch {
		return {};
	}
}

function markUsed(id: string) {
	const recency = readRecency();
	recency[id] = Date.now();
	localStorage.setItem(RECENCY_KEY, JSON.stringify(recency));
}

function orderWallets(wallets: WalletSummary[], activeId: string | null): WalletSummary[] {
	const recency = readRecency();
	const others = wallets
		.filter((w) => w.id !== activeId)
		.sort((a, b) => {
			const ra = recency[a.id];
			const rb = recency[b.id];
			if (ra !== undefined && rb !== undefined) return rb - ra;
			if (ra !== undefined) return -1;
			if (rb !== undefined) return 1;
			return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
		});
	const active = wallets.find((w) => w.id === activeId);
	return active ? [...others, active] : others;
}

function avatarShape(size: 9 | 10): string {
	return `shrink-0 rounded-full ${size === 10 ? "size-10" : "size-9"}`;
}

function WalletAvatar({
	fingerprint,
	size = 9,
}: {
	fingerprint: string | null;
	size?: 9 | 10;
}) {
	const shape = avatarShape(size);
	return fingerprint ? (
		<LifeHashIcon fingerprint={fingerprint} className={shape} />
	) : (
		<span className={`flex items-center justify-center bg-brand text-white ${shape}`}>
			<IconWallet className="size-4" />
		</span>
	);
}

export function WalletCard({
	wallet,
	sync,
	switching,
}: {
	wallet: WalletState | null;
	sync: SyncStatus | null;
	switching?: boolean;
}) {
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const [wallets, setWallets] = useState<WalletSummary[]>([]);
	const [busy, setBusy] = useState(false);
	const [render, setRender] = useState(false);
	const [shown, setShown] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		listWallets()
			.then(setWallets)
			.catch(() => setWallets([]));
	}, [open, wallet?.walletId, wallet?.fingerprint, wallet?.label]);

	useEffect(() => {
		if (!open) return;
		function onPointerDown(e: PointerEvent) {
			if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
		}
		document.addEventListener("pointerdown", onPointerDown);
		return () => document.removeEventListener("pointerdown", onPointerDown);
	}, [open]);

	useEffect(() => {
		if (open) {
			setRender(true);
			const raf = requestAnimationFrame(() =>
				requestAnimationFrame(() => setShown(true)),
			);
			return () => cancelAnimationFrame(raf);
		}
		setShown(false);
		const t = setTimeout(() => setRender(false), 160);
		return () => clearTimeout(t);
	}, [open]);

	async function onPick(id: string) {
		if (busy || id === wallet?.walletId) {
			setOpen(false);
			return;
		}
		setBusy(true);
		setOpen(false);
		beginWalletSwitch();
		try {
			const state = await selectWallet(id);
			markUsed(id);
			await softSwitchTo(state);
		} catch (e) {
			toast.error(String(e));
			reloadWalletData();
		} finally {
			setBusy(false);
		}
	}

	function onAdd() {
		setOpen(false);
		navigate({ to: "/onboarding", search: { mode: "add" } });
	}

	const headerName = activeDisplayName(wallet);
	const orderedWallets = orderWallets(wallets, wallet?.walletId ?? null);

	return (
		<div
			ref={rootRef}
			className="relative mt-5 flex flex-col rounded-[1rem] border border-white/10 bg-white/4 p-4"
		>
			<div className="flex items-center gap-3">
				{switching ? (
					<>
						<Skeleton className="size-10 shrink-0 rounded-full bg-white/10" />
						<div className="min-w-0 flex-1 space-y-1.5">
							<Skeleton className="h-3 w-24 bg-white/10" />
							<Skeleton className="h-2.5 w-16 bg-white/10" />
						</div>
					</>
				) : (
					<>
						<WalletAvatar fingerprint={wallet?.fingerprint ?? null} size={10} />
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-1.5">
								<p className="truncate text-xs font-semibold leading-tight text-white">
									{headerName}
								</p>
								<DiscreetEye />
							</div>
							<div className="mt-1 flex items-center gap-2">
								<span className="truncate font-mono text-[10px] text-white/45">
									{shortFingerprint(wallet?.fingerprint ?? null)}
								</span>
								<span className="flex shrink-0 items-center gap-2">
									<SyncGlyph sync={sync} />
								</span>
							</div>
						</div>
					</>
				)}
				<button
					type="button"
					onClick={() => setOpen((o) => !o)}
					aria-expanded={open}
					aria-haspopup="listbox"
					aria-label="Switch wallet"
					className="-mr-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white/70 outline-none focus-visible:ring-2 focus-visible:ring-brand"
				>
					<IconSelector className="size-4" />
				</button>
			</div>

			{render && (
				<div
					data-shown={shown}
					className="absolute -inset-x-px top-full z-20 mt-2 origin-top overflow-hidden rounded-[1rem] border border-white/10 bg-ink-soft transition-[opacity,transform] ease-[var(--ease-out-soft)] will-change-transform data-[shown=false]:-translate-y-1 data-[shown=false]:scale-[0.97] data-[shown=false]:opacity-0 data-[shown=false]:duration-[130ms] data-[shown=true]:translate-y-0 data-[shown=true]:scale-100 data-[shown=true]:opacity-100 data-[shown=true]:duration-[190ms] motion-reduce:translate-y-0 motion-reduce:scale-100 motion-reduce:transition-[opacity]"
					role="listbox"
				>
					{wallets.length === 0 ? (
						<p className="px-4 py-3 text-xs text-white/50">No wallets</p>
					) : (
						<ul className="max-h-72 divide-y divide-white/[0.06] overflow-y-auto">
							{orderedWallets.map((w) => {
								const fp = w.fingerprint ? w.fingerprint.slice(0, 8) : null;
								const named = fp ? w.label !== fp : w.label.length > 0;
								const balance =
									w.lastBalance != null ? BigInt(w.lastBalance) : undefined;
								const showLoader = w.active && isActivelySyncing(sync);
								const showBalance = balance !== undefined && !showLoader;
								return (
									<li key={w.id}>
										<button
											type="button"
											role="option"
											aria-selected={w.active}
											disabled={busy}
											onClick={() => onPick(w.id)}
											className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5"
										>
											{w.fingerprint && (
												<LifeHashAvatar
													fingerprint={w.fingerprint}
													className={avatarShape(9)}
													ringed={w.active}
												/>
											)}
											<div className="min-w-0 flex-1">
												{named ? (
													<>
														<p className="truncate text-xs font-medium text-white">
															{w.label}
														</p>
														{fp && (
															<p className="mt-0.5 truncate font-mono text-[10px] text-white/45">
																{fp}
															</p>
														)}
													</>
												) : (
													<p className="truncate font-mono text-xs font-medium text-white">
														{fp ?? w.label}
													</p>
												)}
											</div>
											{showBalance ? (
												<div className="shrink-0 text-right">
													<p className="font-mono text-xs font-medium tabular-nums text-white">
														<DiscreetValue kind="zec" peekable={false}>
															{formatZecApprox(balance)}
														</DiscreetValue>
													</p>
													<p className="mt-0.5 text-[10px] text-white/45">
														{TICKER[w.network]}
													</p>
												</div>
											) : showLoader ? (
												<span className="flex size-8 shrink-0 items-center justify-center">
													<DotStream className="text-white/45" />
												</span>
											) : null}
										</button>
									</li>
								);
							})}
						</ul>
					)}
					<button
						type="button"
						disabled={busy}
						onClick={onAdd}
						className="flex w-full items-center gap-2 border-t border-white/10 px-4 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/5 disabled:opacity-40"
					>
						<IconPlus className="size-4" />
						Add wallet
					</button>
				</div>
			)}
		</div>
	);
}
