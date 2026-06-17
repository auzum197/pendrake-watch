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

type Section = "wallet" | "activity";

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
    <div className="fixed inset-0 z-50 flex bg-white text-zinc-900">
      <AppSidebar active={active} wallet={wallet} sync={sync} />
      <main className="flex flex-1 flex-col gap-6 overflow-y-auto px-8 py-7">
        {children}
      </main>
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

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-ink px-3 py-5 text-white">
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
        <NavItem icon={<IconSettings className="size-4" />} label="Settings" />
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
