import {
	useEffect,
	useRef,
	useState,
	type CSSProperties,
	type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { IconArrowsExchange, IconPencil, IconRefresh } from "@tabler/icons-react";
import { Button } from "@/components/ui/button/button";
import { Switch } from "@/components/ui/switch/switch";
import { DiscreetValue } from "@/components/ui/discreet-value/discreet-value";
import { LifeHashAvatar } from "@/components/onboarding/lifehash-avatar";
import { lifehashAccent } from "@/components/onboarding/lifehash";
import { switchWallet } from "@/components/app/wallet-card/switch-wallet";
import { appToast } from "@/components/app/app-toast/app-toast";
import { setCachedWallet } from "@/hooks/use-wallet-data";
import { setNotifications, setWalletLabel, type WalletSummary } from "@/lib/ipc";
import { formatZec } from "@/lib/format";
import { RemoveDialog } from "./remove-dialog";
import { RescanDialog } from "./rescan-dialog";
import { UfvkReveal } from "./ufvk-reveal";
import "./wallets.css";

function ringTone(wallet: WalletSummary): string | undefined {
	if (wallet.unavailable) return "bad";
	if (wallet.sync?.state === "error") return "warn";
	return undefined;
}

// Enter commits, Esc cancels, blur commits.
function RenameField({
	value,
	placeholder,
	onCommit,
	onCancel,
}: {
	value: string;
	placeholder: string;
	onCommit: (next: string) => void;
	onCancel: () => void;
}) {
	const [draft, setDraft] = useState(value);
	const ref = useRef<HTMLInputElement>(null);
	const done = useRef(false);

	useEffect(() => {
		ref.current?.focus();
		ref.current?.select();
	}, []);

	function finish(commit: boolean) {
		if (done.current) return;
		done.current = true;
		if (commit) onCommit(draft);
		else onCancel();
	}

	function onKey(e: ReactKeyboardEvent<HTMLInputElement>) {
		if (e.key === "Enter") {
			e.preventDefault();
			finish(true);
		} else if (e.key === "Escape") {
			e.preventDefault();
			finish(false);
		}
	}

	return (
		<input
			ref={ref}
			data-escape-local
			value={draft}
			placeholder={placeholder}
			aria-label="Wallet name"
			spellCheck={false}
			maxLength={40}
			onChange={(e) => setDraft(e.target.value)}
			onKeyDown={onKey}
			onBlur={() => finish(true)}
			className="plate-name plate-name-input"
		/>
	);
}

// The identity plate. The LifeHash sits inside a sync ring, the name is the title
// and is renamed by clicking it, the fingerprint reads as a machine-readable
// strip, and the facts line up in one band beneath.
export function WalletPlate({
	wallet,
	onChanged,
}: {
	wallet: WalletSummary;
	onChanged: () => void;
}) {
	const fp = wallet.fingerprint;
	const short = fp ? fp.slice(0, 8) : "";
	const named = fp ? wallet.label !== short : wallet.label.length > 0;
	const accent = fp ? lifehashAccent(fp) : "var(--color-brand)";
	const percent = wallet.unavailable
		? 0
		: Math.min(100, wallet.sync?.percent ?? 0);
	const groups = fp ? (fp.slice(0, 32).match(/.{1,4}/g) ?? []) : [];

	const [editing, setEditing] = useState(false);
	const [alerts, setAlerts] = useState(wallet.notificationsEnabled ?? true);
	const [rescanning, setRescanning] = useState(false);
	const [removing, setRemoving] = useState(false);

	async function rename(next: string) {
		setEditing(false);
		const label = next.trim();
		if (label === (named ? wallet.label : "")) return;
		try {
			const state = await setWalletLabel(wallet.id, label);
			if (wallet.selected) setCachedWallet(state);
			onChanged();
		} catch (e) {
			appToast.error("Couldn't rename this Wallet", String(e));
		}
	}

	async function toggleAlerts(next: boolean) {
		setAlerts(next);
		try {
			const state = await setNotifications(next, wallet.id);
			if (wallet.selected) setCachedWallet(state);
		} catch {
			setAlerts(!next);
		}
	}

	async function use() {
		await switchWallet(wallet.id);
		onChanged();
	}

	return (
		<div
			className="plate"
			style={{ "--accent": accent, "--pct": percent } as CSSProperties}
		>
			<div className="plate-hero">
				<div className="plate-ring" data-tone={ringTone(wallet)}>
					<svg viewBox="0 0 100 100" aria-hidden>
						<circle className="plate-ring-track" cx="50" cy="50" r="46" />
						<circle className="plate-ring-arc" cx="50" cy="50" r="46" />
					</svg>
					{fp && (
						<LifeHashAvatar
							fingerprint={fp}
							className="size-20 rounded-full"
						/>
					)}
				</div>

				{editing ? (
					<RenameField
						value={named ? wallet.label : ""}
						placeholder={short}
						onCommit={rename}
						onCancel={() => setEditing(false)}
					/>
				) : (
					<button
						type="button"
						className="plate-name-btn group/name"
						title="Rename"
						onClick={() => setEditing(true)}
					>
						<span className={`plate-name ${named ? "" : "font-mono"}`}>
							{wallet.label}
						</span>
						<IconPencil className="plate-name-pencil size-4 text-muted-foreground opacity-0 transition-opacity group-hover/name:opacity-100 group-focus-visible/name:opacity-100" />
					</button>
				)}

				{fp && (
					<p className="plate-strip select-text" aria-label={fp}>
						{groups.map((group, i) => (
							<span key={i}>{group}</span>
						))}
					</p>
				)}

				<p className="plate-meta capitalize">{wallet.network}</p>
			</div>

			<dl className="plate-band">
				<div>
					<dt>Balance</dt>
					<dd className="tabular-nums">
						{wallet.lastBalance == null ? (
							"—"
						) : (
							<>
								<DiscreetValue kind="zec">
									{formatZec(BigInt(wallet.lastBalance))}
								</DiscreetValue>
								<span className="ml-1 text-xs text-muted-foreground">ZEC</span>
							</>
						)}
					</dd>
				</div>
				<div>
					<dt>Birthday</dt>
					<dd className="tabular-nums">
						{wallet.birthdayHeight.toLocaleString()}
					</dd>
				</div>
				<div>
					<dt>Indexer</dt>
					<dd className="font-mono text-xs">
						{wallet.indexerUri?.replace(/^[a-z]+:\/\//, "") || "—"}
					</dd>
				</div>
			</dl>

			<UfvkReveal walletId={wallet.id} network={wallet.network} />

			<div className="plate-actions">
				{!wallet.selected && (
					<Button variant="outline" size="sm" onClick={() => void use()}>
						<IconArrowsExchange data-icon="inline-start" />
						Use this Wallet
					</Button>
				)}
				{!wallet.unavailable && (
					<Button
						variant="outline"
						size="sm"
						onClick={() => setRescanning(true)}
					>
						<IconRefresh data-icon="inline-start" />
						Rescan…
					</Button>
				)}
				<label className="flex items-center gap-2 text-sm">
					<Switch
						checked={alerts}
						onCheckedChange={(on) => void toggleAlerts(on)}
						aria-label="Transaction alerts"
					/>
					Alerts
				</label>
				<Button
					variant="destructive"
					size="sm"
					className="ml-auto"
					onClick={() => setRemoving(true)}
				>
					Remove…
				</Button>
			</div>

			<RescanDialog
				open={rescanning}
				onOpenChange={setRescanning}
				walletId={wallet.id}
				birthdayHeight={wallet.birthdayHeight}
				onQueued={onChanged}
			/>

			<RemoveDialog
				open={removing}
				onOpenChange={(next) => {
					setRemoving(next);
					if (!next) onChanged();
				}}
				walletId={wallet.id}
				fingerprint={fp}
				network={wallet.network}
			/>
		</div>
	);
}
