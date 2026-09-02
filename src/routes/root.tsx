import { useEffect } from "react";
import { Outlet, useNavigate } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { listen } from "@tauri-apps/api/event";
import { getWalletState } from "@/lib/ipc";
import { stashPendingTxid } from "@/lib/deep-link";
import { openSettings } from "@/lib/settings-modal";

export function RootLayout() {
	const navigate = useNavigate();

	useEffect(() => {
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
						const state = await getWalletState().catch(() => null);
						if (state?.locked) {
							stashPendingTxid(txid);
							navigate({ to: "/unlock", replace: true });
						} else {
							navigate({ to: "/tx/$txid", params: { txid } });
						}
						return;
					}
				} else if (
					parsed.host === "settings" &&
					parsed.pathname === "/indexer"
				) {
					navigate({ to: "/dashboard" });
					openSettings({ indexer: true });
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
