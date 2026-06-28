import { useEffect } from "react";
import { Outlet, useNavigate } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { listen } from "@tauri-apps/api/event";
import { getWalletState } from "@/lib/ipc";
import { stashPendingTxid } from "@/lib/deep-link";

export function RootLayout() {
	const navigate = useNavigate();

	useEffect(() => {
		// pendrake://tx?txid=<id> opens a transaction. pendrake://settings/indexer opens
		// the Indexer setting. The URL arrives cold
		// (getCurrent, the app is launched by the link), warm (onOpenUrl), and forwarded by the
		// single-instance callback when it reaches an already-running app as an argv entry.
		const go = async (urls: string[] | null) => {
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
						// The click can reach a locked session (the notification woke a
						// parked wallet). Stash the txid so /unlock resumes it after
						// re-auth instead of dropping the user on the dashboard; an open
						// wallet jumps straight to the detail.
						const locked = await getWalletState()
							.then((s) => s.locked)
							.catch(() => false);
						if (locked) {
							stashPendingTxid(txid);
							navigate({ to: "/unlock" });
						} else {
							navigate({ to: "/tx/$txid", params: { txid } });
						}
						return;
					}
				} else if (
					parsed.host === "settings" &&
					parsed.pathname === "/indexer"
				) {
					navigate({ to: "/settings", hash: "indexer" });
					return;
				}
			}
		};
		getCurrent()
			.then(go)
			.catch(() => {});
		const unlistenOpen = onOpenUrl(go);
		const unlistenForwarded = listen<string[]>("deep-link", (e) =>
			go(e.payload),
		);
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
