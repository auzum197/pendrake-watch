import { Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

const navLinkClass =
  "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";

export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-center gap-1 border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
        <Link
          to="/"
          className={navLinkClass}
          activeProps={{ className: "bg-accent text-accent-foreground" }}
          activeOptions={{ exact: true }}
        >
          Home
        </Link>
        <Link
          to="/about"
          className={navLinkClass}
          activeProps={{ className: "bg-accent text-accent-foreground" }}
        >
          About
        </Link>
      </header>

      <main className="page flex-1">
        <Outlet />
      </main>

      {import.meta.env.DEV && (
        <TanStackRouterDevtools position="bottom-right" />
      )}
    </div>
  );
}
