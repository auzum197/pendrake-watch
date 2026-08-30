import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
	IconCalendar,
	IconEye,
	IconEyeOff,
	IconInfoCircle,
} from "@tabler/icons-react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover/popover";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card/hover-card";
import {
	DEFAULT_INDEXER,
	getWalletState,
	importUfvk,
	parseUfvk,
	type Network,
	type ParseUfvkResult,
	type UfvkNetwork,
} from "@/lib/ipc";
import {
	birthdayChoice,
	dateFromInput,
	formatDateInput,
	networkFromUfvk,
	onboardingSteps,
} from "@/lib/onboarding";
import { indexerReady, resolveIndexer } from "@/lib/indexer";
import { BirthdayCalendar } from "@/components/onboarding/birthday-calendar";
import pendrakeLogo from "@/assets/pendrake-logo.svg";
import { LifeHashIcon } from "@/components/onboarding/lifehash";
import { IndexerPicker } from "@/components/indexer/indexer-picker";
import { Segmented } from "@/components/app/segmented/segmented";

// Faithful rebuild of the designer's onboarding frames (Import Wallet -> Indexer
// -> Set Password). Fully dark, brand-blue accent, a single centered column with
// the wordmark on top.
// The submit calls importUfvk, the one piece the daemon backs today. The password
// is still UI only (no encryption yet) and carries a TODO where it would wire in.
// The Wallet syncs every pool its UFVK contains, so there's no pool choice to make.

type SyncMode = "date" | "height";

type Draft = {
	ufvk: string;
	syncMode: SyncMode;
	date: string;
	height: string;
	// A preset's URI or the CUSTOM_INDEXER sentinel, alongside the custom field's text.
	indexerSelection: string;
	indexerUri: string;
	password: string;
	confirm: string;
};

const INITIAL: Draft = {
	ufvk: "",
	syncMode: "height",
	date: "",
	height: "",
	indexerSelection: DEFAULT_INDEXER,
	indexerUri: "",
	password: "",
	confirm: "",
};

export function OnboardingPage() {
	const navigate = useNavigate();
	// mode=add: import another UFVK without wiping existing wallets (sidebar Add wallet).
	const search = useSearch({ strict: false }) as { mode?: string };
	const addMode =
		search.mode === "add" ||
		(typeof window !== "undefined" &&
			new URLSearchParams(window.location.search).get("mode") === "add");
	const [index, setIndex] = useState(0);
	const [draft, setDraft] = useState<Draft>(INITIAL);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	// A Replace (or an unlocked session when adding) lands here with the daemon still
	// holding the session passphrase, so Set Password is dropped (docs/adr/0004).
	const [sessionHeld, setSessionHeld] = useState(false);

	useEffect(() => {
		let active = true;
		getWalletState()
			.then((s) => active && setSessionHeld(s.sessionHeld))
			.catch(() => {});
		return () => {
			active = false;
		};
	}, []);

	function set<K extends keyof Draft>(key: K, value: Draft[K]) {
		setDraft((d) => ({ ...d, [key]: value }));
	}

	// The network is derived from the pasted key, so editing the UFVK on the first
	// step reshapes the Indexer step live. A held session passphrase drops Set
	// Password from the sequence (src/lib/onboarding).
	const network = networkFromUfvk(draft.ufvk);
	const steps = onboardingSteps(sessionHeld);
	const position = Math.min(index, steps.length - 1);
	const current = steps[position];
	const isLast = position === steps.length - 1;
	const next = () => setIndex((i) => Math.min(i + 1, steps.length - 1));
	const back = () => setIndex((i) => Math.max(i - 1, 0));
	// On the final step the primary action imports; earlier steps advance. With Set
	// Password present that step owns the submit, so the final step is always the
	// last one in the sequence either way.
	const advance = () => {
		if (isLast) {
			createWallet();
		} else {
			next();
		}
	};

	async function createWallet() {
		setBusy(true);
		setError(null);
		try {
			// Never call removeWallet here — Add wallet and first-run both only import.
			await importUfvk({
				ufvk: draft.ufvk.trim(),
				// The daemon's resolver settles this raw choice into a height
				// (docs/adr/0002), so the GUI never pre-resolves a date.
				birthday: birthdayChoice(draft, network),
				// Regtest has no universal Indexer, so its onboarding requires a custom
				// one and never falls back to DEFAULT_INDEXER, the mainnet endpoint
				// (AUZ-104). Mainnet opens on that default with the region list and a
				// custom entry alongside it.
				indexerUri: resolveIndexer(
					draft.indexerSelection,
					draft.indexerUri,
					network,
				),
				network,
				// First onboarding sets the global passphrase (docs/adr/0003). A
				// post-Replace import omits it so the daemon reuses the held one.
				passphrase: sessionHeld ? undefined : draft.password,
			});
			navigate({ to: "/dashboard" });
		} catch (e) {
			setError(String(e));
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-ink px-10 py-12 text-white">
			<img src={pendrakeLogo} alt="Pendrake" className="h-[27px] select-none" />
			<div className="flex w-full flex-1 flex-col justify-center py-10">
				<div className="mx-auto flex w-full max-w-md flex-col gap-7">
					{current === "identity" && (
						<ImportStep
							draft={draft}
							set={set}
							stepNumber={position + 1}
							stepTotal={steps.length}
							onNext={advance}
							isFinal={isLast}
							busy={busy}
							error={error}
							addMode={addMode}
							onCancel={
								addMode ? () => navigate({ to: "/dashboard" }) : undefined
							}
						/>
					)}
					{current === "indexer" && (
						<IndexerStep
							network={network}
							draft={draft}
							set={set}
							stepNumber={position + 1}
							stepTotal={steps.length}
							onBack={back}
							onNext={advance}
							isFinal={isLast}
							busy={busy}
							error={error}
						/>
					)}
					{current === "passphrase" && (
						<PasswordStep
							draft={draft}
							set={set}
							stepNumber={position + 1}
							stepTotal={steps.length}
							busy={busy}
							error={error}
							onBack={back}
							onSubmit={createWallet}
						/>
					)}
				</div>
			</div>
		</div>
	);
}

function StepHeading({
	step,
	total,
	title,
	subtitle,
}: {
	step: number;
	total: number;
	title: string;
	subtitle: string;
}) {
	return (
		<header className="flex flex-col items-center gap-2 text-center">
			<span className="text-xs text-white/40">
				Step {step} of {total}
			</span>
			<h1 className="font-heading text-4xl font-bold tracking-tight">
				{title}
			</h1>
			<p className="text-sm text-white/50">{subtitle}</p>
		</header>
	);
}

const fieldBase =
	"w-full rounded-xl border border-ink-line bg-ink-soft px-4 text-sm text-white outline-none transition-colors placeholder:text-white/35 focus-visible:border-brand";

function FieldLabel({ children }: { children: ReactNode }) {
	return <span className="text-sm text-white/60">{children}</span>;
}

function PrimaryButton({
	children,
	disabled,
	onClick,
}: {
	children: ReactNode;
	disabled?: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			disabled={disabled}
			onClick={onClick}
			className="h-12 w-full rounded-full bg-brand text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90 disabled:bg-white/10 disabled:text-white/40"
		>
			{children}
		</button>
	);
}

function ImportStep({
	draft,
	set,
	stepNumber,
	stepTotal,
	onNext,
	isFinal,
	busy,
	error,
	addMode = false,
	onCancel,
}: {
	draft: Draft;
	set: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
	stepNumber: number;
	stepTotal: number;
	onNext: () => void;
	// When this is the last step (a Replace dropped Set Password), the primary
	// button imports rather than advancing, and surfaces import progress/errors.
	isFinal: boolean;
	busy: boolean;
	error: string | null;
	addMode?: boolean;
	onCancel?: () => void;
}) {
	const ufvk = draft.ufvk.trim();
	// The decoder's verdict for exactly the current key. While typing or waiting on
	// the daemon, `parsed.input` lags `ufvk`, so `identity` is null and no stale
	// panel or error shows for a key the user has already changed.
	const [parsed, setParsed] = useState<{
		input: string;
		result: ParseUfvkResult;
	} | null>(null);

	useEffect(() => {
		if (ufvk.length === 0) {
			setParsed(null);
			return;
		}
		let active = true;
		const timer = setTimeout(() => {
			parseUfvk(ufvk)
				.then((result) => active && setParsed({ input: ufvk, result }))
				// A daemon hiccup leaves the key unvalidated rather than asserting a verdict.
				.catch(() => active && setParsed(null));
		}, 250);
		return () => {
			active = false;
			clearTimeout(timer);
		};
	}, [ufvk]);

	const identity = parsed?.input === ufvk ? parsed.result : null;
	const checking = ufvk.length > 0 && identity === null;

	return (
		<>
			<StepHeading
				step={stepNumber}
				total={stepTotal}
				title={addMode ? "Add Wallet" : "Import Wallet"}
				subtitle={
					addMode
						? "Import another viewing key. Existing wallets stay on this device."
						: "Restore your Zcash wallet from a unified full viewing key."
				}
			/>

			<div>
				<label className="flex flex-col gap-2">
					<span className="flex items-center gap-1.5">
						<FieldLabel>Unified Full Viewing Key</FieldLabel>
						<HoverCard>
							<HoverCardTrigger asChild>
								<span className="cursor-help text-white/40 transition-colors hover:text-white/70">
									<IconInfoCircle className="size-4" />
								</span>
							</HoverCardTrigger>
							<HoverCardContent className="w-80 border-ink-line bg-[#161618] text-white">
								<p className="text-sm font-semibold tracking-wide">
									Unified Full Viewing Key
								</p>
								<p className="mt-1.5 text-xs leading-relaxed text-white/55">
									A UFVK allows you to watch your wallet's balance without
									holding any spending authority over it.
								</p>
							</HoverCardContent>
						</HoverCard>
					</span>
					<div className="relative">
						<textarea
							autoFocus
							className={`${fieldBase} min-h-52 resize-y py-3 font-mono`}
							placeholder="your ufvk..."
							spellCheck={false}
							autoComplete="off"
							value={draft.ufvk}
							onChange={(e) => set("ufvk", e.currentTarget.value)}
						/>
						{checking && (
							<span
								aria-hidden
								className="absolute right-3 top-3 size-4 animate-spin rounded-full border-2 border-white/15 border-t-white/55 motion-reduce:hidden"
							/>
						)}
					</div>
				</label>

				<UfvkFeedback identity={identity} />
			</div>

			{identity?.kind === "valid" && (
				<div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2 motion-safe:duration-300 motion-safe:ease-out-soft">
					<SyncFrom network={identity.network} draft={draft} set={set} />
				</div>
			)}

			{isFinal && error && (
				<p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
					{error}
				</p>
			)}

			{onCancel && (
				<button
					type="button"
					onClick={onCancel}
					className="h-10 w-full text-sm text-white/50 transition-colors hover:text-white/80"
				>
					Cancel
				</button>
			)}
			<PrimaryButton
				disabled={identity?.kind !== "valid" || busy}
				onClick={onNext}
			>
				{isFinal
					? busy
						? "Importing wallet…"
						: addMode
							? "Add Wallet"
							: "Import Wallet"
					: "Continue"}
			</PrimaryButton>
		</>
	);
}

// The birthday picker, shown only once the key decodes. Its shape follows the
// network: mainnet offers a date or a height, regtest a height alone, since a
// local chain has no calendar to date a birthday against.
function SyncFrom({
	network,
	draft,
	set,
}: {
	network: UfvkNetwork;
	draft: Draft;
	set: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
}) {
	const height = (
		<input
			className={`${fieldBase} h-12 font-mono`}
			inputMode="numeric"
			placeholder="Block height"
			value={draft.height}
			onChange={(e) =>
				set("height", e.currentTarget.value.replace(/[^0-9]/g, ""))
			}
		/>
	);

	return (
		<div className="flex flex-col gap-2.5">
			<FieldLabel>Sync from</FieldLabel>
			{network === "regtest" ? (
				// Regtest has no universal date reference, so it offers only a height,
				// defaulting to its activation (1) when left blank.
				<input
					className={`${fieldBase} h-12 font-mono`}
					inputMode="numeric"
					placeholder="1"
					value={draft.height}
					onChange={(e) =>
						set("height", e.currentTarget.value.replace(/[^0-9]/g, ""))
					}
				/>
			) : (
				<>
					<Segmented
						value={draft.syncMode}
						onChange={(v) => set("syncMode", v)}
						options={[
							{ value: "height", label: "Block Height" },
							{ value: "date", label: "Date" },
						]}
					/>
					{draft.syncMode === "date" ? (
						<DateField value={draft.date} onChange={(v) => set("date", v)} />
					) : (
						height
					)}
				</>
			)}
		</div>
	);
}

// A dd/mm/yyyy field that takes either a typed date or one picked from the
// calendar behind the icon. The calendar is just a second way into the same
// string, so downstream (parseDateToUnix) never knows which the user used.
function DateField({
	value,
	onChange,
}: {
	value: string;
	onChange: (value: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const selected = dateFromInput(value);
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<div className="relative">
				<input
					className={`${fieldBase} h-12 pr-12 font-mono`}
					placeholder="dd/mm/yyyy"
					value={value}
					onChange={(e) => onChange(e.currentTarget.value)}
				/>
				<PopoverTrigger
					type="button"
					aria-label="Open calendar"
					className="absolute right-2.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-white/40 outline-none transition-colors hover:text-white/70 focus-visible:text-white/70"
				>
					<IconCalendar className="size-4" />
				</PopoverTrigger>
			</div>
			<PopoverContent align="end" className="dark w-auto p-0">
				<BirthdayCalendar
					selected={selected}
					onSelect={(date) => {
						onChange(formatDateInput(date));
						setOpen(false);
					}}
				/>
			</PopoverContent>
		</Popover>
	);
}

const NETWORK_LABEL: Record<"mainnet" | "regtest", string> = {
	mainnet: "Mainnet",
	regtest: "Regtest",
};

// Reveals the decoder's verdict under the key field. The panel grows from zero
// height so the form below glides down instead of jumping, and the verdict fades
// in. The last verdict stays mounted through the collapse so closing clips it away
// cleanly. Height and fade are dropped under prefers-reduced-motion.
function UfvkFeedback({ identity }: { identity: ParseUfvkResult | null }) {
	const [shown, setShown] = useState<ParseUfvkResult | null>(identity);
	const [open, setOpen] = useState(identity !== null);

	useEffect(() => {
		if (identity) {
			setShown(identity);
			// Open on the next frame so the row transitions from 0fr with the verdict
			// already mounted, rather than snapping to its height.
			const frame = requestAnimationFrame(() => setOpen(true));
			return () => cancelAnimationFrame(frame);
		}
		setOpen(false);
		const timer = setTimeout(() => setShown(null), 300);
		return () => clearTimeout(timer);
	}, [identity]);

	return (
		<div
			className={`grid ease-out-soft motion-safe:transition-[grid-template-rows] motion-safe:duration-300 ${
				open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
			}`}
		>
			<div className="overflow-hidden">
				{shown && <Verdict key={shown.kind} result={shown} />}
			</div>
		</div>
	);
}

// A single decoded verdict: the identity card, or a testnet/malformed notice. It
// fades in on mount; the panel's height reveal supplies the movement.
function Verdict({ result }: { result: ParseUfvkResult }) {
	const enter =
		"mt-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300 motion-safe:ease-out-soft";

	if (result.kind === "valid") {
		return (
			<div
				className={`flex items-center gap-4 rounded-xl border border-ink-line bg-ink-soft p-4 ${enter}`}
			>
				<LifeHashIcon
					fingerprint={result.fingerprint}
					className="size-14 shrink-0 rounded-full"
				/>
				<div className="flex min-w-0 flex-col gap-2">
					<div className="flex items-center gap-2">
						<span className="rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-medium text-brand">
							{NETWORK_LABEL[result.network]}
						</span>
						<span className="truncate font-mono text-xs text-white/35">
							{result.fingerprint}
						</span>
					</div>
					<div className="flex flex-wrap gap-1.5">
						{result.pools.map((pool) => (
							<span
								key={pool}
								className="rounded-full border border-ink-line px-2 py-0.5 text-[11px] capitalize text-white/60"
							>
								{pool}
							</span>
						))}
					</div>
				</div>
			</div>
		);
	}

	if (result.kind === "testnet") {
		return (
			<p
				className={`rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300 ${enter}`}
			>
				This is a testnet key. Pendrake supports mainnet and regtest only.
			</p>
		);
	}

	return (
		<p
			className={`rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-300 ${enter}`}
		>
			That doesn't look like a valid UFVK. Check that you pasted the whole key.
		</p>
	);
}

// The Indexer the new Wallet syncs against. Mainnet opens on the auto-routed default
// with the region list and a custom entry beside it; regtest has no public default,
// so it only takes a custom one and the primary action stays disabled until the URL
// looks real (AUZ-104).
function IndexerStep({
	network,
	draft,
	set,
	stepNumber,
	stepTotal,
	onBack,
	onNext,
	isFinal,
	busy,
	error,
}: {
	network: Network;
	draft: Draft;
	set: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
	stepNumber: number;
	stepTotal: number;
	onBack: () => void;
	onNext: () => void;
	// On a Replace this is the last step, so its button imports.
	isFinal: boolean;
	busy: boolean;
	error: string | null;
}) {
	const ready = indexerReady(draft.indexerSelection, draft.indexerUri, network);
	return (
		<>
			<StepHeading
				step={stepNumber}
				total={stepTotal}
				title="Indexer"
				subtitle={
					network === "regtest"
						? "A regtest key was detected. Point it at the Indexer to connect to."
						: "Choose where this Wallet gets its chain data from."
				}
			/>

			<div className="flex flex-col gap-2">
				{network === "regtest" && <FieldLabel>Indexer URL</FieldLabel>}
				<IndexerPicker
					network={network}
					selection={draft.indexerSelection}
					customUrl={draft.indexerUri}
					disabled={busy}
					autoFocus={network === "regtest"}
					inputClassName="h-12 rounded-xl border-ink-line bg-ink-soft px-4 text-sm"
					onSelect={(selection) => set("indexerSelection", selection)}
					onCustomChange={(url) => set("indexerUri", url)}
					onCustomSubmit={() => {
						if (ready && !busy) onNext();
					}}
				/>
			</div>

			{isFinal && error && (
				<p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
					{error}
				</p>
			)}

			<div className="flex items-center gap-3">
				<BackButton onClick={onBack} />
				<PrimaryButton disabled={busy || !ready} onClick={onNext}>
					{isFinal
						? busy
							? "Importing wallet…"
							: "Import Wallet"
						: "Continue"}
				</PrimaryButton>
			</div>
		</>
	);
}

function PasswordStep({
	draft,
	set,
	stepNumber,
	stepTotal,
	busy,
	error,
	onBack,
	onSubmit,
}: {
	draft: Draft;
	set: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
	stepNumber: number;
	stepTotal: number;
	busy: boolean;
	error: string | null;
	onBack: () => void;
	onSubmit: () => void;
}) {
	const score = strength(draft.password);
	const matches = draft.password.length > 0 && draft.password === draft.confirm;

	return (
		<>
			<StepHeading
				step={stepNumber}
				total={stepTotal}
				title="Set Password"
				subtitle="This password encrypts your wallet on this device."
			/>

			<div className="flex flex-col gap-2">
				<FieldLabel>Password</FieldLabel>
				<PasswordInput
					placeholder="Enter a password"
					value={draft.password}
					onChange={(v) => set("password", v)}
				/>
				{draft.password.length > 0 && <StrengthMeter score={score} />}
			</div>

			<label className="flex flex-col gap-2">
				<FieldLabel>Re-enter Password</FieldLabel>
				<PasswordInput
					placeholder="Confirm your password"
					value={draft.confirm}
					onChange={(v) => set("confirm", v)}
				/>
			</label>

			{error && (
				<p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
					{error}
				</p>
			)}

			<div className="flex items-center gap-3">
				<BackButton onClick={onBack} />
				<PrimaryButton disabled={!matches || busy} onClick={onSubmit}>
					{busy ? "Importing wallet…" : "Import Wallet"}
				</PrimaryButton>
			</div>
		</>
	);
}

function PasswordInput({
	placeholder,
	value,
	onChange,
}: {
	placeholder: string;
	value: string;
	onChange: (v: string) => void;
}) {
	const [shown, setShown] = useState(false);
	return (
		<div className="relative">
			<input
				type={shown ? "text" : "password"}
				className={`${fieldBase} h-12 pr-12 font-mono`}
				placeholder={placeholder}
				value={value}
				onChange={(e) => onChange(e.currentTarget.value)}
			/>
			<button
				type="button"
				tabIndex={-1}
				onClick={() => setShown((s) => !s)}
				className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white/70"
			>
				{shown ? (
					<IconEyeOff className="size-4" />
				) : (
					<IconEye className="size-4" />
				)}
			</button>
		</div>
	);
}

const STRENGTH_LABELS = ["Weak", "Fair", "Good", "Strong"];

// A rough four-step score off length and character variety. The real gate lives
// with the backend once password-derived encryption exists.
function strength(pw: string): number {
	if (pw.length === 0) return 0;
	let s = 0;
	if (pw.length >= 8) s++;
	if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
	if (/[0-9]/.test(pw)) s++;
	if (/[^A-Za-z0-9]/.test(pw)) s++;
	return Math.min(4, Math.max(1, s));
}

function StrengthMeter({ score }: { score: number }) {
	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex gap-1.5">
				{[0, 1, 2, 3].map((i) => (
					<span
						key={i}
						className={`h-1 flex-1 rounded-full ${i < score ? "bg-brand" : "bg-white/10"}`}
					/>
				))}
			</div>
			<span className="text-xs text-white/50">
				Strength:{" "}
				<span className="font-medium text-white/80">
					{STRENGTH_LABELS[Math.max(0, score - 1)]}
				</span>
			</span>
		</div>
	);
}

function BackButton({ onClick }: { onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="h-12 shrink-0 rounded-full px-6 text-sm font-medium text-white/55 transition-colors hover:text-white/80"
		>
			Back
		</button>
	);
}
