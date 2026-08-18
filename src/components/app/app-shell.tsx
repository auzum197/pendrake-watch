import { type ReactNode, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
	IconActivity,
	IconAlertTriangle,
	IconHelpCircle,
	IconHome,
	IconListDetails,
	IconLock,
	IconSettings,
	IconWallet,
} from "@tabler/icons-react";
import {
	lock,
	listWallets,
	removeWallet,
	selectWallet,
	type SyncStatus,
	type WalletState,
	type WalletSummary,
} from "@/lib/ipc";
import {
	clearWalletSnapshotCache,
	reloadWalletData,
	setCachedWallet,
} from "@/hooks/use-wallet-data";
import { useFeature } from "@/lib/features";
import { animationsEnabled } from "@/lib/motion";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LifeHashIcon } from "@/components/onboarding/lifehash";
import { DiscreetEye } from "./discreet-eye";
import pendrakeLogo from "@/assets/pendrake-logo.svg";
import { Toaster } from "@/components/ui/sonner";
import { isSyncing, SyncBar, SyncChip } from "./sync-status";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import "./nav-reveal.css";

const NETWORK_TINT: Record<string, string> = {
	mainnet: "bg-emerald-500/15 text-emerald-300",
	testnet: "bg-amber-500/15 text-amber-300",
	regtest: "bg-violet-500/15 text-violet-300",
};

function NetworkBadge({ network }: { network?: string }) {
	const tint = (network && NETWORK_TINT[network]) || "bg-white/10 text-white/70";
	return (
		<span
			className={`inline-flex items-center rounded-full px-[7px] py-[2px] text-[11px] font-medium capitalize leading-[1.45] ${tint}`}
		>
			{network ?? "Watch-only"}
		</span>
	);
}

let aboutWindow: WebviewWindow | null = null;

async function openAbout() {
	if (aboutWindow) {
		try {
			await aboutWindow.setFocus();
			return;
		} catch {
			aboutWindow = null;
		}
	}
	const win = new WebviewWindow("about", {
		url: "about.html",
		title: "About Pendrake Watch",
		width: 400,
		height: 360,
		resizable: false,
		center: true,
	});
	win.once("tauri://destroyed", () => {
		aboutWindow = null;
	});
	aboutWindow = win;
}

type Section = "wallet" | "activity" | "notes" | "settings";

export function AppShell({
	active,
	wallet,
	sync,
	children,
}: {
	active: Section;
	wallet: WalletState | null;
	sync: SyncStatus | null;
	children: ReactNode;
}) {
	return (
		<div className="app-frame fixed inset-0 z-50 flex bg-ink text-foreground">
			<AppSidebar active={active} wallet={wallet} sync={sync} />
			<div className="relative my-3 mr-3 flex-1 rounded-2xl border-2 border-border bg-background">
				<main
					data-scroll-restoration-id="app-main"
					className="app-content absolute inset-0 overflow-y-auto rounded-2xl"
				>
					<div className="flex min-h-full flex-col gap-6 px-8 py-7">
						{children}
					</div>
				</main>
			</div>
			<UnreachableToast
				unreachable={sync?.unreachable ?? false}
				onSettings={active === "settings"}
			/>
			<WrongChainToast
				wrongChain={sync?.wrongChain ?? false}
				onSettings={active === "settings"}
			/>
			<Toaster position="bottom-right" />
		</div>
	);
}

const UNREACHABLE_TOAST = "indexer-unreachable";

function UnreachableToast({
	unreachable,
	onSettings,
}: {
	unreachable: boolean;
	onSettings: boolean;
}) {
	const navigate = useNavigate();
	useEffect(() => {
		if (unreachable && !onSettings) {
			toast("Can't reach your Indexer.", {
				id: UNREACHABLE_TOAST,
				duration: Infinity,
				icon: <IconAlertTriangle className="size-4" />,
				action: {
					label: "Change Indexer",
					onClick: () => navigate({ to: "/settings", hash: "indexer" }),
				},
			});
		} else {
			toast.dismiss(UNREACHABLE_TOAST);
		}
	}, [unreachable, onSettings, navigate]);
	return null;
}

const WRONG_CHAIN_TOAST = "wrong-chain";

function WrongChainToast({
	wrongChain,
	onSettings,
}: {
	wrongChain: boolean;
	onSettings: boolean;
}) {
	const navigate = useNavigate();
	useEffect(() => {
		if (wrongChain && !onSettings) {
			toast(
				"Your Indexer is serving a different chain than this Wallet synced.",
				{
					id: WRONG_CHAIN_TOAST,
					duration: Infinity,
					icon: <IconAlertTriangle className="size-4" />,
					action: {
						label: "Review Indexer",
						onClick: () => navigate({ to: "/settings", hash: "indexer" }),
					},
				},
			);
		} else {
			toast.dismiss(WRONG_CHAIN_TOAST);
		}
	}, [wrongChain, onSettings, navigate]);
	return null;
}

async function softSwitchTo(state: WalletState) {
	setCachedWallet(state);
	clearWalletSnapshotCache();
	reloadWalletData();
}

function WalletCard({
	wallet,
	sync,
}: {
	wallet: WalletState | null;
	sync: SyncStatus | null;
}) {
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const [wallets, setWallets] = useState<WalletSummary[]>([]);
	const [busy, setBusy] = useState(false);
	const [removeOpen, setRemoveOpen] = useState(false);

	useEffect(() => {
		if (!open) return;
		listWallets()
			.then(setWallets)
			.catch(() => setWallets([]));
	}, [open, wallet?.walletId, wallet?.fingerprint]);

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

	async function onConfirmRemove() {
		if (!wallet?.exists || busy) return;
		setBusy(true);
		try {
			await removeWallet(false);
			const left = await listWallets();
			setRemoveOpen(false);
			setOpen(false);
			if (left.length === 0) {
				clearWalletSnapshotCache();
				setCachedWallet({
					exists: false,
					locked: false,
					sessionHeld: false,
					fingerprint: null,
					importType: "ufvk",
					viewMode: "full",
					network: "mainnet",
					birthdayHeight: 0,
					indexerUri: "",
					notificationsEnabled: true,
				} as WalletState);
				reloadWalletData();
				navigate({ to: "/onboarding" });
				return;
			}
			const state = await selectWallet(left[0].id);
			await softSwitchTo(state);
		} catch (e) {
			toast.error(String(e));
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="relative mt-5 flex flex-col rounded-[1rem] border border-white/10 bg-white/4 p-4">
			<div className="flex items-start gap-3">
				<button
					type="button"
					onClick={() => setOpen((o) => !o)}
					className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left outline-none hover:bg-white/5"
					aria-expanded={open}
					aria-haspopup="listbox"
				>
					{wallet?.fingerprint ? (
						<LifeHashIcon
							fingerprint={wallet.fingerprint}
							className="size-9 shrink-0 rounded-full"
						/>
					) : (
						<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-white">
							<IconWallet className="size-4" />
						</span>
					)}
					<div className="flex min-w-0 flex-1 flex-col gap-1">
						<div>
							<NetworkBadge network={wallet?.network} />
						</div>
						<span className="font-mono text-xs text-white/45">
							{wallet?.fingerprint ? wallet.fingerprint.slice(0, 7) : "—"}
						</span>
					</div>
				</button>
				<div className="flex shrink-0 items-center gap-1 pt-1">
					{wallet?.exists && <DiscreetEye />}
					<SyncChip sync={sync} />
				</div>
			</div>

			{open && (
				<div
					className="absolute inset-x-4 top-full z-20 mt-2 max-h-72 overflow-auto rounded-xl border border-white/10 bg-[#0c1222] p-1 shadow-lg"
					role="listbox"
				>
					{wallets.length === 0 ? (
						<p className="px-3 py-2 text-xs text-white/50">No wallets</p>
					) : (
						wallets.map((w) => (
							<button
								key={w.id}
								type="button"
								role="option"
								aria-selected={w.active}
								disabled={busy}
								onClick={() => onPick(w.id)}
								className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-white/10 ${
									w.active ? "bg-white/10" : ""
								}`}
							>
								{w.fingerprint ? (
									<LifeHashIcon
										fingerprint={w.fingerprint}
										className="size-6 shrink-0 rounded-full"
									/>
								) : null}
								<span className="min-w-0 flex-1 truncate font-mono">
									{w.label}
								</span>
								{w.active && (
									<span className="text-[10px] uppercase tracking-wide text-white/40">
										active
									</span>
								)}
							</button>
						))
					)}
					<div className="mt-1 border-t border-white/10 pt-1">
						<button
							type="button"
							disabled={busy}
							onClick={onAdd}
							className="flex w-full rounded-lg px-3 py-2 text-left text-xs text-white/80 hover:bg-white/10"
						>
							Add wallet…
						</button>
						<button
							type="button"
							disabled={busy || !wallet?.exists}
							onClick={() => {
								setOpen(false);
								setRemoveOpen(true);
							}}
							className="flex w-full rounded-lg px-3 py-2 text-left text-xs text-red-300/90 hover:bg-white/10 disabled:opacity-40"
						>
							Remove current wallet…
						</button>
					</div>
				</div>
			)}

			<div
				className="grid duration-300 ease-out-soft motion-safe:transition-[grid-template-rows,opacity]"
				style={{
					gridTemplateRows: isSyncing(sync) ? "1fr" : "0fr",
					opacity: isSyncing(sync) ? 1 : 0,
				}}
			>
				<div className="overflow-hidden">
					<div className="pt-3">
						<SyncBar sync={sync} />
					</div>
				</div>
			</div>

			<AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
				<AlertDialogContent size="sm">
					<AlertDialogHeader>
						<AlertDialogTitle>Remove this wallet?</AlertDialogTitle>
						<AlertDialogDescription>
							Only the local copy on this device is deleted. You will need the
							UFVK to import it again. Other wallets are left untouched.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							disabled={busy}
							onClick={(e) => {
								e.preventDefault();
								void onConfirmRemove();
							}}
						>
							{busy ? "Removing…" : "Remove wallet"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

function AppSidebar({
	active,
	wallet,
	sync,
}: {
	active: Section;
	wallet: WalletState | null;
	sync: SyncStatus | null;
}) {
	const navigate = useNavigate();

	return (
		<aside className="app-sidebar flex w-64 shrink-0 flex-col bg-ink px-3 pb-5 pt-9 text-white">
			<div className="flex items-center justify-center px-2 py-2">
				<img src={pendrakeLogo} alt="Pendrake" className="h-8 select-none" />
			</div>

			<WalletCard wallet={wallet} sync={sync} />

			<nav className="mt-5 flex flex-col gap-1">
				<NavItem
					icon={<IconHome className="size-4" />}
					label="Home"
					active={active === "wallet"}
					onClick={() => navigate({ to: "/dashboard" })}
				/>
				<NavItem
					icon={<IconActivity className="size-4" />}
					label="Activity"
					active={active === "activity"}
					onClick={() => navigate({ to: "/activity" })}
				/>
				<NotesNavItem
					active={active === "notes"}
					onClick={() => navigate({ to: "/notes" })}
				/>
			</nav>

			<nav className="mt-auto flex flex-col gap-1">
				<NavItem
					icon={<IconSettings className="size-4" />}
					label="Settings"
					active={active === "settings"}
					onClick={() => navigate({ to: "/settings" })}
				/>
				<NavItem
					icon={<IconHelpCircle className="size-4" />}
					label="About"
					onClick={openAbout}
				/>
				<NavItem
					icon={<IconLock className="size-4" />}
					label="Sign Out"
					onClick={async () => {
						await lock();
						navigate({ to: "/unlock" });
					}}
				/>
			</nav>
		</aside>
	);
}

function NotesNavItem({
	active,
	onClick,
}: {
	active: boolean;
	onClick: () => void;
}) {
	const enabled = useFeature("notes");
	const [animate] = useState(animationsEnabled);
	const state = enabled ? "opacity-100 blur-none" : "opacity-0 blur-[4px]";

	return (
		<div
			inert={!enabled}
			className={`flex flex-col ${animate ? "nav-reveal" : ""} ${state}`}
		>
			<NavItem
				icon={<IconListDetails className="size-4" />}
				label="Notes"
				active={active}
				onClick={onClick}
			/>
		</div>
	);
}

function NavItem({
	icon,
	label,
	active,
	onClick,
}: {
	icon: ReactNode;
	label: string;
	active?: boolean;
	onClick?: () => void;
}) {
	return (
		<button
			type="button"
			onClick={active ? undefined : onClick}
			aria-current={active ? "page" : undefined}
			className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
				active
					? "bg-brand text-white"
					: "cursor-pointer text-white/55 hover:bg-white/5 hover:text-white/80"
			}`}
		>
			{icon}
			{label}
		</button>
	);
}
