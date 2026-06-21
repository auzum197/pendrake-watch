import { type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  IconActivity,
  IconHelpCircle,
  IconLock,
  IconSettings,
  IconShieldCheckFilled,
  IconWallet,
} from "@tabler/icons-react";
import type { SyncStatus, WalletState } from "@/lib/ipc";
import { syncLabel } from "@/lib/format";

type Section = "wallet" | "activity" | "settings";

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
    // (frame + panel surface) still across navigations; only app-content fades.
    <div className="app-frame fixed inset-0 z-50 flex bg-ink text-zinc-900">
      <AppSidebar active={active} wallet={wallet} sync={sync} />
      {/* The panel is a held-still white surface with the routed content scrolling
          on top of it. app-content is the scroller, not the inner content: naming
          and clipping the scroller keeps its transition snapshot panel-sized and
          panel-positioned whatever the scroll offset, so content crossfades inside
          the rounded frame instead of spilling over it. Transparent over the still
          surface, so the ink never flashes through mid-fade. */}
      <div className="relative my-3 mr-3 flex-1 rounded-2xl bg-background">
        <main
          data-scroll-restoration-id="app-main"
          className="app-content absolute inset-0 overflow-y-auto rounded-2xl"
        >
          <div className="flex min-h-full flex-col gap-6 px-8 py-7">{children}</div>
        </main>
      </div>
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
  const subtitle = wallet?.exists
    ? `${syncLabel(sync)} · ${wallet.network}`
    : syncLabel(sync);

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

      <div className="mt-5 flex items-center gap-3 rounded-xl bg-white/[0.04] p-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-brand text-white">
          <IconWallet className="size-4" />
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-medium">Watch-only</span>
          <span className="text-xs text-white/45 capitalize">{subtitle}</span>
        </div>
      </div>

      <nav className="mt-5 flex flex-col gap-1">
        <NavItem
          icon={<IconWallet className="size-4" />}
          label="Wallet"
          active={active === "wallet"}
          onClick={() => navigate({ to: "/dashboard" })}
        />
        <NavItem
          icon={<IconActivity className="size-4" />}
          label="Activity"
          active={active === "activity"}
          onClick={() => navigate({ to: "/activity" })}
        />
      </nav>

      <nav className="mt-auto flex flex-col gap-1">
        <NavItem
          icon={<IconSettings className="size-4" />}
          label="Settings"
          active={active === "settings"}
          onClick={() => navigate({ to: "/settings" })}
        />
        <NavItem icon={<IconHelpCircle className="size-4" />} label="About" />
        <NavItem
          icon={<IconLock className="size-4" />}
          label="Sign Out"
          onClick={() => navigate({ to: "/unlock" })}
        />
      </nav>
    </aside>
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
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-brand text-white"
          : "text-white/55 hover:bg-white/5 hover:text-white/80"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
