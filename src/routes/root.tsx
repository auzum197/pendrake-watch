import { useEffect } from "react";
import { Outlet, useNavigate } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { listen } from "@tauri-apps/api/event";

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
    // Cold start (app launched by the deep link) and warm via onOpenUrl, plus the
    // `deep-link` event the single-instance callback forwards when the URL reaches
    // an already-running app as an argv entry.
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
