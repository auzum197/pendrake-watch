import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import {
  IconActivity,
  IconHelpCircle,
  IconHome,
  IconLayoutSidebar,
  IconLayoutSidebarFilled,
  IconListDetails,
  IconLock,
  IconSettings,
} from "@tabler/icons-react";
import { lock, type SyncStatus, type WalletState } from "@/lib/ipc";
import { useFeature } from "@/lib/features";
import { animationsEnabled } from "@/lib/motion";
import { setSidebarRail, sidebarRail } from "@/lib/sidebar";
import { openSettings, useSettingsModal } from "@/lib/settings-modal";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import pendrakeLogo from "@/assets/pendrake-logo.svg";
import { MOD_KEY } from "@/components/ui/kbd/kbd";
import { Toaster } from "@/components/ui/sonner/sonner";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { WalletCard } from "../wallet-card/wallet-card";
import { WalletPalette } from "../wallet-palette/wallet-palette";
import { appToast, TOAST_ID } from "../app-toast/app-toast";
import { useRail } from "./use-rail";
import "./app-sidebar.css";
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
    height: 456,
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
  const [rail, setRail] = useState(sidebarRail);

  function toggleRail() {
    setRail((open) => {
      setSidebarRail(!open);
      return !open;
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        !e.altKey &&
        e.key.toLowerCase() === "b"
      ) {
        e.preventDefault();
        toggleRail();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app-frame fixed inset-0 z-50 flex bg-ink text-foreground">
      <AppSidebar
        active={active}
        wallet={wallet}
        switching={switching}
        rail={rail}
      />
      <div className="relative min-w-0 flex-1 bg-background">
        <main
          data-scroll-restoration-id="app-main"
          className="app-content absolute inset-0 overflow-y-auto"
        >
          <div className="flex min-h-full flex-col gap-6 px-8 pb-7 pt-14">
            {children}
          </div>
        </main>
      </div>
      <RailToggle rail={rail} onToggle={toggleRail} />
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

// Rendered on the body so that it sits above the window drag bar in root.tsx.
// To the right of the traffic lights, in the same place in both states.
function RailToggle({
  rail,
  onToggle,
}: {
  rail: boolean;
  onToggle: () => void;
}) {
  const Icon = rail ? IconLayoutSidebar : IconLayoutSidebarFilled;
  return createPortal(
    <button
      type="button"
      aria-label={rail ? "Show sidebar" : "Hide sidebar"}
      title={`${rail ? "Show" : "Hide"} sidebar (${MOD_KEY}B)`}
      aria-expanded={!rail}
      onClick={onToggle}
      className="fixed left-26.5 top-2.5 z-101 flex size-7 cursor-pointer items-center justify-center rounded-full text-white/55 transition duration-150 ease-out hover:bg-white/5 hover:text-white/80 active:scale-97"
    >
      <Icon className="size-4.5" />
    </button>,
    document.body,
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

// The sidebar does not clip its overflow: the wallet card grows over the
// content when it opens from the rail.
function AppSidebar({
  active,
  wallet,
  switching,
  rail,
}: {
  active: Section;
  wallet: WalletState | null;
  switching?: boolean;
  rail: boolean;
}) {
  const navigate = useNavigate();
  const ref = useRef<HTMLElement>(null);
  useRail(ref, rail);

  return (
    <aside
      ref={ref}
      data-rail={rail}
      className="app-sidebar flex shrink-0 flex-col border-r-2 border-border bg-ink px-3 pb-5 pt-11 text-white"
    >
      <div className="flex justify-center px-2 py-2">
        <div className="sidebar-logo overflow-hidden">
          <img src={pendrakeLogo} alt="Pendrake" className="h-8 max-w-none" />
        </div>
      </div>

      <WalletCard wallet={wallet} switching={switching} />

      <nav className="mt-5 flex flex-col gap-1">
        <NavItem
          icon={<IconHome className="size-4 shrink-0" />}
          label="Home"
          rail={rail}
          active={active === "wallet"}
          onClick={() => navigate({ to: "/dashboard" })}
        />
        <NavItem
          icon={<IconActivity className="size-4 shrink-0" />}
          label="Activity"
          rail={rail}
          active={active === "activity"}
          onClick={() => navigate({ to: "/activity" })}
        />
        <NotesNavItem
          rail={rail}
          active={active === "notes"}
          onClick={() => navigate({ to: "/notes" })}
        />
      </nav>

      <nav className="mt-auto flex flex-col gap-1">
        <SettingsNavItem rail={rail} />

        <NavItem
          icon={<IconHelpCircle className="size-4 shrink-0" />}
          label="About"
          rail={rail}
          onClick={openAbout}
        />
        <NavItem
          icon={<IconLock className="size-4 shrink-0" />}
          label="Sign Out"
          rail={rail}
          onClick={async () => {
            await lock();
            navigate({ to: "/unlock" });
          }}
        />
      </nav>
    </aside>
  );
}

function SettingsNavItem({ rail }: { rail: boolean }) {
  const { open } = useSettingsModal();
  return (
    <NavItem
      icon={<IconSettings className="size-4 shrink-0" />}
      label="Settings"
      rail={rail}
      active={open}
      onClick={() => openSettings()}
    />
  );
}

function NotesNavItem({
  rail,
  active,
  onClick,
}: {
  rail: boolean;
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
        icon={<IconListDetails className="size-4 shrink-0" />}
        label="Notes"
        rail={rail}
        active={active}
        onClick={onClick}
      />
    </div>
  );
}

function NavItem({
  icon,
  label,
  rail,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  rail: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={rail ? label : undefined}
      onClick={active ? undefined : onClick}
      aria-current={active ? "page" : undefined}
      className={`sidebar-item flex items-center gap-3 overflow-hidden rounded-lg py-2 pl-4.5 pr-4.5 text-sm transition duration-150 ease-out active:scale-97 ${
        active
          ? "bg-brand font-bold text-ink"
          : "cursor-pointer font-medium text-white/55 hover:bg-white/5 hover:text-white/80"
      }`}
    >
      {icon}
      <span className="sidebar-label whitespace-nowrap">{label}</span>
    </button>
  );
}
