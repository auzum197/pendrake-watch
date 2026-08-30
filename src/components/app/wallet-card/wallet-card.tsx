import { useEffect, useState } from "react";
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
import { formatZec, isActivelySyncing, isSynced } from "@/lib/format";
import {
	clearWalletSnapshotCache,
	reloadWalletData,
	setCachedWallet,
} from "@/hooks/use-wallet-data";
import { LifeHashIcon } from "@/components/onboarding/lifehash";
import { LifeHashAvatar } from "@/components/onboarding/lifehash-avatar";
import { DiscreetValue } from "@/components/ui/discreet-value/discreet-value";
import { DotStream } from "@/components/ui/dot-stream/dot-stream";
import { SyncGlyph } from "../sync-status/sync-status";

/** Display name for the active wallet: custom label, else short fingerprint. */
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
	walletSyncs,
	walletBalances,
}: {
	wallet: WalletState | null;
	sync: SyncStatus | null;
	walletSyncs?: Record<string, SyncStatus | null>;
	walletBalances?: Record<string, bigint>;
}) {
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const [wallets, setWallets] = useState<WalletSummary[]>([]);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		if (!open) return;
		listWallets()
			.then(setWallets)
			.catch(() => setWallets([]));
	}, [open, wallet?.walletId, wallet?.fingerprint, wallet?.label]);

	async function onPick(id: string) {
		if (busy || id === wallet?.walletId) {
			setOpen(false);
			return;
		}
		setBusy(true);
		try {
			const state = await selectWallet(id);
			setOpen(false);
			await softSwitchTo(state);
		} catch (e) {
			toast.error(String(e));
		} finally {
			setBusy(false);
		}
	}

	function onAdd() {
		setOpen(false);
		navigate({ to: "/onboarding", search: { mode: "add" } });
	}

	const headerName = activeDisplayName(wallet);

	return (
		<div className="relative mt-5 flex flex-col rounded-[1rem] border border-white/10 bg-white/4 p-4">
			<div className="flex items-center gap-3">
				<WalletAvatar fingerprint={wallet?.fingerprint ?? null} size={10} />
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-semibold leading-tight text-white">
						<DiscreetValue kind="label">{headerName}</DiscreetValue>
					</p>
					<div className="mt-1 flex items-center gap-2">
						<span className="truncate font-mono text-xs text-white/45">
							{shortFingerprint(wallet?.fingerprint ?? null)}
						</span>
						<span className="flex shrink-0 items-center gap-2">
							<SyncGlyph sync={sync} />
						</span>
					</div>
				</div>
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

			{open && (
				<div
					className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-[1rem] border border-white/10 bg-ink-soft"
					role="listbox"
				>
					{wallets.length === 0 ? (
						<p className="px-3 py-3 text-xs text-white/50">No wallets</p>
					) : (
						<ul className="max-h-72 divide-y divide-white/[0.06] overflow-y-auto">
							{wallets.map((w) => {
								const fp = w.fingerprint ? w.fingerprint.slice(0, 8) : null;
								const named = fp ? w.label !== fp : w.label.length > 0;
								const wsync = walletSyncs?.[w.id] ?? null;
								const balance = walletBalances?.[w.id];
								const showBalance = isSynced(wsync) && balance !== undefined;
								const showLoader = isActivelySyncing(wsync);
								return (
									<li key={w.id}>
										<button
											type="button"
											role="option"
											aria-selected={w.active}
											disabled={busy}
											onClick={() => onPick(w.id)}
											className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/5"
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
														<p className="truncate text-sm font-medium text-white">
															<DiscreetValue kind="label">{w.label}</DiscreetValue>
														</p>
														{fp && (
															<p className="mt-0.5 truncate font-mono text-xs text-white/45">
																{fp}
															</p>
														)}
													</>
												) : (
													<p className="truncate font-mono text-sm font-medium text-white">
														{fp ?? w.label}
													</p>
												)}
											</div>
											{showBalance ? (
												<div className="shrink-0 text-right">
													<p className="font-mono text-xs font-medium tabular-nums text-white">
														<DiscreetValue kind="zec">
															{formatZec(balance)}
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
						className="flex w-full items-center gap-2 border-t border-white/10 px-3 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/5 disabled:opacity-40"
					>
						<IconPlus className="size-4" />
						Add wallet
					</button>
				</div>
			)}
		</div>
	);
}
