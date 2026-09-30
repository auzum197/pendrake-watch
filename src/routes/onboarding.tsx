import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  IconCalendar,
  IconEye,
  IconEyeOff,
  IconInfoCircle,
  IconPencil,
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
  type UfvkIdentity,
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
import { LifeHashAvatar } from "@/components/onboarding/lifehash-avatar";
import { OnboardingCard } from "@/components/onboarding/onboarding-card";
import { IndexerPicker } from "@/components/indexer/indexer-picker";
import { Segmented } from "@/components/app/segmented/segmented";

// The onboarding flow (Import Wallet -> Indexer -> Set Password) in a centred
// card over the blurred landscape (src/components/onboarding/onboarding-card).
// Brand-blue accent, the wordmark on top, a quiet progress track under the card.
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
  const { identity, checking } = useUfvkIdentity(draft.ufvk.trim());
  const steps = onboardingSteps(sessionHeld);
  const position = Math.min(index, steps.length - 1);
  const current = steps[position];
  const next = () => setIndex((i) => Math.min(i + 1, steps.length - 1));
  const back = () => setIndex((i) => Math.max(i - 1, 0));
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

  // One step by index. On the final step the primary action imports; earlier steps
  // advance. With Set Password present that step owns the submit, so the final step
  // is always the last one in the sequence either way.
  function renderStep(i: number) {
    const id = steps[i];
    const final = i === steps.length - 1;
    const onNext = final ? createWallet : next;
    if (id === "identity") {
      return (
        <ImportStep
          draft={draft}
          set={set}
          identity={identity}
          checking={checking}
          onNext={onNext}
          isFinal={final}
          busy={busy}
          error={error}
          addMode={addMode}
          onCancel={addMode ? () => navigate({ to: "/dashboard" }) : undefined}
        />
      );
    }
    if (id === "indexer") {
      return (
        <IndexerStep
          network={network}
          draft={draft}
          set={set}
          onBack={back}
          onNext={onNext}
          isFinal={final}
          busy={busy}
          error={error}
        />
      );
    }
    return (
      <PasswordStep
        draft={draft}
        set={set}
        busy={busy}
        error={error}
        onBack={back}
        onSubmit={createWallet}
      />
    );
  }

  return (
    <OnboardingCard
      stepKey={current}
      progress={{ step: position, total: steps.length }}
    >
      <div className="flex flex-col gap-7">{renderStep(position)}</div>
    </OnboardingCard>
  );
}

function StepHeading({ title }: { title: string }) {
  return (
    <h1 className="text-center font-heading text-4xl font-bold tracking-tight">
      {title}
    </h1>
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
      className="h-12 w-full rounded-full bg-brand text-sm font-semibold text-brand-foreground transition-[background-color,color,transform] duration-150 ease-out-soft hover:bg-brand/90 active:scale-[0.98] disabled:bg-white/10 disabled:text-white/40"
    >
      {children}
    </button>
  );
}

// The decoder's verdict for exactly the current key, debounced. While typing or
// waiting on the daemon, `parsed.input` lags `ufvk`, so `identity` is null and no
// stale row or error shows for a key the user has already changed.
function useUfvkIdentity(ufvk: string) {
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
  return { identity, checking };
}

function ImportStep({
  draft,
  set,
  identity,
  checking,
  onNext,
  isFinal,
  busy,
  error,
  addMode = false,
  onCancel,
}: {
  draft: Draft;
  set: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  identity: ParseUfvkResult | null;
  checking: boolean;
  onNext: () => void;
  // When this is the last step (a Replace dropped Set Password), the primary
  // button imports rather than advancing, and surfaces import progress/errors.
  isFinal: boolean;
  busy: boolean;
  error: string | null;
  addMode?: boolean;
  onCancel?: () => void;
}) {
  const valid = identity?.kind === "valid" ? identity : null;
  const [shown, setShown] = useState(valid);
  if (valid && valid !== shown) setShown(valid);

  const [reopened, setReopened] = useState(false);
  const folded = valid !== null && !reopened;

  return (
    <>
      <StepHeading title={addMode ? "Add Wallet" : "Import Wallet"} />

      <KeyField
        value={draft.ufvk}
        onChange={(next) => {
          setReopened(false);
          set("ufvk", next);
        }}
        onBlur={() => setReopened(false)}
        checking={checking}
        verdict={identity?.kind ?? null}
        folded={folded}
        reopened={reopened}
      >
        {shown && (
          <FoldedKey
            ufvk={draft.ufvk.trim()}
            identity={shown}
            settled={folded}
            onEdit={() => setReopened(true)}
          >
            <SyncFrom network={shown.network} draft={draft} set={set} />
          </FoldedKey>
        )}
      </KeyField>

      <StepActions
        error={isFinal ? error : null}
        onCancel={onCancel}
        disabled={valid === null || busy}
        onNext={onNext}
        label={primaryLabel({ isFinal, busy, addMode })}
      />
    </>
  );
}

function primaryLabel({
  isFinal,
  busy,
  addMode = false,
}: {
  isFinal: boolean;
  busy: boolean;
  addMode?: boolean;
}) {
  if (!isFinal) return "Continue";
  if (busy) return "Importing wallet…";
  return addMode ? "Add Wallet" : "Import Wallet";
}

function StepActions({
  error,
  onBack,
  onCancel,
  disabled,
  onNext,
  label,
}: {
  error: string | null;
  onBack?: () => void;
  onCancel?: () => void;
  disabled: boolean;
  onNext: () => void;
  label: string;
}) {
  return (
    <>
      {error && (
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
      <div className="flex items-center gap-3">
        {onBack && <BackButton onClick={onBack} />}
        <PrimaryButton disabled={disabled} onClick={onNext}>
          {label}
        </PrimaryButton>
      </div>
    </>
  );
}

const VERDICT_TEXT = {
  malformed: "Not a valid UFVK. Check that you pasted the whole key.",
  testnet: "Testnet key. Pendrake supports mainnet and regtest only.",
};

function KeyField({
  value,
  onChange,
  onBlur,
  checking,
  verdict,
  folded,
  reopened,
  children,
}: {
  value: string;
  onChange: (next: string) => void;
  onBlur: () => void;
  checking: boolean;
  verdict: ParseUfvkResult["kind"] | null;
  folded: boolean;
  reopened: boolean;
  children: ReactNode;
}) {
  const id = useId();
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (reopened) field.current?.focus({ preventScroll: true });
  }, [reopened]);

  const border =
    verdict === "malformed"
      ? "border-red-500/60"
      : verdict === "testnet"
        ? "border-amber-500/60"
        : "border-ink-line focus-within:border-brand";
  const problem =
    verdict === "malformed" || verdict === "testnet"
      ? VERDICT_TEXT[verdict]
      : null;

  return (
    <div className="flex flex-col gap-2">
      <KeyLabel htmlFor={id} />
      <div className="grid h-64 grid-cols-[minmax(0,1fr)]">
        <div
          className="relative col-start-1 row-start-1 min-w-0"
          inert={folded}
          aria-hidden={folded}
        >
          <div
            className={`absolute inset-x-0 top-0 overflow-hidden rounded-xl border bg-ink-soft transition-colors motion-safe:transition-[height,opacity,border-color] motion-safe:duration-250 ease-out-soft ${border} ${
              folded ? "pointer-events-none opacity-0" : ""
            }`}
            style={{ height: folded ? "3.5rem" : "16rem" }}
          >
            <textarea
              id={id}
              ref={field}
              autoFocus
              className="absolute inset-x-0 top-0 h-64 w-full resize-none bg-transparent px-4 py-3 pr-12 font-mono text-sm text-white outline-none placeholder:text-white/35"
              placeholder="your ufvk..."
              spellCheck={false}
              autoComplete="off"
              value={value}
              onChange={(e) => onChange(e.currentTarget.value)}
              onBlur={onBlur}
            />
            {checking && (
              <span
                aria-hidden
                className="absolute right-3 top-3 size-4 animate-spin rounded-full border-2 border-white/15 border-t-white/55 motion-reduce:hidden"
              />
            )}
          </div>
        </div>
        <div
          className={`col-start-1 row-start-1 flex min-w-0 flex-col gap-4 transition-opacity motion-safe:duration-250 ease-out-soft ${
            folded ? "" : "pointer-events-none opacity-0"
          }`}
          inert={!folded}
          aria-hidden={!folded}
        >
          {children}
        </div>
      </div>
      <p
        className={`h-4 truncate text-xs leading-4 transition-opacity duration-200 ease-out-soft ${
          verdict === "malformed"
            ? "text-red-300"
            : verdict === "testnet"
              ? "text-amber-300"
              : "opacity-0"
        }`}
      >
        {problem ?? " "}
      </p>
    </div>
  );
}

function KeyLabel({ htmlFor }: { htmlFor: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <label htmlFor={htmlFor} className="text-sm text-white/60">
        Unified Full Viewing Key
      </label>
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
            A UFVK allows you to watch your wallet's balance without holding any
            spending authority over it.
          </p>
        </HoverCardContent>
      </HoverCard>
    </span>
  );
}

function FoldedKey({
  ufvk,
  identity,
  settled,
  onEdit,
  children,
}: {
  ufvk: string;
  identity: UfvkIdentity;
  settled: boolean;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onEdit}
        className="flex h-14 w-full items-center gap-3 rounded-xl border border-ink-line bg-ink-soft px-3 text-left transition-colors hover:border-white/25"
      >
        <LifeHashAvatar
          fingerprint={identity.fingerprint}
          ringed
          className="size-9 shrink-0 rounded-full"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-xs text-white/70">
            {ufvk}
          </span>
          <span className="mt-0.5 flex items-center gap-2 text-[11px] text-white/40">
            <span className="text-brand">
              {NETWORK_LABEL[identity.network]}
            </span>
            <span>{poolList(identity.pools)}</span>
          </span>
        </span>
        <IconPencil className="size-4 shrink-0 text-white/40" />
      </button>
      <div
        className={`motion-safe:transition-[opacity,transform] motion-safe:duration-250 ease-out-soft ${
          settled
            ? "motion-safe:delay-100"
            : "opacity-0 motion-safe:translate-y-2"
        }`}
      >
        {children}
      </div>
    </>
  );
}

function poolList(pools: UfvkIdentity["pools"]) {
  return pools.map((p) => p[0].toUpperCase() + p.slice(1)).join(" · ");
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

// The Indexer the new Wallet syncs against. Mainnet opens on the auto-routed default
// with the region list and a custom entry beside it; regtest has no public default,
// so it only takes a custom one and the primary action stays disabled until the URL
// looks real (AUZ-104).
function IndexerStep({
  network,
  draft,
  set,
  onBack,
  onNext,
  isFinal,
  busy,
  error,
}: {
  network: Network;
  draft: Draft;
  set: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
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
      <StepHeading title="Indexer" />

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

      <StepActions
        error={isFinal ? error : null}
        onBack={onBack}
        disabled={busy || !ready}
        onNext={onNext}
        label={primaryLabel({ isFinal, busy })}
      />
    </>
  );
}

function PasswordStep({
  draft,
  set,
  busy,
  error,
  onBack,
  onSubmit,
}: {
  draft: Draft;
  set: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const score = strength(draft.password);
  const matches = draft.password.length > 0 && draft.password === draft.confirm;

  return (
    <>
      <StepHeading title="Set Password" />

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

      <StepActions
        error={error}
        onBack={onBack}
        disabled={!matches || busy}
        onNext={onSubmit}
        label={primaryLabel({ isFinal: true, busy })}
      />
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
      className="h-12 shrink-0 rounded-full px-6 text-sm font-medium text-white/55 transition-[color,transform] duration-150 ease-out-soft hover:text-white/80 active:scale-[0.98]"
    >
      Back
    </button>
  );
}
