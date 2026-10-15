import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  IconChevronRight,
  IconClipboard,
  IconCopy,
  IconFlask,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import type { Network, Pool, TxKind } from "@/lib/ipc";
import { reduceMotion } from "@/lib/motion";
import { reloadWalletData } from "@/hooks/use-wallet-data";
import { switchWallet } from "@/components/app/wallet-card/switch-wallet";
import { Segmented } from "@/components/app/segmented/segmented";
import { HoldButton } from "@/components/ui/hold-button/hold-button";
import { Switch } from "@/components/ui/switch/switch";
import { LifeHashIcon } from "@/components/onboarding/lifehash";
import { walletId } from "./daemon";
import { isScenario, type Condition, type WalletSpec } from "./scenario";
import { daemon } from "./transport";
import type { TxEvent } from "./wallets";
import "./bubble.css";

// The lab: a floating editor for the fake daemon's persisted state, the app
// settings and every Wallet's identity, persona and history. Sync progress, the
// chain tip and the mempool are runtime, so they appear as a condition to start
// from rather than as fields. Every change applies at once and lands in
// localStorage.

const POOLS: Pool[] = ["orchard", "sapling", "transparent", "ironwood"];
const KINDS: TxKind[] = ["received", "sent"];
const NETWORKS: { value: Network; label: string }[] = [
  { value: "mainnet", label: "Mainnet" },
  { value: "regtest", label: "Regtest" },
];
const CONDITIONS: { value: Condition["kind"]; label: string }[] = [
  { value: "synced", label: "Synced" },
  { value: "scanning", label: "Scanning" },
  { value: "unreachable", label: "Unreachable" },
  { value: "unavailable", label: "Unavailable" },
];
const CLOSE_MS = 120;

type ChipStyle = CSSProperties & { "--chip"?: string };

function after() {
  reloadWalletData();
}

function useScenario() {
  return useSyncExternalStore(
    daemon.onChange,
    daemon.scenario,
    daemon.scenario,
  );
}

function useLocked() {
  return useSyncExternalStore(
    daemon.onChange,
    daemon.isLocked,
    daemon.isLocked,
  );
}

function useEvents(id: string) {
  const read = () => daemon.eventsOf(id);
  return useSyncExternalStore(daemon.onChange, read, read);
}

type TextProps = {
  value: string;
  onCommit: (next: string) => void;
  type?: "text" | "number" | "datetime-local";
  placeholder?: string;
  step?: string;
  label?: string;
};

// Commits on blur or Enter, so a label is not rebuilt on every keystroke. Keyed on
// the committed value, so an outside change (the app renaming the Wallet) resets
// the draft.
function Text(props: TextProps) {
  return <Draft key={props.value} {...props} />;
}

function Draft({
  value,
  onCommit,
  type = "text",
  placeholder,
  step,
  label,
}: TextProps) {
  const [draft, setDraft] = useState(value);
  return (
    <input
      className="lab-input"
      type={type}
      step={step}
      value={draft}
      placeholder={placeholder}
      aria-label={label}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== value) onCommit(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}

function Num({
  value,
  onCommit,
  step,
  label,
}: {
  value: number;
  onCommit: (next: number) => void;
  step?: string;
  label?: string;
}) {
  return (
    <Text
      type="number"
      step={step}
      label={label}
      value={String(value)}
      onCommit={(s) => {
        const n = Number(s);
        if (Number.isFinite(n)) onCommit(n);
      }}
    />
  );
}

function Chip({
  on,
  onChange,
  label,
  color,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
  color?: string;
}) {
  const style: ChipStyle | undefined = color ? { "--chip": color } : undefined;
  return (
    <button
      type="button"
      className="lab-chip"
      aria-pressed={on}
      style={style}
      onClick={() => onChange(!on)}
    >
      {label}
    </button>
  );
}

function Pick<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly T[];
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <select
      className="lab-input"
      aria-label={label}
      value={value}
      onChange={(e) => {
        const next = options.find((o) => o === e.target.value);
        if (next !== undefined) onChange(next);
      }}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="lab-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Kicker({
  children,
  trailing,
}: {
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex min-h-7 items-center justify-between">
      <h3 className="lab-kicker">{children}</h3>
      {trailing}
    </div>
  );
}

function toLocalInput(secs: number): string {
  const d = new Date(secs * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(s: string): number | null {
  const ms = new Date(s).getTime();
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

function AppSection() {
  const scenario = useScenario();
  const locked = useLocked();
  const patch = (p: Parameters<typeof daemon.patchApp>[0]) => {
    daemon.patchApp(p);
    after();
  };
  return (
    <section className="lab-section space-y-2">
      <Kicker>App</Kicker>
      <div className="flex flex-wrap gap-1.5">
        <Chip
          label="Locked"
          on={locked}
          onChange={(v) => {
            daemon.setLocked(v);
            after();
          }}
        />
        <Chip
          label="Session held"
          on={scenario.sessionHeld}
          onChange={(v) => patch({ sessionHeld: v })}
        />
        <Chip
          label="Fiat"
          on={scenario.fiatEnabled}
          onChange={(v) => patch({ fiatEnabled: v })}
        />
        <Chip
          label="Discreet"
          on={scenario.discreet}
          onChange={(v) => patch({ discreet: v })}
        />
        <Chip
          label="Keep running"
          on={scenario.keepRunning}
          onChange={(v) => patch({ keepRunning: v })}
        />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <Field label="Passphrase">
          <Text
            value={scenario.passphrase}
            onCommit={(v) => patch({ passphrase: v })}
          />
        </Field>
        <Field label="USD per ZEC">
          <Text
            type="number"
            step="0.01"
            placeholder="seeded series"
            value={
              scenario.usdPerZec === undefined ? "" : String(scenario.usdPerZec)
            }
            onCommit={(s) => {
              const n = Number(s);
              patch({ usdPerZec: s.trim() === "" || !(n > 0) ? undefined : n });
            }}
          />
        </Field>
      </div>
    </section>
  );
}

function conditionFor(kind: Condition["kind"], prev: Condition): Condition {
  switch (kind) {
    case "synced":
    case "unreachable":
      return { kind };
    case "scanning":
      return { kind, done: prev.kind === "scanning" ? prev.done : 0.4 };
    case "unavailable":
      return {
        kind,
        reason:
          prev.kind === "unavailable"
            ? prev.reason
            : "could not open wallet file: unexpected end of file while reading the header",
      };
  }
}

function WalletEditor({ spec }: { spec: WalletSpec }) {
  const id = walletId(spec);
  const { persona, condition } = spec;
  const patch = (p: Parameters<typeof daemon.patchWallet>[1]) => {
    daemon.patchWallet(id, p);
    after();
  };
  return (
    <div className="lab-wallet-inner">
      <Kicker
        trailing={
          <button
            type="button"
            className="lab-btn"
            onClick={() => void switchWallet(id)}
          >
            Select in app
          </button>
        }
      >
        Identity
      </Kicker>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <Field label="Label">
          <Text
            value={spec.label ?? ""}
            placeholder={id.slice(0, 8)}
            onCommit={(v) => patch({ label: v })}
          />
        </Field>
        <Field label="Birthday">
          <Num
            value={persona.birthdayHeight}
            onCommit={(birthdayHeight) =>
              patch({ persona: { birthdayHeight } })
            }
          />
        </Field>
        <Field label="Indexer">
          <Text
            value={spec.indexerUri}
            onCommit={(indexerUri) => patch({ indexerUri })}
          />
        </Field>
        <Field label="Notifications">
          <Switch
            checked={spec.notificationsEnabled}
            onCheckedChange={(notificationsEnabled) =>
              patch({ notificationsEnabled })
            }
          />
        </Field>
      </div>
      <Field label="Network">
        <Segmented
          tone="neutral"
          value={persona.network}
          options={NETWORKS}
          onChange={(network) => patch({ persona: { network } })}
        />
      </Field>
      <Field label="Pools">
        <div className="flex flex-wrap gap-1.5">
          {POOLS.map((pool) => (
            <Chip
              key={pool}
              label={pool}
              color={`var(--pool-${pool})`}
              on={persona.pools.includes(pool)}
              onChange={(on) => {
                const pools = on
                  ? POOLS.filter((p) => p === pool || persona.pools.includes(p))
                  : persona.pools.filter((p) => p !== pool);
                if (pools.length > 0) patch({ persona: { pools } });
              }}
            />
          ))}
        </div>
      </Field>

      <Kicker>Starts as</Kicker>
      <Segmented
        tone="neutral"
        value={condition.kind}
        options={CONDITIONS}
        onChange={(kind) => patch({ condition: conditionFor(kind, condition) })}
      />
      {condition.kind === "scanning" && (
        <Field label="Scanned %">
          <Num
            value={Math.round(condition.done * 100)}
            onCommit={(pct) =>
              patch({
                condition: {
                  kind: "scanning",
                  done: Math.min(99, Math.max(0, pct)) / 100,
                },
              })
            }
          />
        </Field>
      )}
      {condition.kind === "unavailable" && (
        <Field label="Reason">
          <Text
            value={condition.reason}
            onCommit={(reason) =>
              patch({ condition: { kind: "unavailable", reason } })
            }
          />
        </Field>
      )}

      <Kicker
        trailing={
          <button
            type="button"
            className="lab-btn"
            title="Discard the history and generate it again from these knobs"
            onClick={() => {
              daemon.regenerate(id);
              after();
            }}
          >
            <IconRefresh size={13} /> Regenerate history
          </button>
        }
      >
        Persona
      </Kicker>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <Field label="Transactions">
          <Num
            value={persona.txCount}
            onCommit={(txCount) =>
              patch({ persona: { txCount: Math.max(0, Math.round(txCount)) } })
            }
          />
        </Field>
        <Field label="Received %">
          <Num
            value={Math.round(persona.receiveShare * 100)}
            onCommit={(pct) =>
              patch({
                persona: {
                  receiveShare: Math.min(100, Math.max(0, pct)) / 100,
                },
              })
            }
          />
        </Field>
        <Field label="Typical ZEC">
          <Num
            step="0.01"
            value={persona.typicalZat / 1e8}
            onCommit={(zec) =>
              patch({
                persona: { typicalZat: Math.max(1e4, Math.round(zec * 1e8)) },
              })
            }
          />
        </Field>
        <Field label="Memo %">
          <Num
            value={Math.round(persona.memoShare * 100)}
            onCommit={(pct) =>
              patch({
                persona: { memoShare: Math.min(100, Math.max(0, pct)) / 100 },
              })
            }
          />
        </Field>
        <Field label="Pending tail">
          <Switch
            checked={persona.pendingTail ?? false}
            onCheckedChange={(pendingTail) =>
              patch({ persona: { pendingTail } })
            }
          />
        </Field>
      </div>

      <EventsTable id={id} pools={persona.pools} />

      <HoldButton
        className="mt-1 h-8 text-xs"
        onConfirm={() => {
          daemon.deleteWallet(id);
          after();
        }}
      >
        Hold to delete this Wallet
      </HoldButton>
    </div>
  );
}

function EventsTable({ id, pools }: { id: string; pools: Pool[] }) {
  const events = useEvents(id);
  const ordered = [...events].sort((a, b) => b.secs - a.secs);
  const set = (next: TxEvent[]) => {
    daemon.setEvents(id, next);
    after();
  };
  const update = (ev: TxEvent, patch: Partial<TxEvent>) =>
    set(events.map((e) => (e === ev ? { ...e, ...patch } : e)));
  return (
    <>
      <Kicker
        trailing={
          <button
            type="button"
            className="lab-btn"
            onClick={() =>
              set([
                ...events,
                {
                  id: Math.random().toString(16).slice(2, 18),
                  kind: "received",
                  secs: Math.floor(Date.now() / 1000) - 600,
                  valueZat: 10_000_000,
                  pool: pools[0] ?? "orchard",
                },
              ])
            }
          >
            <IconPlus size={13} /> Add
          </button>
        }
      >
        History · {events.length}
      </Kicker>
      <p className="text-muted-foreground">
        Txids, inputs, change and fees derive from these rows, so the balance
        and the notes view stay in step. A spend above the balance is clamped.
      </p>
      <div className="max-h-72 overflow-auto rounded-lg border border-white/8">
        <table className="lab-table">
          <thead>
            <tr>
              <th className="w-36">When</th>
              <th className="w-20">Kind</th>
              <th className="w-18">ZEC</th>
              <th className="w-24">Pool</th>
              <th>Memo</th>
              <th className="w-14">Pending</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {ordered.map((ev) => (
              <tr key={ev.id} className="lab-row">
                <td>
                  <Text
                    type="datetime-local"
                    label="When"
                    value={toLocalInput(ev.secs)}
                    onCommit={(s) => {
                      const secs = fromLocalInput(s);
                      if (secs !== null) update(ev, { secs });
                    }}
                  />
                </td>
                <td>
                  <Pick
                    label="Kind"
                    value={ev.kind}
                    options={KINDS}
                    onChange={(kind) => update(ev, { kind })}
                  />
                </td>
                <td>
                  <Num
                    step="0.0001"
                    label="ZEC"
                    value={ev.valueZat / 1e8}
                    onCommit={(zec) =>
                      update(ev, {
                        valueZat: Math.max(1e4, Math.round(zec * 1e8)),
                      })
                    }
                  />
                </td>
                <td>
                  <Pick
                    label="Pool"
                    value={ev.pool}
                    options={POOLS}
                    onChange={(pool) => update(ev, { pool })}
                  />
                </td>
                <td>
                  <Text
                    label="Memo"
                    value={ev.memo ?? ""}
                    onCommit={(memo) =>
                      update(ev, { memo: memo === "" ? undefined : memo })
                    }
                  />
                </td>
                <td className="text-center">
                  <Switch
                    aria-label="Pending"
                    checked={ev.pending ?? false}
                    onCheckedChange={(pending) => update(ev, { pending })}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="lab-btn"
                    data-icon
                    data-tone="danger"
                    aria-label="Delete row"
                    onClick={() => set(events.filter((e) => e !== ev))}
                  >
                    <IconTrash size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function WalletRow({
  spec,
  selected,
  open,
  onToggle,
}: {
  spec: WalletSpec;
  selected: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const id = walletId(spec);
  return (
    <li className="lab-wallet" data-open={open}>
      <button
        type="button"
        className="lab-wallet-head"
        aria-expanded={open}
        onClick={onToggle}
      >
        <LifeHashIcon
          fingerprint={id}
          className="size-6 shrink-0 rounded-full"
        />
        <span className="min-w-0 flex-1 truncate">
          <span className="font-medium">{spec.label ?? id.slice(0, 8)}</span>
          <span className="lab-mono ml-2">{id.slice(0, 8)}</span>
        </span>
        {selected && <span className="text-muted-foreground">selected</span>}
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="lab-dot" data-kind={spec.condition.kind} />
          {spec.condition.kind}
          <span className="opacity-60">· {spec.persona.network}</span>
        </span>
        <IconChevronRight size={14} className="lab-chevron" />
      </button>
      {open && (
        <div className="lab-wallet-body">
          <div>
            <WalletEditor spec={spec} />
          </div>
        </div>
      )}
    </li>
  );
}

function WalletsSection() {
  const scenario = useScenario();
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <section className="lab-section space-y-2">
      <Kicker
        trailing={
          <button
            type="button"
            className="lab-btn"
            onClick={() => {
              setOpenId(daemon.addWallet());
              after();
            }}
          >
            <IconPlus size={13} /> Add wallet
          </button>
        }
      >
        Wallets · {scenario.wallets.length}
      </Kicker>
      <ul className="space-y-1.5">
        {scenario.wallets.map((spec) => {
          const id = walletId(spec);
          return (
            <WalletRow
              key={id}
              spec={spec}
              selected={scenario.selected === id}
              open={openId === id}
              onToggle={() => setOpenId(openId === id ? null : id)}
            />
          );
        })}
      </ul>
    </section>
  );
}

function Transfer() {
  const [pasting, setPasting] = useState(false);
  const [draft, setDraft] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const copy = () =>
    void navigator.clipboard.writeText(
      JSON.stringify(daemon.scenario(), null, 2),
    );
  const apply = () => {
    try {
      const parsed: unknown = JSON.parse(draft);
      if (!isScenario(parsed)) throw new Error("not a faker scenario");
      daemon.replace(parsed);
      after();
      setPasting(false);
      setDraft("");
      setProblem(null);
    } catch (e) {
      setProblem(String(e));
    }
  };
  return (
    <>
      <button
        type="button"
        className="lab-btn"
        data-icon
        onClick={copy}
        aria-label="Copy scenario as JSON"
        title="Copy scenario as JSON"
      >
        <IconCopy size={13} />
      </button>
      <button
        type="button"
        className="lab-btn"
        data-icon
        aria-expanded={pasting}
        onClick={() => setPasting((v) => !v)}
        aria-label="Paste a scenario"
        title="Paste a scenario"
      >
        <IconClipboard size={13} />
      </button>
      {pasting && (
        <div className="lab-scrim space-y-1.5">
          <textarea
            className="lab-input lab-textarea"
            aria-label="Scenario JSON"
            placeholder="Paste a scenario JSON"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          {problem && <p className="text-destructive">{problem}</p>}
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              className="lab-btn"
              onClick={() => setPasting(false)}
            >
              Cancel
            </button>
            <button type="button" className="lab-btn" onClick={apply}>
              Apply
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function FakerBubble() {
  const [state, setState] = useState<"closed" | "open" | "closing">("closed");
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = () => {
    setState("closing");
    closeTimer.current = setTimeout(() => setState("closed"), CLOSE_MS);
  };
  const toggle = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (state === "open") close();
    else setState("open");
  };

  useEffect(() => {
    if (state !== "open") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  return (
    <div className={reduceMotion() ? "lab lab-reduce" : "lab"}>
      <button
        type="button"
        className="lab-trigger"
        aria-label="Lab"
        aria-expanded={state === "open"}
        title="Lab: edit the fake daemon"
        onClick={toggle}
      >
        <IconFlask size={20} />
      </button>
      {state !== "closed" && (
        <dialog open aria-label="Lab" className="lab-panel" data-state={state}>
          <div className="lab-head">
            <IconFlask size={15} className="text-amber-400" />
            <span className="lab-title">Lab</span>
            <span className="text-muted-foreground">
              edits apply at once and persist across reloads
            </span>
            <span className="ml-auto" />
            <Transfer />
            <button
              type="button"
              className="lab-btn"
              title="Back to the seeded scenario"
              onClick={() => {
                daemon.reset();
                after();
              }}
            >
              <IconRefresh size={13} /> Reset
            </button>
            <button
              type="button"
              className="lab-btn"
              data-icon
              aria-label="Close"
              onClick={close}
            >
              <IconX size={13} />
            </button>
          </div>
          <div className="lab-body">
            <AppSection />
            <WalletsSection />
          </div>
        </dialog>
      )}
    </div>
  );
}
