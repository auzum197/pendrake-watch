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
	setWalletLabel,
	type Network,
	type WalletState,
	type WalletSummary,
} from "@/lib/ipc";
import { orderWallets } from "@/lib/wallet-recency";
import { openWalletPalette } from "@/lib/wallet-palette";
import { setCachedWallet } from "@/hooks/use-wallet-data";
import { LifeHashIcon } from "@/components/onboarding/lifehash";
import { Kbd, MOD_KEY } from "@/components/ui/kbd/kbd";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { RemoveDialog } from "@/components/settings/remove-dialog";
import { WalletRow } from "../wallet-row/wallet-row";
import {
	WalletContextMenu,
	WalletMenu,
	type WalletMenuTarget,
} from "../wallet-menu/wallet-menu";
import { DiscreetEye } from "../discreet-eye/discreet-eye";
import { appToast } from "../app-toast/app-toast";
import { InlineName } from "./inline-name";
import { switchWallet } from "./switch-wallet";
import { useFold, useHeight } from "./use-fold";
import "./wallet-card.css";
import "../wallet-menu/wallet-menu.css";

function selectedDisplayName(wallet: WalletState | null): string {
	const custom = wallet?.label?.trim();
	if (custom) return custom;
	if (wallet?.fingerprint) return wallet.fingerprint.slice(0, 8);
	return "—";
}

function shortFingerprint(fingerprint: string | null): string {
	return fingerprint ? fingerprint.slice(0, 8) : "watch-only";
}

// The label a row is renamed from: its own, or nothing when it only shows the
// fingerprint the daemon fell back to.
function customLabel(wallet: WalletSummary): string {
	const fp = wallet.fingerprint ? wallet.fingerprint.slice(0, 8) : null;
	return wallet.label === fp ? "" : wallet.label;
}

function WalletAvatar({ fingerprint }: { fingerprint: string | null }) {
	const shape = "size-10 rounded-full";
	return fingerprint ? (
		<LifeHashIcon fingerprint={fingerprint} className={shape} />
	) : (
		<span className={`flex items-center justify-center bg-brand text-white ${shape}`}>
			<IconWallet className="size-4" />
		</span>
	);
}

type RemoveTarget = {
	id: string;
	fingerprint: string | null;
	network: Network;
};

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
	const [editingId, setEditingId] = useState<string | null>(null);
	const [removing, setRemoving] = useState<RemoveTarget | null>(null);
	const [removeOpen, setRemoveOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const slabRef = useRef<HTMLDivElement>(null);
	const headRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const { open, animate, settle, toggle } = useFold(slabRef);
	const headH = useHeight(headRef) || HEAD_FALLBACK_PX;
	const bodyH = useHeight(contentRef);

	function reload() {
		listWallets()
			.then(setWallets)
			.catch(() => setWallets([]));
	}

	useEffect(() => {
		if (!open) return;
		reload();
		const unlisten = onSyncEvent((ev) => {
			if (ev.event === "finished" || ev.event === "transaction") reload();
		});
		return () => {
			unlisten.then((fn) => fn()).catch(() => {});
		};
	}, [open, wallet?.walletId, wallet?.fingerprint, wallet?.label]);

	useEffect(() => {
		if (!open) return;
		function onPointerDown(e: PointerEvent) {
			const target = e.target instanceof Element ? e.target : null;
			if (!target || rootRef.current?.contains(target)) return;
			// A portaled menu sits outside the card. Picking an item there must not
			// fold the card away underneath it first.
			if (target.closest("[data-wallet-menu]")) return;
			settle(false);
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

	const close = () => settle(false);

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

	function askRemove(target: RemoveTarget) {
		setRemoving(target);
		setRemoveOpen(true);
	}

	async function commitRename(id: string, before: string, after: string) {
		setEditingId(null);
		const label = after.trim();
		if (label === before) return;
		try {
			const state = await setWalletLabel(id, label);
			if (id === wallet?.walletId) setCachedWallet(state);
			reload();
		} catch (e) {
			appToast.error("Couldn't rename Wallet", String(e));
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
	const headId = wallet?.walletId ?? null;
	const headTarget: WalletMenuTarget | null =
		headId && !switching
			? { id: headId, label: headerName, selected: true }
			: null;
	const others = orderWallets(wallets, wallet?.walletId ?? null).filter(
		(w) => !w.selected,
	);

	const head = (
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
					<span className="wallet-avatar shrink-0">
						<WalletAvatar fingerprint={wallet?.fingerprint ?? null} />
						{headTarget && (
							<span className="wallet-avatar-overlay">
								<WalletMenu
									wallet={headTarget}
									onRename={() => setEditingId(headTarget.id)}
									onRemove={() =>
										askRemove({
											id: headTarget.id,
											fingerprint: wallet?.fingerprint ?? null,
											network: wallet?.network ?? "mainnet",
										})
									}
									onClose={close}
								/>
							</span>
						)}
					</span>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-1.5">
							{headId && editingId === headId ? (
								<InlineName
									value={wallet?.label ?? ""}
									placeholder={shortFingerprint(wallet?.fingerprint ?? null)}
									className="wallet-rename-head"
									onCommit={(next) =>
										commitRename(headId, wallet?.label ?? "", next)
									}
									onCancel={() => setEditingId(null)}
								/>
							) : (
								<p className="wallet-card-name truncate">{headerName}</p>
							)}
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
				{headTarget ? (
					<WalletContextMenu
						wallet={headTarget}
						onRename={() => setEditingId(headTarget.id)}
						onRemove={() =>
							askRemove({
								id: headTarget.id,
								fingerprint: wallet?.fingerprint ?? null,
								network: wallet?.network ?? "mainnet",
							})
						}
						onClose={close}
					>
						{head}
					</WalletContextMenu>
				) : (
					head
				)}

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
								{others.map((w, i) => {
									const editing = editingId === w.id;
									const custom = customLabel(w);
									const remove = () =>
										askRemove({
											id: w.id,
											fingerprint: w.fingerprint,
											network: w.network,
										});
									return (
										<WalletContextMenu
											key={w.id}
											wallet={w}
											onRename={() => setEditingId(w.id)}
											onRemove={remove}
											onClose={close}
										>
											<WalletRow
												wallet={w}
												disabled={busy}
												onPick={editing ? () => {} : onPick}
												className="fold-item"
												style={{ "--i": i } as CSSProperties}
												name={
													editing ? (
														<InlineName
															value={custom}
															placeholder={
																w.fingerprint ? w.fingerprint.slice(0, 8) : w.label
															}
															onCommit={(next) => commitRename(w.id, custom, next)}
															onCancel={() => setEditingId(null)}
														/>
													) : undefined
												}
												avatarOverlay={
													editing ? undefined : (
														<WalletMenu
															wallet={w}
															onRename={() => setEditingId(w.id)}
															onRemove={remove}
															onClose={close}
														/>
													)
												}
											/>
										</WalletContextMenu>
									);
								})}
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

			<RemoveDialog
				open={removeOpen}
				onOpenChange={setRemoveOpen}
				walletId={removing?.id ?? null}
				fingerprint={removing?.fingerprint ?? null}
				network={removing?.network ?? "mainnet"}
			/>
		</div>
	);
}
