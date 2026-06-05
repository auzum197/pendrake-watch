import { Link } from "@tanstack/react-router";
import {
  IconLayoutDashboard,
  IconArrowsExchange,
  IconWallet,
  IconSettings,
} from "@tabler/icons-react";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: IconLayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: IconArrowsExchange },
  { to: "/accounts", label: "Accounts", icon: IconWallet },
  { to: "/settings", label: "Settings", icon: IconSettings },
] as const;

/** Persistent navigation rail. Stays mounted while the content area changes. */
export function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-background/80 p-3 backdrop-blur">
      <div className="px-2 py-3 font-heading text-lg font-bold tracking-tight">
        Pendrake
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          watch
        </span>
      </div>

      <nav className="mt-2 flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            activeProps={{ className: "bg-accent text-accent-foreground" }}
          >
            <Icon size={18} stroke={1.75} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
