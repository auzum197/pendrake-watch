import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  IconAdjustmentsHorizontal,
  IconCalendar,
  IconCheck,
  IconChevronDown,
  IconCircleDashed,
  IconEye,
  IconEyeOff,
  IconInfoCircle,
  IconLeaf,
  IconServer2,
  IconStack2,
} from "@tabler/icons-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DEFAULT_INDEXER, importUfvk, type Network } from "@/lib/ipc";

// Faithful rebuild of the designer's onboarding frames (Import Wallet -> Server
// -> Set Password). Fully dark, brand-blue accent, split layout with the 龙 mark.
// The submit calls importUfvk, the one piece the daemon backs today. Still UI
// only, pending backend: the password (no encryption yet), pool selection, and
// regtest server routing. Those carry TODOs where they'd wire in.

type SyncMode = "date" | "height";
type Pool = "orchard" | "sapling" | "transparent" | "sprout";
type ServerMode = "default" | "custom";

type Draft = {
  ufvk: string;
  syncMode: SyncMode;
  date: string;
  height: string;
  pools: Pool[];
  server: ServerMode;
  serverUrl: string;
  password: string;
  confirm: string;
};

// The network is derived from the UFVK's bech32m prefix and is immutable for the
// wallet (docs/adr/0002): the engine cross-checks this against the key and rejects
// a mismatch. uviewtest/uviewregtest are testnet, otherwise mainnet. The daemon
// only models mainnet and testnet, so regtest folds into testnet for now.
function networkFromUfvk(ufvk: string): Network {
  const hrp = ufvk.trim().toLowerCase();
  return hrp.startsWith("uviewtest") || hrp.startsWith("uviewregtest")
    ? "testnet"
    : "mainnet";
}

const INITIAL: Draft = {
  ufvk: "",
  syncMode: "date",
  date: "",
  height: "",
  pools: ["orchard", "sapling"],
  server: "default",
  serverUrl: "",
  password: "",
  confirm: "",
};

export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(INITIAL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function createWallet() {
    setBusy(true);
    setError(null);
    try {
      await importUfvk({
        ufvk: draft.ufvk.trim(),
        // TODO: a date birthday needs server-side conversion to a height. Until
        // then a height syncs from there, a date scans from the start.
        birthday: draft.syncMode === "height" ? Number(draft.height) || 0 : 0,
        indexerUri:
          draft.server === "custom" && draft.serverUrl.trim()
            ? draft.serverUrl.trim()
            : DEFAULT_INDEXER,
        network: networkFromUfvk(draft.ufvk),
        // The global passphrase encrypts the wallet at rest and is the unlock key
        // (docs/adr/0003).
        passphrase: draft.password,
      });
      navigate({ to: "/dashboard" });
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-ink text-white">
      <DragonPanel />
      <div className="flex flex-1 items-center overflow-y-auto px-10 py-12">
        <div className="mx-auto flex w-full max-w-md flex-col gap-7">
          {step === 0 && (
            <ImportStep
              draft={draft}
              set={set}
              onNext={() => setStep(1)}
            />
          )}
          {step === 1 && (
            <ServerStep
              draft={draft}
              set={set}
              onBack={() => setStep(0)}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <PasswordStep
              draft={draft}
              set={set}
              busy={busy}
              error={error}
              onBack={() => setStep(1)}
              onSubmit={createWallet}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DragonPanel() {
  return (
    <div className="relative hidden w-1/2 shrink-0 items-center justify-center overflow-hidden lg:flex">
      <div className="absolute left-1/4 top-1/3 size-[28rem] -translate-x-1/2 rounded-full bg-brand/40 blur-[64px]" />
      <span className="relative font-heading text-[16rem] leading-none font-bold text-brand select-none">
        龙
      </span>
    </div>
  );
}

function StepHeading({
  step,
  title,
  subtitle,
}: {
  step: number;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="flex flex-col gap-2">
      <span className="text-xs text-white/40">Step {step} of 3</span>
      <h1 className="font-heading text-4xl font-bold tracking-tight">{title}</h1>
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
  onNext,
}: {
  draft: Draft;
  set: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  onNext: () => void;
}) {
  return (
    <>
      <StepHeading
        step={1}
        title="Import Wallet"
        subtitle="Restore your Zcash wallet from a unified full viewing key."
      />

      <label className="flex flex-col gap-2">
        <span className="flex items-center gap-1.5">
          <FieldLabel>Unified Full Viewing Key</FieldLabel>
          <Popover>
            <PopoverTrigger className="text-white/40 transition-colors hover:text-white/70">
              <IconInfoCircle className="size-4" />
            </PopoverTrigger>
            <PopoverContent className="w-80 border-ink-line bg-[#161618] text-white">
              <p className="text-sm font-semibold uppercase tracking-wide">
                Unified Full Viewing Key
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-white/55">
                A UFVK lets the wallet watch your balance and history without any
                spending key. Pasting it creates a watch-only wallet, so no funds
                can ever move from here.
              </p>
            </PopoverContent>
          </Popover>
        </span>
        <textarea
          className={`${fieldBase} min-h-28 resize-y py-3 font-mono`}
          placeholder="your ufvk..."
          spellCheck={false}
          autoComplete="off"
          value={draft.ufvk}
          onChange={(e) => set("ufvk", e.currentTarget.value)}
        />
      </label>

      <div className="flex flex-col gap-2.5">
        <FieldLabel>Sync from</FieldLabel>
        <Segmented
          value={draft.syncMode}
          onChange={(v) => set("syncMode", v)}
          options={[
            { value: "date", label: "Date" },
            { value: "height", label: "Block Height" },
          ]}
        />
        {draft.syncMode === "date" ? (
          <div className="relative">
            <input
              className={`${fieldBase} h-12 font-mono`}
              placeholder="dd/mm/yyyy"
              value={draft.date}
              onChange={(e) => set("date", e.currentTarget.value)}
            />
            <IconCalendar className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-white/40" />
          </div>
        ) : (
          <input
            className={`${fieldBase} h-12 font-mono`}
            inputMode="numeric"
            placeholder="Block height"
            value={draft.height}
            onChange={(e) =>
              set("height", e.currentTarget.value.replace(/[^0-9]/g, ""))
            }
          />
        )}
        <PoolsField
          pools={draft.pools}
          onChange={(pools) => set("pools", pools)}
        />
      </div>

      <PrimaryButton
        disabled={draft.ufvk.trim().length === 0}
        onClick={onNext}
      >
        Continue
      </PrimaryButton>
    </>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex w-fit rounded-full border border-ink-line bg-ink-soft p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-full px-5 py-1.5 text-sm font-medium transition-colors ${
            value === o.value
              ? "bg-brand text-brand-foreground"
              : "text-white/55 hover:text-white/80"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const POOLS: { id: Pool; label: string; icon: ReactNode; deprecated?: boolean }[] =
  [
    { id: "orchard", label: "Orchard", icon: <IconStack2 className="size-4" /> },
    { id: "sapling", label: "Sapling", icon: <IconLeaf className="size-4" /> },
    {
      id: "transparent",
      label: "Transparent",
      icon: <IconEye className="size-4" />,
    },
    {
      id: "sprout",
      label: "Sprout",
      icon: <IconCircleDashed className="size-4" />,
      deprecated: true,
    },
  ];

function PoolsField({
  pools,
  onChange,
}: {
  pools: Pool[];
  onChange: (pools: Pool[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (id: Pool) =>
    onChange(
      pools.includes(id) ? pools.filter((p) => p !== id) : [...pools, id],
    );

  return (
    <div className="rounded-xl border border-ink-line bg-ink-soft">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-12 w-full items-center justify-between px-4 text-sm"
      >
        <span>
          <span className="font-medium">Pools</span>
          <span className="text-white/45"> · {pools.length} selected</span>
        </span>
        <IconChevronDown
          className={`size-4 text-white/45 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <ul className="flex flex-col gap-1 px-2 pb-2">
          {POOLS.map((pool) => {
            const on = pools.includes(pool.id);
            return (
              <li key={pool.id}>
                <button
                  type="button"
                  onClick={() => toggle(pool.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white/5"
                >
                  <span className="flex size-8 items-center justify-center rounded-full bg-white/5 text-white/70">
                    {pool.icon}
                  </span>
                  <span className="text-sm font-medium">{pool.label}</span>
                  {pool.deprecated && (
                    <span className="rounded-full border border-ink-line px-2 py-0.5 text-[10px] text-white/40">
                      deprecated
                    </span>
                  )}
                  <span
                    className={`ml-auto flex size-5 items-center justify-center rounded-full border transition-colors ${
                      on
                        ? "border-brand bg-brand text-white"
                        : "border-white/25"
                    }`}
                  >
                    {on && <IconCheck className="size-3.5" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ServerStep({
  draft,
  set,
  onBack,
  onNext,
}: {
  draft: Draft;
  set: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <StepHeading
        step={2}
        title="Server"
        subtitle="A regtest key was detected. Choose how to connect."
      />

      <div className="grid grid-cols-2 gap-4">
        <ServerCard
          active={draft.server === "default"}
          icon={<IconServer2 className="size-4" />}
          title="Default"
          desc="Use the bundled regtest node."
          onClick={() => set("server", "default")}
        />
        <ServerCard
          active={draft.server === "custom"}
          icon={<IconAdjustmentsHorizontal className="size-4" />}
          title="Custom"
          desc="Point to your own server URL."
          onClick={() => set("server", "custom")}
        />
      </div>

      {draft.server === "custom" && (
        <label className="flex flex-col gap-2">
          <FieldLabel>Custom Server URL</FieldLabel>
          <input
            className={`${fieldBase} h-12 font-mono`}
            placeholder="https://localhost:8232"
            spellCheck={false}
            autoComplete="off"
            value={draft.serverUrl}
            onChange={(e) => set("serverUrl", e.currentTarget.value)}
          />
        </label>
      )}

      <div className="flex items-center gap-3">
        <BackButton onClick={onBack} />
        <PrimaryButton onClick={onNext}>Continue</PrimaryButton>
      </div>
    </>
  );
}

function ServerCard({
  active,
  icon,
  title,
  desc,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col gap-3 rounded-2xl border p-4 text-left transition-colors ${
        active
          ? "border-brand bg-brand/10"
          : "border-ink-line bg-ink-soft hover:border-white/20"
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="flex size-9 items-center justify-center rounded-full bg-white/5 text-white/70">
          {icon}
        </span>
        <span
          className={`flex size-5 items-center justify-center rounded-full border transition-colors ${
            active ? "border-brand bg-brand text-white" : "border-white/25"
          }`}
        >
          {active && <IconCheck className="size-3.5" />}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-medium">{title}</span>
        <span className="text-xs text-white/45">{desc}</span>
      </div>
    </button>
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
      <StepHeading
        step={3}
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
          {busy ? "Creating wallet…" : "Create Wallet"}
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
