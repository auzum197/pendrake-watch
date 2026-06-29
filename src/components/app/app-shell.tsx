import { type ReactNode, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
	IconActivity,
	IconAlertTriangle,
	IconHelpCircle,
	IconHome,
	IconListDetails,
	IconLock,
	IconSettings,
	IconShieldCheckFilled,
	IconWallet,
} from "@tabler/icons-react";
import { lock, type SyncStatus, type WalletState } from "@/lib/ipc";
import { useFeature } from "@/lib/features";
import { animationsEnabled } from "@/lib/motion";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LifeHashIcon } from "@/components/onboarding/lifehash";
import { isSyncing, SyncBar, SyncChip } from "./sync-status";
import "./nav-reveal.css";

// A tinted pill keyed by chain, in the same style as the Notes "unspent" badge: a soft
// fill under matching-hue text. Mainnet is green (live), the rest read apart by hue.
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

// The About window is a second native webview (about.html), opened on demand. Kept as
// a module-level handle so a repeat click focuses the open one instead of spawning a
// duplicate; the handle clears when the window is destroyed.
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
		width: 380,
		height: 320,
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
		// The frame shares the sidebar's ink, so the sidebar reads as part of it and
		// the content sits on top as a floating panel. app-frame holds the chrome
		// (frame + panel surface) still across navigations; only app-content swaps.
		<div className="app-frame fixed inset-0 z-50 flex bg-ink text-foreground">
			<AppSidebar active={active} wallet={wallet} sync={sync} />
			{/* The panel is a held-still white surface with the routed content scrolling
          on top of it. app-content is the scroller, not the inner content, so the
          scroll offset stays clipped inside the rounded frame instead of spilling
          over it. Screens animate themselves in on mount (see lib/motion); there's no
          page crossfade, so the route swap is instant. */}
			<div className="relative my-3 mr-3 flex-1 rounded-2xl border-2 border-border bg-background">
				<main
					data-scroll-restoration-id="app-main"
					className="app-content absolute inset-0 overflow-y-auto rounded-2xl"
				>
					<div className="flex min-h-full flex-col gap-6 px-8 py-7">
						{/* The Indexer-unreachable CTA rides on every screen but Settings, where
                the control to fix it already sits. */}
						{sync?.unreachable && active !== "settings" && (
							<UnreachableBanner />
						)}
						{children}
					</div>
				</main>
			</div>
		</div>
	);
}

function UnreachableBanner() {
	const navigate = useNavigate();
	return (
		<div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300">
			<span className="flex items-center gap-2">
				<IconAlertTriangle className="size-4 shrink-0" />
				Can't reach your Indexer.
			</span>
			<button
				type="button"
				onClick={() => navigate({ to: "/settings", hash: "indexer" })}
				className="shrink-0 font-medium underline-offset-2 hover:underline"
			>
				Change Indexer
			</button>
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

	// Extra top padding clears the macOS traffic-light buttons: the title bar is
	// transparent (tauri.conf.json), so the webview draws under it and the buttons
	// sit over the sidebar's top-left.
	return (
		<aside className="app-sidebar flex w-64 shrink-0 flex-col bg-ink px-3 pb-5 pt-9 text-white">
			<div className="flex items-center gap-2.5 px-2">
				<span className="flex size-8 items-center justify-center rounded-lg bg-brand">
					<IconShieldCheckFilled className="size-5 text-white" />
				</span>
				<span className="font-heading text-lg font-bold">Pendrake</span>
			</div>

			<div className="mt-5 flex flex-col rounded-xl bg-white/4 p-4">
				<div className="flex items-center gap-3">
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
						{/* The network badge is the headline on its own line. */}
						<div>
							<NetworkBadge network={wallet?.network} />
						</div>
						{/* The metadata line: the short-hash fingerprint anchors left and the
                sync state anchors right, so both rows carry weight instead of the
                status floating alone beside the badge. */}
						<div className="flex items-center justify-between gap-2">
							<span className="font-mono text-xs text-white/45">
								{wallet?.fingerprint ? wallet.fingerprint.slice(0, 7) : "—"}
							</span>
							<SyncChip sync={sync} />
						</div>
					</div>
				</div>
				{/* The progress bar collapses away once synced. Animating grid-template-rows
            (paired with opacity) lets the card resize smoothly as it goes. */}
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
			</div>

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
						// Lock the daemon session (the wallet stays open and syncing), then show
						// the unlock screen. Re-entry needs the real passphrase.
						await lock();
						navigate({ to: "/unlock" });
					}}
				/>
			</nav>
		</aside>
	);
}

// The Notes item is gated behind the experimental flag. It stays mounted rather than
// unmounting: the flag flips rarely, and the row is last in the top nav, so its reserved
// height just sits in the empty space above the pinned lower nav, invisible when off.
// Switching it on materializes the whole item in place (no movement): the icon and label
// sharpen from a blur together. The flex column keeps the button full width so the selected
// brand fill spans the rail. When off it's inert: out of the tab order, no pointer. Motion
// is gated on the device preference, read once at mount. With it off the reveal class drops
// and the state snaps.
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
			// Re-navigating to the screen you're already on remounts it (a visible
			// reload). The active tab is a no-op instead.
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
