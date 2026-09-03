import { type ReactNode, useEffect, useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
	IconCircleCheck,
	IconFlask,
	IconSearch,
	IconSettings,
	IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button/button";
import { Switch } from "@/components/ui/switch/switch";
import { IndexerPicker } from "@/components/indexer/indexer-picker";
import { RemoveDialog } from "@/components/settings/remove-dialog";
import type { WalletState } from "@/lib/ipc";
import { CUSTOM_INDEXER, indexerReady, resolveIndexer } from "@/lib/indexer";
import {
	MAINNET_INDEXERS,
	setFiatEnabled,
	setIndexer,
	setNotifications,
	setKeepRunningInBackground as setKeepRunningIpc,
	type Network,
} from "@/lib/ipc";
import {
	keepRunningInBackground,
	setKeepRunningInBackground as setKeepRunningLocal,
} from "@/lib/background";
import { toggleDiscreet, useDiscreet } from "@/lib/discreet";
import { reduceMotion, setReduceMotion } from "@/lib/motion";
import { FEATURES, setEnabled, useFeature } from "@/lib/features";
import { closeSettings, useSettingsModal } from "@/lib/settings-modal";

type Category = "general" | "experimental";

const CATEGORIES: { id: Category; label: string; icon: typeof IconSettings }[] =
	[
		{ id: "general", label: "General", icon: IconSettings },
		{ id: "experimental", label: "Experimental", icon: IconFlask },
	];

const TEXT = {
	notifications: {
		title: "Transaction alerts",
		description: "Notify me when my wallets receives or sends a transaction.",
	},
	background: {
		title: "Keep syncing when app is closed",
		description:
			"When off, the background process stops as soon as you quit. When on, the active wallet can keep following the tip and send notifications after the window closes.",
	},
	fiat: {
		title: "Show USD values",
		description: "Prices your balance in USD using third-party price data.",
	},
	discreet: {
		title: "Hide sensitive values",
		description:
			"Masks balances, amounts, dates and transaction identifiers across the app, and drops the amount from new-transaction notifications. The eye in the sidebar does the same; hold it to peek.",
	},
	indexer: {
		title: "Indexer",
		descriptionMainnet:
			"The Indexer this Wallet syncs from. Switching connects to the new one before saving.",
		descriptionRegtest:
			"This regtest Wallet has no public default, so point it at your own Indexer.",
	},
	remove: {
		title: "Remove Wallet",
		description:
			"Erases this Wallet's identity and history from this device. Your other Wallets keep syncing. This can't be undone.",
	},
	reduceMotion: {
		title: "Reduce motion",
		description:
			"Turn off the entrance animations when screens and transactions load. Follows your system setting until you choose here.",
	},
};

type GeneralKey =
	| "notifications"
	| "background"
	| "fiat"
	| "discreet"
	| "indexer"
	| "remove";

function Highlighted({ text, query }: { text: string; query: string }) {
	const q = query.trim().toLowerCase();
	if (!q) return <>{text}</>;
	const lower = text.toLowerCase();
	const parts: ReactNode[] = [];
	let cursor = 0;
	for (let at = lower.indexOf(q); at !== -1; at = lower.indexOf(q, cursor)) {
		if (at > cursor) parts.push(text.slice(cursor, at));
		cursor = at + q.length;
		parts.push(
			<mark
				key={`${at}-${q}`}
				className="inline-block animate-in fade-in-25 zoom-in-75 rounded-[3px] bg-primary text-primary-foreground duration-200 ease-[cubic-bezier(0.34,1.9,0.64,1)] motion-reduce:animate-none"
			>
				{text.slice(at, cursor)}
			</mark>,
		);
	}
	parts.push(text.slice(cursor));
	return <>{parts}</>;
}

export function SettingsDialog({ wallet }: { wallet: WalletState | null }) {
	const { open, focusIndexer } = useSettingsModal();
	const [category, setCategory] = useState<Category>("general");
	const [query, setQuery] = useState("");
	const searchRef = useRef<HTMLInputElement>(null);

	const q = query.trim().toLowerCase();
	const searching = q.length > 0;
	const hit = (...texts: string[]) => texts.join(" ").toLowerCase().includes(q);

	const generalVisible: Record<GeneralKey, boolean> = {
		notifications: hit(
			TEXT.notifications.title,
			TEXT.notifications.description,
		),
		background: hit(TEXT.background.title, TEXT.background.description),
		fiat: hit(TEXT.fiat.title, TEXT.fiat.description),
		discreet: hit(TEXT.discreet.title, TEXT.discreet.description),
		indexer: hit(
			TEXT.indexer.title,
			TEXT.indexer.descriptionMainnet,
			TEXT.indexer.descriptionRegtest,
		),
		remove: hit(TEXT.remove.title, TEXT.remove.description),
	};
	const walletExists = wallet?.exists ?? false;
	const hasGeneral =
		generalVisible.background ||
		generalVisible.remove ||
		(walletExists &&
			(generalVisible.notifications ||
				generalVisible.fiat ||
				generalVisible.discreet ||
				generalVisible.indexer));

	const featureMatches = FEATURES.filter((f) => hit(f.label, f.description));
	const reduceMotionMatches = hit(
		TEXT.reduceMotion.title,
		TEXT.reduceMotion.description,
	);
	const hasExperimental = featureMatches.length > 0 || reduceMotionMatches;

	useEffect(() => {
		if (open && focusIndexer) setCategory("general");
	}, [open, focusIndexer]);

	return (
		<DialogPrimitive.Root
			open={open}
			onOpenChange={(next) => {
				if (!next) {
					setQuery("");
					closeSettings();
				}
			}}
		>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/60 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 data-open:duration-200 data-closed:duration-150" />
				<DialogPrimitive.Content
					aria-describedby={undefined}
					onEscapeKeyDown={(e) => {
						if (query) {
							e.preventDefault();
							setQuery("");
						}
					}}
					onKeyDown={(e) => {
						if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
							e.preventDefault();
							searchRef.current?.focus();
						}
					}}
					className="fixed left-1/2 top-1/2 z-[60] flex h-[88vh] max-h-[820px] w-[calc(100vw-2rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-2xl shadow-black/40 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:duration-200 data-closed:duration-150"
				>
					<DialogPrimitive.Title className="sr-only">
						Settings
					</DialogPrimitive.Title>

					<nav className="flex w-52 shrink-0 flex-col gap-1 border-r border-border bg-ink p-3">
						<div className="relative mb-3">
							<IconSearch className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
							<input
								ref={searchRef}
								type="text"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								placeholder="Search"
								className="h-9 w-full rounded-lg border border-border bg-white/5 pl-8 pr-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring"
							/>
						</div>
						<p className="px-3 pb-2 pt-2 font-heading text-sm font-semibold text-foreground">
							Settings
						</p>
						{CATEGORIES.map((cat) => (
							<button
								key={cat.id}
								type="button"
								onClick={() => {
									setQuery("");
									setCategory(cat.id);
								}}
								aria-current={
									category === cat.id && !searching ? "true" : undefined
								}
								className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
									category === cat.id && !searching
										? "bg-brand font-semibold text-brand-foreground"
										: "cursor-pointer font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground"
								}`}
							>
								<cat.icon className="size-4" />
								{cat.label}
							</button>
						))}
					</nav>

					<div className="relative min-h-0 flex-1">
						<div className="absolute inset-0 overflow-y-auto px-8 pb-7 pt-16">
							<div className="flex flex-col divide-y divide-border">
								{searching ? (
									hasGeneral || hasExperimental ? (
										<>
											{hasGeneral && (
												<section className="py-6 first:pt-0 last:pb-0">
													<p className="pb-4 text-xs font-medium text-muted-foreground">
														General
													</p>
													<div className="flex flex-col divide-y divide-border">
														<GeneralPanel
															wallet={wallet}
															focusIndexer={focusIndexer}
															query={query}
															visible={generalVisible}
														/>
													</div>
												</section>
											)}
											{hasExperimental && (
												<section className="py-6 first:pt-0 last:pb-0">
													<p className="pb-4 text-xs font-medium text-muted-foreground">
														Experimental
													</p>
													<div className="flex flex-col divide-y divide-border">
														{featureMatches.map((feature) => (
															<FeatureToggle
																key={feature.id}
																feature={feature}
																query={query}
															/>
														))}
														{reduceMotionMatches && (
															<ReduceMotionToggle query={query} />
														)}
													</div>
												</section>
											)}
										</>
									) : (
										<p className="py-16 text-center text-sm text-muted-foreground">
											No settings match "{query.trim()}"
										</p>
									)
								) : category === "general" ? (
									<GeneralPanel wallet={wallet} focusIndexer={focusIndexer} />
								) : (
									<ExperimentalPanel />
								)}
							</div>
						</div>

						<div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-background via-background/85 to-transparent" />
						<DialogPrimitive.Close
							aria-label="Close settings"
							className="absolute right-4 top-4 z-20 flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand"
						>
							<IconX className="size-4" />
						</DialogPrimitive.Close>
					</div>
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}

function GeneralPanel({
	wallet,
	focusIndexer,
	query = "",
	visible,
}: {
	wallet: WalletState | null;
	focusIndexer: boolean;
	query?: string;
	visible?: Record<GeneralKey, boolean>;
}) {
	const [removing, setRemoving] = useState(false);
	const show = (key: GeneralKey) => visible?.[key] ?? true;

	return (
		<>
			{wallet?.exists && show("notifications") && (
				<NotificationsSection
					key={`notify-${wallet.fingerprint ?? "wallet"}`}
					enabled={wallet.notificationsEnabled}
					query={query}
				/>
			)}

			{show("background") && <BackgroundSection query={query} />}

			{wallet?.exists && show("fiat") && (
				<FiatSection
					key={`fiat-${wallet.fingerprint ?? "wallet"}`}
					enabled={wallet.fiatEnabled ?? false}
					query={query}
				/>
			)}

			{wallet?.exists && show("discreet") && <DiscreetSection query={query} />}

			{wallet?.exists && show("indexer") && (
				<IndexerSection
					key={wallet.fingerprint ?? "wallet"}
					network={wallet.network}
					current={wallet.indexerUri}
					focusOnMount={focusIndexer}
					query={query}
				/>
			)}

			{wallet?.exists && show("remove") && (
				<section className="py-6 first:pt-0 last:pb-0">
					<div className="flex items-start justify-between gap-6">
						<div className="flex flex-col gap-1">
							<span className="text-base font-medium text-destructive">
								<Highlighted text={TEXT.remove.title} query={query} />
							</span>
							<span className="text-sm text-muted-foreground">
								<Highlighted text={TEXT.remove.description} query={query} />
							</span>
						</div>
						<Button
							variant="destructive"
							className="shrink-0"
							onClick={() => setRemoving(true)}
						>
							Remove…
						</Button>
					</div>
				</section>
			)}

			<RemoveDialog
				open={removing}
				onOpenChange={setRemoving}
				walletId={wallet?.walletId ?? null}
				fingerprint={wallet?.fingerprint ?? null}
				network={wallet?.network ?? "mainnet"}
			/>
		</>
	);
}

function ExperimentalPanel() {
	return (
		<section className="py-6 first:pt-0 last:pb-0">
			<p className="text-sm text-amber-200/60">
				Device-only toggles that aren't stable yet. They may change or disappear
				between releases.
			</p>
			<div className="mt-4 flex flex-col divide-y divide-border">
				{FEATURES.map((feature) => (
					<FeatureToggle key={feature.id} feature={feature} />
				))}
				<ReduceMotionToggle />
			</div>
		</section>
	);
}

function SwitchSection({
	title,
	description,
	query,
	checked,
	disabled,
	ariaLabel,
	onChange,
}: {
	title: string;
	description: string;
	query: string;
	checked: boolean;
	disabled: boolean;
	ariaLabel: string;
	onChange: (next: boolean) => void;
}) {
	return (
		<section className="py-6 first:pt-0 last:pb-0">
			<div className="flex items-center justify-between gap-6">
				<div className="flex flex-col gap-1">
					<span className="text-base font-medium text-foreground">
						<Highlighted text={title} query={query} />
					</span>
					<span className="text-sm text-muted-foreground">
						<Highlighted text={description} query={query} />
					</span>
				</div>
				<Switch
					checked={checked}
					disabled={disabled}
					onCheckedChange={onChange}
					aria-label={ariaLabel}
				/>
			</div>
		</section>
	);
}

function BackgroundSection({ query = "" }: { query?: string }) {
	const [on, setOn] = useState(keepRunningInBackground);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		void setKeepRunningIpc(keepRunningInBackground());
	}, []);

	async function toggle(next: boolean) {
		setOn(next);
		setKeepRunningLocal(next);
		setBusy(true);
		try {
			await setKeepRunningIpc(next);
		} catch {
			setOn(!next);
			setKeepRunningLocal(!next);
		} finally {
			setBusy(false);
		}
	}

	return (
		<SwitchSection
			title={TEXT.background.title}
			description={TEXT.background.description}
			query={query}
			checked={on}
			disabled={busy}
			ariaLabel="Keep syncing when app is closed"
			onChange={toggle}
		/>
	);
}

function NotificationsSection({
	enabled,
	query = "",
}: {
	enabled: boolean;
	query?: string;
}) {
	const [on, setOn] = useState(enabled);
	const [busy, setBusy] = useState(false);

	async function toggle(next: boolean) {
		setOn(next);
		setBusy(true);
		try {
			const state = await setNotifications(next);
			setOn(state.notificationsEnabled);
		} catch {
			setOn(!next);
		} finally {
			setBusy(false);
		}
	}

	return (
		<SwitchSection
			title={TEXT.notifications.title}
			description={TEXT.notifications.description}
			query={query}
			checked={on}
			disabled={busy}
			ariaLabel="Transaction notifications"
			onChange={toggle}
		/>
	);
}

function FiatSection({
	enabled,
	query = "",
}: {
	enabled: boolean;
	query?: string;
}) {
	const [on, setOn] = useState(enabled);
	const [busy, setBusy] = useState(false);

	async function toggle(next: boolean) {
		setOn(next);
		setBusy(true);
		try {
			const state = await setFiatEnabled(next);
			setOn(state.fiatEnabled ?? false);
		} catch {
			setOn(!next);
		} finally {
			setBusy(false);
		}
	}

	return (
		<SwitchSection
			title={TEXT.fiat.title}
			description={TEXT.fiat.description}
			query={query}
			checked={on}
			disabled={busy}
			ariaLabel="Fiat price display"
			onChange={toggle}
		/>
	);
}

function DiscreetSection({ query = "" }: { query?: string }) {
	const on = useDiscreet();
	const [busy, setBusy] = useState(false);

	async function toggle() {
		setBusy(true);
		await toggleDiscreet();
		setBusy(false);
	}

	return (
		<SwitchSection
			title={TEXT.discreet.title}
			description={TEXT.discreet.description}
			query={query}
			checked={on}
			disabled={busy}
			ariaLabel="Discreet mode"
			onChange={toggle}
		/>
	);
}

function ToggleRow({
	label,
	description,
	query = "",
	checked,
	onChange,
}: {
	label: string;
	description: string;
	query?: string;
	checked: boolean;
	onChange: (next: boolean) => void;
}) {
	return (
		<div className="flex items-center justify-between gap-6 py-4 first:pt-0 last:pb-0">
			<div className="flex flex-col gap-1">
				<span className="text-base font-medium text-foreground">
					<Highlighted text={label} query={query} />
				</span>
				<span className="text-sm text-muted-foreground">
					<Highlighted text={description} query={query} />
				</span>
			</div>
			<Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
		</div>
	);
}

function FeatureToggle({
	feature,
	query = "",
}: {
	feature: (typeof FEATURES)[number];
	query?: string;
}) {
	const on = useFeature(feature.id);
	return (
		<ToggleRow
			label={feature.label}
			description={feature.description}
			query={query}
			checked={on}
			onChange={(next) => setEnabled(feature.id, next)}
		/>
	);
}

function ReduceMotionToggle({ query = "" }: { query?: string }) {
	const [reduced, setReduced] = useState(reduceMotion);

	function toggle(next: boolean) {
		setReduceMotion(next);
		setReduced(next);
	}

	return (
		<ToggleRow
			label={TEXT.reduceMotion.title}
			description={TEXT.reduceMotion.description}
			query={query}
			checked={reduced}
			onChange={toggle}
		/>
	);
}

type SaveStatus = "idle" | "connecting" | "saved" | "error";

function IndexerSection({
	network,
	current,
	focusOnMount,
	query = "",
}: {
	network: Network;
	current: string;
	focusOnMount: boolean;
	query?: string;
}) {
	const isMainnet = network === "mainnet";
	const preset = isMainnet
		? MAINNET_INDEXERS.find((p) => p.uri === current)
		: undefined;

	const [selection, setSelection] = useState(
		isMainnet && preset ? preset.uri : CUSTOM_INDEXER,
	);
	const [customUrl, setCustomUrl] = useState(preset ? "" : current);
	const [saved, setSaved] = useState(current);
	const [status, setStatus] = useState<SaveStatus>("idle");
	const [error, setError] = useState<string | null>(null);
	const sectionRef = useRef<HTMLElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const resolved = resolveIndexer(selection, customUrl, network);
	const connecting = status === "connecting";
	const changed =
		indexerReady(selection, customUrl, network) && resolved !== saved;

	useEffect(() => {
		if (!focusOnMount) return;
		sectionRef.current?.scrollIntoView({ block: "center" });
		(inputRef.current ?? sectionRef.current?.querySelector("button"))?.focus();
	}, [focusOnMount]);

	function choose(next: string) {
		setSelection(next);
		if (status !== "idle") setStatus("idle");
		setError(null);
	}

	async function save() {
		setStatus("connecting");
		setError(null);
		try {
			const result = await setIndexer(resolved);
			setSaved(result.indexerUri);
			setStatus("saved");
		} catch (e) {
			setError(String(e));
			setStatus("error");
		}
	}

	return (
		<section ref={sectionRef} className="py-6 first:pt-0 last:pb-0">
			<span className="text-base font-medium text-foreground">
				<Highlighted text={TEXT.indexer.title} query={query} />
			</span>
			<p className="mt-1 text-sm text-muted-foreground">
				<Highlighted
					text={
						isMainnet
							? TEXT.indexer.descriptionMainnet
							: TEXT.indexer.descriptionRegtest
					}
					query={query}
				/>
			</p>

			<IndexerPicker
				network={network}
				selection={selection}
				customUrl={customUrl}
				disabled={connecting}
				inputRef={inputRef}
				className="mt-4"
				onSelect={choose}
				onCustomChange={(url) => {
					setCustomUrl(url);
					if (status !== "idle") setStatus("idle");
					setError(null);
				}}
				onCustomSubmit={() => {
					if (changed && !connecting) save();
				}}
			/>

			<div className="mt-4 flex items-center justify-between gap-3">
				<div className="min-w-0 text-xs">
					{status === "saved" && (
						<span className="flex items-center gap-1.5 text-emerald-400">
							<IconCircleCheck className="size-3.5" />
							Connected and saved.
						</span>
					)}
					{status === "error" && error && (
						<span className="text-destructive">{error}</span>
					)}
				</div>
				<Button
					className="shrink-0"
					disabled={!changed || connecting}
					onClick={save}
				>
					{connecting ? (
						<>
							<span
								aria-hidden
								className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70 motion-reduce:hidden"
							/>
							Connecting…
						</>
					) : (
						"Save"
					)}
				</Button>
			</div>
		</section>
	);
}
