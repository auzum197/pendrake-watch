import { type ReactNode, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
	IconActivity,
	IconHelpCircle,
	IconHome,
	IconListDetails,
	IconLock,
	IconSettings,
} from "@tabler/icons-react";
import { lock, type SyncStatus, type WalletState } from "@/lib/ipc";
import { useFeature } from "@/lib/features";
import { animationsEnabled } from "@/lib/motion";
import { openSettings, useSettingsModal } from "@/lib/settings-modal";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import pendrakeLogo from "@/assets/pendrake-logo.svg";
import { Toaster } from "@/components/ui/sonner/sonner";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { WalletCard } from "../wallet-card/wallet-card";
import { WalletPalette } from "../wallet-palette/wallet-palette";
import { appToast, TOAST_ID } from "../app-toast/app-toast";
import "./nav-reveal.css";

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

type Section = "wallet" | "activity" | "notes";

export function AppShell({
	active,
	wallet,
	sync,
	switching,
	error,
	children,
}: {
	active: Section;
	wallet: WalletState | null;
	sync: SyncStatus | null;
	switching?: boolean;
	error?: string | null;
	children: ReactNode;
}) {
	const { open: settingsOpen } = useSettingsModal();
	return (
		<div className="app-frame fixed inset-0 z-50 flex bg-ink text-foreground">
			<AppSidebar active={active} wallet={wallet} switching={switching} />
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
			<Toaster position="bottom-right" />
			<UnreachableToast
				unreachable={sync?.unreachable ?? false}
				onSettings={settingsOpen}
			/>
			<WrongChainToast
				wrongChain={sync?.wrongChain ?? false}
				onSettings={settingsOpen}
			/>
			<DaemonToast error={error ?? null} />
			<SettingsDialog wallet={wallet} />
			<WalletPalette wallet={wallet} />
		</div>
	);
}

function UnreachableToast({
	unreachable,
	onSettings,
}: {
	unreachable: boolean;
	onSettings: boolean;
}) {
	useEffect(() => {
		if (unreachable && !onSettings) {
			appToast.unreachable();
		} else {
			appToast.dismiss(TOAST_ID.unreachable);
		}
	}, [unreachable, onSettings]);
	return null;
}

function DaemonToast({ error }: { error: string | null }) {
	useEffect(() => {
		if (error) appToast.daemon(error);
		else appToast.dismiss(TOAST_ID.daemon);
	}, [error]);
	return null;
}

function WrongChainToast({
	wrongChain,
	onSettings,
}: {
	wrongChain: boolean;
	onSettings: boolean;
}) {
	useEffect(() => {
		if (wrongChain && !onSettings) {
			appToast.wrongChain();
		} else {
			appToast.dismiss(TOAST_ID.wrongChain);
		}
	}, [wrongChain, onSettings]);
	return null;
}

function AppSidebar({
	active,
	wallet,
	switching,
}: {
	active: Section;
	wallet: WalletState | null;
	switching?: boolean;
}) {
	const navigate = useNavigate();

	return (
		<aside className="app-sidebar flex w-64 shrink-0 flex-col bg-ink px-3 pb-5 pt-9 text-white">
			<div className="flex items-center justify-center px-2 py-2">
				<img src={pendrakeLogo} alt="Pendrake" className="h-8" />
			</div>

			<WalletCard wallet={wallet} switching={switching} />

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
				<SettingsNavItem />

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

function SettingsNavItem() {
	const { open } = useSettingsModal();
	return (
		<NavItem
			icon={<IconSettings className="size-4" />}
			label="Settings"
			active={open}
			onClick={() => openSettings()}
		/>
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
			className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
				active
					? "bg-brand font-bold text-ink"
					: "cursor-pointer font-medium text-white/55 hover:bg-white/5 hover:text-white/80"
			}`}
		>
			{icon}
			{label}
		</button>
	);
}
