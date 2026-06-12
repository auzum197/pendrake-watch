import { useEffect } from "react";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";

const navLinkClass =
  "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";

// pendrake://tx?txid=<id> -> the transaction detail route.
function txidFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.host === "tx") return parsed.searchParams.get("txid");
  } catch {
    // not a URL we recognize
  }
  return null;
}

export function RootLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    const go = (urls: string[] | null) => {
      const txid = urls?.map(txidFromUrl).find(Boolean);
      if (txid) navigate({ to: "/tx/$txid", params: { txid } });
    };
    // Cold start (app launched by the deep link) and warm (already running).
    getCurrent().then(go).catch(() => {});
    const unlisten = onOpenUrl(go);
    return () => {
      unlisten.then((fn) => fn()).catch(() => {});
    };
  }, [navigate]);

  return <Layout />;
}

function Layout() {
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
