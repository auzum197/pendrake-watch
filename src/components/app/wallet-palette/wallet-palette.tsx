import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { IconPlus, IconSearch } from "@tabler/icons-react";
import {
	listWallets,
	onSyncEvent,
	type WalletState,
	type WalletSummary,
} from "@/lib/ipc";
import { orderWallets } from "@/lib/wallet-recency";
import {
	closeWalletPalette,
	openWalletPalette,
	useWalletPalette,
} from "@/lib/wallet-palette";
import { Kbd } from "@/components/ui/kbd/kbd";
import { WalletRow } from "../wallet-row/wallet-row";
import { switchWallet } from "../wallet-card/switch-wallet";
import "./wallet-palette.css";

type Item = { kind: "wallet"; wallet: WalletSummary } | { kind: "add" };

export function WalletPalette({ wallet }: { wallet: WalletState | null }) {
	const { open, instant } = useWalletPalette();
	const navigate = useNavigate();
	const [wallets, setWallets] = useState<WalletSummary[]>([]);
	const [query, setQuery] = useState("");
	const [active, setActive] = useState(0);
	const listRef = useRef<HTMLUListElement>(null);

	useEffect(() => {
		function onKey(e: globalThis.KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				if (open) closeWalletPalette();
				else openWalletPalette({ instant: true });
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open]);

	useEffect(() => {
		if (!open) return;
		let live = true;
		const refresh = () =>
			listWallets()
				.then((list) => live && setWallets(list))
				.catch(() => live && setWallets([]));
		refresh();
		const unlisten = onSyncEvent((ev) => {
			if (ev.event === "finished" || ev.event === "transaction") refresh();
		});
		return () => {
			live = false;
			unlisten.then((fn) => fn()).catch(() => {});
		};
	}, [open, wallet?.walletId]);

	const q = query.trim().toLowerCase();
	const ordered = orderWallets(wallets, wallet?.walletId ?? null);
	const matches = q
		? ordered.filter(
				(w) =>
					w.label.toLowerCase().includes(q) ||
					(w.fingerprint ?? "").toLowerCase().includes(q),
			)
		: ordered;
	const showAdd = !q || "add wallet".includes(q) || "new wallet".includes(q);
	const items: Item[] = [
		...matches.map((w): Item => ({ kind: "wallet", wallet: w })),
		...(showAdd ? [{ kind: "add" } as Item] : []),
	];
	const current = Math.min(active, Math.max(items.length - 1, 0));

	useEffect(() => {
		listRef.current?.children[current]?.scrollIntoView({ block: "nearest" });
	}, [current, open]);

	function close() {
		closeWalletPalette();
		setQuery("");
		setActive(0);
	}

	function run(i: number) {
		const item = items[i];
		if (!item) return;
		close();
		if (item.kind === "add") {
			navigate({ to: "/onboarding", search: { mode: "add" } });
		} else if (item.wallet.id !== wallet?.walletId) {
			void switchWallet(item.wallet.id);
		}
	}

	function onInputKey(e: KeyboardEvent<HTMLInputElement>) {
		const n = items.length;
		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				if (n) setActive((current + 1) % n);
				break;
			case "ArrowUp":
				e.preventDefault();
				if (n) setActive((current - 1 + n) % n);
				break;
			case "Enter":
				e.preventDefault();
				run(current);
				break;
			case "Escape":
				e.preventDefault();
				close();
				break;
		}
	}

	if (!open) return null;

	return (
		<div className="wallet-palette" data-instant={instant || undefined}>
			<div className="wallet-palette-scrim" onPointerDown={close} />
			<div
				role="dialog"
				aria-modal="true"
				aria-label="Switch wallet"
				className="wallet-palette-panel"
			>
				<div className="wallet-palette-search">
					<IconSearch className="size-4 shrink-0 text-white/40" />
					<input
						autoFocus
						value={query}
						placeholder="Switch wallet…"
						spellCheck={false}
						onChange={(e) => {
							setQuery(e.target.value);
							setActive(0);
						}}
						onKeyDown={onInputKey}
					/>
				</div>
				<ul ref={listRef} role="listbox" className="wallet-palette-list">
					{items.map((item, i) => {
						const isActive = i === current;
						if (item.kind === "add") {
							return (
								<li
									key="add"
									role="option"
									aria-selected={isActive}
									data-active={isActive || undefined}
									onPointerMove={() => setActive(i)}
									onClick={() => run(i)}
									className="wallet-palette-add"
								>
									<span className="wallet-palette-add-icon">
										<IconPlus className="size-4" />
									</span>
									<span className="text-xs font-medium text-white">Add wallet</span>
								</li>
							);
						}
						return (
							<WalletRow
								key={item.wallet.id}
								wallet={item.wallet}
								onPick={() => run(i)}
								onHover={() => setActive(i)}
								className={isActive ? "wallet-palette-row is-active" : "wallet-palette-row"}
							/>
						);
					})}
					{items.length === 0 && (
						<li className="wallet-palette-empty">No wallet matches “{query}”</li>
					)}
				</ul>
				<footer className="wallet-palette-foot">
					<span>
						<Kbd>↑</Kbd>
						<Kbd>↓</Kbd> move
					</span>
					<span>
						<Kbd>↵</Kbd> switch
					</span>
					<span>
						<Kbd>esc</Kbd> close
					</span>
				</footer>
			</div>
		</div>
	);
}
