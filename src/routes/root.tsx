import { useEffect } from "react";
import { Outlet, useNavigate } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { listen } from "@tauri-apps/api/event";

export function RootLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    // pendrake://tx?txid=<id> opens a transaction; pendrake://settings/indexer opens
    // the Indexer setting (the #indexer hash focuses the field). The URL arrives cold
    // (getCurrent, app launched by the link), warm (onOpenUrl), and forwarded by the
    // single-instance callback when it reaches an already-running app as an argv entry.
    const go = (urls: string[] | null) => {
      for (const url of urls ?? []) {
        let parsed: URL;
        try {
          parsed = new URL(url);
        } catch {
          continue;
        }
        if (parsed.host === "tx") {
          const txid = parsed.searchParams.get("txid");
          if (txid) {
            navigate({ to: "/tx/$txid", params: { txid } });
            return;
          }
        } else if (parsed.host === "settings" && parsed.pathname === "/indexer") {
          navigate({ to: "/settings", hash: "indexer" });
          return;
        }
      }
    };
    getCurrent().then(go).catch(() => {});
    const unlistenOpen = onOpenUrl(go);
    const unlistenForwarded = listen<string[]>("deep-link", (e) => go(e.payload));
    return () => {
      unlistenOpen.then((fn) => fn()).catch(() => {});
      unlistenForwarded.then((fn) => fn()).catch(() => {});
    };
  }, [navigate]);

  return <Layout />;
}

function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="page flex-1">
        <Outlet />
      </main>

      {import.meta.env.DEV && (
        <TanStackRouterDevtools position="bottom-right" />
      )}
    </div>
  );
}
