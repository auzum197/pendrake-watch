import {
	useEffect,
	useRef,
	useState,
	type CSSProperties,
	type ReactNode,
} from "react";
import { IconAlertCircle, IconAlertTriangle } from "@tabler/icons-react";
import type { Network, WalletSummary } from "@/lib/ipc";
import "./wallet-row.css";
import { formatZecApprox, isActivelySyncing } from "@/lib/format";
import { LifeHashAvatar } from "@/components/onboarding/lifehash-avatar";
import { DiscreetValue } from "@/components/ui/discreet-value/discreet-value";
import { Mirage } from "@/components/ui/mirage/mirage";

const TICKER: Record<Network, string> = {
	mainnet: "ZEC",
	regtest: "ZEC",
};

export type WalletRowState =
	| "unavailable"
	| "wrongChain"
	| "error"
	| "syncing"
	| "synced"
	| "closed";

export function walletRowState(wallet: WalletSummary): WalletRowState {
	if (wallet.unavailable) return "unavailable";
	const sync = wallet.sync ?? null;
	if (!sync) return "closed";
	if (sync.state === "error") return sync.wrongChain ? "wrongChain" : "error";
	if (isActivelySyncing(sync)) return "syncing";
	return "synced";
}

function Balance({ wallet, dimmed }: { wallet: WalletSummary; dimmed?: boolean }) {
	if (wallet.lastBalance == null) return null;
	return (
		<p
			className={`font-mono text-xs font-medium tabular-nums ${dimmed ? "text-white/40" : "text-white"}`}
		>
			<DiscreetValue kind="zec" peekable={false}>
				{formatZecApprox(BigInt(wallet.lastBalance))}
			</DiscreetValue>
		</p>
	);
}

function StatusContent({ wallet }: { wallet: WalletSummary }) {
	const state = walletRowState(wallet);
	const line = "mt-0.5 flex items-center justify-end gap-1 text-[10px]";
	switch (state) {
		case "unavailable":
			return (
				<div className="text-right" title={wallet.unavailable}>
					<Balance wallet={wallet} />
					<p className={`${line} font-medium text-red-400`}>
						<IconAlertCircle className="size-3" />
						Unavailable
					</p>
				</div>
			);
		case "wrongChain":
			return (
				<div className="text-right" title={wallet.sync?.error}>
					<Balance wallet={wallet} />
					<p className={`${line} font-medium text-red-400`}>
						<IconAlertTriangle className="size-3" />
						Wrong chain
					</p>
				</div>
			);
		case "error":
			return (
				<div className="text-right" title={wallet.sync?.error}>
					<Balance wallet={wallet} />
					<p className={`${line} font-medium text-amber-400`}>
						<IconAlertTriangle className="size-3" />
						Sync error
					</p>
				</div>
			);
		case "syncing":
			return (
				<div className="text-right">
					<Balance wallet={wallet} dimmed />
					<p className={`${line} h-[15px] text-brand`}>
						<Mirage size={28} />
					</p>
				</div>
			);
		case "synced":
		case "closed":
			if (wallet.lastBalance == null) return null;
			return (
				<div className="text-right">
					<Balance wallet={wallet} />
					<p className={`${line} text-white/45`}>{TICKER[wallet.network]}</p>
				</div>
			);
	}
}

function visualKey(wallet: WalletSummary): string {
	const state = walletRowState(wallet);
	return state === "closed" ? "synced" : state;
}

function StatusColumn({ wallet }: { wallet: WalletSummary }) {
	const key = visualKey(wallet);
	const content = <StatusContent wallet={wallet} />;
	const [shown, setShown] = useState(key);
	const [leaving, setLeaving] = useState<{ key: string; node: ReactNode } | null>(
		null,
	);
	const committed = useRef(content);
	useEffect(() => {
		committed.current = content;
	});
	if (shown !== key) {
		setLeaving({ key: shown, node: committed.current });
		setShown(key);
	}
	return (
		<div className="status-swap">
			{leaving && (
				<div
					key={`leaving-${leaving.key}`}
					data-leaving
					aria-hidden
					onTransitionEnd={() => setLeaving(null)}
				>
					{leaving.node}
				</div>
			)}
			<div key={shown}>{content}</div>
		</div>
	);
}

export function WalletRow({
	wallet,
	disabled,
	onPick,
	onHover,
	className,
	style,
}: {
	wallet: WalletSummary;
	disabled?: boolean;
	onPick: (id: string) => void;
	onHover?: () => void;
	className?: string;
	style?: CSSProperties;
}) {
	const fp = wallet.fingerprint ? wallet.fingerprint.slice(0, 8) : null;
	const named = fp ? wallet.label !== fp : wallet.label.length > 0;
	return (
		<li className={className} style={style} onPointerMove={onHover}>
			<button
				type="button"
				role="option"
				aria-selected={wallet.selected}
				disabled={disabled}
				onClick={() => onPick(wallet.id)}
				className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5"
			>
				{wallet.fingerprint && (
					<LifeHashAvatar
						fingerprint={wallet.fingerprint}
						className="size-9 shrink-0 rounded-full"
						ringed={wallet.selected}
					/>
				)}
				<div className="min-w-0 flex-1">
					{named ? (
						<>
							<p className="truncate text-xs font-medium text-white">
								{wallet.label}
							</p>
							{fp && (
								<p className="mt-0.5 truncate font-mono text-[10px] text-white/45">
									{fp}
								</p>
							)}
						</>
					) : (
						<p className="truncate font-mono text-xs font-medium text-white">
							{fp ?? wallet.label}
						</p>
					)}
				</div>
				<StatusColumn wallet={wallet} />
			</button>
		</li>
	);
}
