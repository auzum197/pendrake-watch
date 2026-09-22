import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "@tanstack/react-router";
import { IconPlus } from "@tabler/icons-react";
import { LifeHashAvatar } from "@/components/onboarding/lifehash-avatar";
import { lifehashAccent } from "@/components/onboarding/lifehash";
import { listWallets, onSyncEvent, type WalletSummary } from "@/lib/ipc";
import { closeSettings } from "@/lib/settings-modal";
import { WalletPlate } from "./wallet-plate";
import "./wallets.css";

// The list the Wallets category reads, refreshed on the sync events that can move
// a balance or a status. `refresh` re-reads it after a change made from the plate.
export function useWalletList(active: boolean): {
	wallets: WalletSummary[];
	refresh: () => void;
} {
	const [wallets, setWallets] = useState<WalletSummary[]>([]);
	const reload = useRef(() => {});

	useEffect(() => {
		if (!active) return;
		let live = true;
		const load = () =>
			listWallets()
				.then((list) => {
					if (live) setWallets(list);
				})
				.catch(() => {
					if (live) setWallets([]);
				});
		reload.current = load;
		void load();
		const unlisten = onSyncEvent((ev) => {
			if (ev.event === "finished" || ev.event === "transaction") void load();
		});
		return () => {
			live = false;
			reload.current = () => {};
			unlisten.then((fn) => fn()).catch(() => {});
		};
	}, [active]);

	return { wallets, refresh: () => reload.current() };
}

export function WalletsPanel({
	wallets,
	focusWallet,
	refresh,
}: {
	wallets: WalletSummary[];
	focusWallet: string | null;
	refresh: () => void;
}) {
	const navigate = useNavigate();
	const selected = wallets.find((w) => w.selected) ?? wallets[0];
	const [focusId, setFocusId] = useState(focusWallet);
	const [requested, setRequested] = useState(focusWallet);
	if (focusWallet !== requested) {
		setRequested(focusWallet);
		if (focusWallet) setFocusId(focusWallet);
	}
	const focus = wallets.find((w) => w.id === focusId) ?? selected;

	function add() {
		closeSettings();
		navigate({ to: "/onboarding", search: { mode: "add" } });
	}

	return (
		<section className="wallets-panel">
			<ul className="wallets-list" role="listbox" aria-label="Wallets">
				{wallets.map((w) => {
					const short = w.fingerprint ? w.fingerprint.slice(0, 8) : "";
					const named = w.fingerprint ? w.label !== short : w.label.length > 0;
					return (
						<li key={w.id}>
							<button
								type="button"
								role="option"
								aria-selected={w.id === focus?.id}
								className="wallets-item"
								style={
									{
										"--accent": w.fingerprint
											? lifehashAccent(w.fingerprint)
											: "var(--color-brand)",
									} as CSSProperties
								}
								onClick={() => setFocusId(w.id)}
							>
								{w.fingerprint && (
									<LifeHashAvatar
										fingerprint={w.fingerprint}
										className="size-7 shrink-0 rounded-full"
										ringed={w.selected}
									/>
								)}
								<span className="min-w-0 flex-1">
									<span
										className={`block truncate text-sm ${named ? "font-medium" : "font-mono text-muted-foreground"}`}
									>
										{w.label}
									</span>
									<span className="flex gap-2 truncate font-mono text-[10px] text-muted-foreground">
										{short && <span>{short}</span>}
										<span className="capitalize">{w.network}</span>
									</span>
								</span>
							</button>
						</li>
					);
				})}
				<li>
					<button type="button" className="wallets-item" onClick={add}>
						<span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed border-white/25 text-muted-foreground">
							<IconPlus className="size-3.5" />
						</span>
						<span className="text-sm text-muted-foreground">Add wallet</span>
					</button>
				</li>
			</ul>
			{focus && (
				<WalletPlate key={focus.id} wallet={focus} onChanged={refresh} />
			)}
		</section>
	);
}
