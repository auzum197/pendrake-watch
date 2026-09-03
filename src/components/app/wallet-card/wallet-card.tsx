import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
	IconAlertCircle,
	IconChevronDown,
	IconPlus,
	IconWallet,
} from "@tabler/icons-react";
import {
	listWallets,
	onSyncEvent,
	type WalletState,
	type WalletSummary,
} from "@/lib/ipc";
import { orderWallets } from "@/lib/wallet-recency";
import { openWalletPalette } from "@/lib/wallet-palette";
import { LifeHashIcon } from "@/components/onboarding/lifehash";
import { Kbd, MOD_KEY } from "@/components/ui/kbd/kbd";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { WalletRow } from "../wallet-row/wallet-row";
import { DiscreetEye } from "../discreet-eye/discreet-eye";
import { switchWallet } from "./switch-wallet";
import { useFold, useHeight } from "./use-fold";
import "./wallet-card.css";

function selectedDisplayName(wallet: WalletState | null): string {
	const custom = wallet?.label?.trim();
	if (custom) return custom;
	if (wallet?.fingerprint) return wallet.fingerprint.slice(0, 8);
	return "—";
}

function shortFingerprint(fingerprint: string | null): string {
	return fingerprint ? fingerprint.slice(0, 8) : "watch-only";
}

function WalletAvatar({ fingerprint }: { fingerprint: string | null }) {
	const shape = "size-10 shrink-0 rounded-full";
	return fingerprint ? (
		<LifeHashIcon fingerprint={fingerprint} className={shape} />
	) : (
		<span className={`flex items-center justify-center bg-brand text-white ${shape}`}>
			<IconWallet className="size-4" />
		</span>
	);
}

const HEAD_FALLBACK_PX = 72;

export function WalletCard({
	wallet,
	switching,
}: {
	wallet: WalletState | null;
	switching?: boolean;
}) {
	const navigate = useNavigate();
	const [wallets, setWallets] = useState<WalletSummary[]>([]);
	const [busy, setBusy] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const slabRef = useRef<HTMLDivElement>(null);
	const headRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const { open, animate, settle, toggle } = useFold(slabRef);
	const headH = useHeight(headRef) || HEAD_FALLBACK_PX;
	const bodyH = useHeight(contentRef);

	useEffect(() => {
		if (!open) return;
		let active = true;
		const refresh = () =>
			listWallets()
				.then((list) => active && setWallets(list))
				.catch(() => active && setWallets([]));
		refresh();
		const unlisten = onSyncEvent((ev) => {
			if (ev.event === "finished" || ev.event === "transaction") refresh();
		});
		return () => {
			active = false;
			unlisten.then((fn) => fn()).catch(() => {});
		};
	}, [open, wallet?.walletId, wallet?.fingerprint, wallet?.label]);

	useEffect(() => {
		if (!open) return;
		function onPointerDown(e: PointerEvent) {
			if (!rootRef.current?.contains(e.target as Node)) settle(false);
		}
		function onKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") settle(false);
		}
		document.addEventListener("pointerdown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	});

	async function onPick(id: string) {
		settle(false);
		if (busy || id === wallet?.walletId) return;
		setBusy(true);
		try {
			await switchWallet(id);
		} finally {
			setBusy(false);
		}
	}

	function onAdd() {
		settle(false);
		navigate({ to: "/onboarding", search: { mode: "add" } });
	}

	function onSearch() {
		settle(false);
		openWalletPalette();
	}

	const headerName = selectedDisplayName(wallet);
	const others = orderWallets(wallets, wallet?.walletId ?? null).filter(
		(w) => !w.selected,
	);

	return (
		<div ref={rootRef} className="wallet-card" style={{ height: headH }}>
			<div
				ref={slabRef}
				className="wallet-card-slab"
				data-open={open}
				data-reduced={animate ? undefined : ""}
				style={{ "--body-h": `${bodyH}px` } as CSSProperties}
			>
				<div
					ref={headRef}
					role="button"
					tabIndex={0}
					aria-expanded={open}
					aria-label="Switch wallet"
					onClick={() => !switching && toggle()}
					onKeyDown={(e) => {
						if (e.target !== e.currentTarget) return;
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							toggle();
						}
					}}
					className="wallet-card-head"
				>
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
							<WalletAvatar fingerprint={wallet?.fingerprint ?? null} />
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-1.5">
									<p className="wallet-card-name truncate">{headerName}</p>
									<span onClick={(e) => e.stopPropagation()}>
										<DiscreetEye />
									</span>
								</div>
								<div className="mt-1 flex items-center gap-2">
									<span className="wallet-card-fp truncate">
										{shortFingerprint(wallet?.fingerprint ?? null)}
									</span>
									{wallet?.unavailable && (
										<IconAlertCircle
											className="size-3.5 shrink-0 text-red-400"
											aria-label="Unavailable"
										/>
									)}
								</div>
							</div>
						</>
					)}
					<IconChevronDown className="wallet-card-chevron size-4 shrink-0" />
				</div>

				<div className="wallet-card-body" inert={!open}>
					<div ref={contentRef} className="wallet-card-content">
						{wallets.length === 0 ? (
							<div className="fold-item flex items-center gap-3 px-4 py-2.5" style={{ "--i": 0 } as CSSProperties}>
								<Skeleton className="size-9 shrink-0 rounded-full bg-white/10" />
								<Skeleton className="h-3 w-24 bg-white/10" />
							</div>
						) : others.length === 0 ? (
							<p className="fold-item px-4 py-3 text-xs text-white/50" style={{ "--i": 0 } as CSSProperties}>
								No other wallets
							</p>
						) : (
							<ul
								role="listbox"
								aria-label="Other wallets"
								className="max-h-72 divide-y divide-white/[0.06] overflow-y-auto"
							>
								{others.map((w, i) => (
									<WalletRow
										key={w.id}
										wallet={w}
										disabled={busy}
										onPick={onPick}
										className="fold-item"
										style={{ "--i": i } as CSSProperties}
									/>
								))}
							</ul>
						)}
						<div
							className="wallet-card-foot fold-item"
							style={{ "--i": Math.max(others.length, 1) } as CSSProperties}
						>
							<button
								type="button"
								disabled={busy}
								onClick={onAdd}
								className="wallet-card-add"
							>
								<IconPlus className="size-4" />
								Add wallet
							</button>
							<button type="button" onClick={onSearch} className="wallet-card-search">
								Search
								<Kbd>{MOD_KEY}K</Kbd>
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
