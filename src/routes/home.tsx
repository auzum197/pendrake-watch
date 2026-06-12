import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_INDEXER,
  forgetWallet,
  getAddresses,
  getBalance,
  getSyncStatus,
  getTransactions,
  getWalletState,
  importUfvk,
  onSyncEvent,
  type Balance,
  type BatchProgress,
  type BatchSummary,
  type Network,
  type SyncStatus,
  type Tx,
  type WalletAddress,
  type WalletState,
} from "@/lib/ipc";

type Ref<T> = { current: T };

export function HomePage() {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [addresses, setAddresses] = useState<WalletAddress[]>([]);

  useEffect(() => {
    getWalletState()
      .then(async (state) => {
        setWallet(state);
        if (state.exists) setAddresses(await getAddresses());
      })
      .catch(() => setWallet(null));
  }, []);

  if (wallet?.exists) {
    return (
      <WalletView
        wallet={wallet}
        addresses={addresses}
        onForget={async () => {
          await forgetWallet();
          setAddresses([]);
          setWallet(await getWalletState());
        }}
      />
    );
  }

  return (
    <ImportForm
      onImported={async (state) => {
        setWallet(state);
        setAddresses(await getAddresses());
      }}
    />
  );
}

function ImportForm({
  onImported,
}: {
  onImported: (state: WalletState) => Promise<void>;
}) {
  const [ufvk, setUfvk] = useState("");
  const [birthday, setBirthday] = useState("");
  const [network, setNetwork] = useState<Network>("mainnet");
  const [indexer, setIndexer] = useState(DEFAULT_INDEXER);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const state = await importUfvk({
        ufvk: ufvk.trim(),
        birthday: Number(birthday) || 0,
        indexerUri: indexer.trim() || DEFAULT_INDEXER,
        network,
      });
      await onImported(state);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pt-[6vh]">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Import a viewing key
        </h1>
        <p className="text-sm text-muted-foreground">
          Paste a Unified Full Viewing Key. The background process creates the
          watch-only wallet file. No spending keys are stored.
        </p>
      </header>

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="Unified Full Viewing Key">
          <textarea
            className="min-h-28 w-full resize-y rounded-md border border-input bg-transparent px-2.5 py-2 font-mono text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            placeholder="uview1…"
            value={ufvk}
            onChange={(e) => setUfvk(e.currentTarget.value)}
            spellCheck={false}
            autoComplete="off"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Birthday height">
            <Input
              inputMode="numeric"
              placeholder="e.g. 3364280"
              value={birthday}
              onChange={(e) =>
                setBirthday(e.currentTarget.value.replace(/[^0-9]/g, ""))
              }
            />
          </Field>
          <Field label="Network">
            <select
              className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              value={network}
              onChange={(e) => setNetwork(e.currentTarget.value as Network)}
            >
              <option value="mainnet">Mainnet</option>
              <option value="testnet">Testnet</option>
            </select>
          </Field>
        </div>

        <Field label="Indexer (lightwalletd)">
          <Input
            value={indexer}
            onChange={(e) => setIndexer(e.currentTarget.value)}
            spellCheck={false}
            autoComplete="off"
          />
        </Field>

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" disabled={busy || ufvk.trim().length === 0}>
          {busy ? "Creating wallet…" : "Import"}
        </Button>
      </form>
    </div>
  );
}

function WalletView({
  wallet,
  addresses,
  onForget,
}: {
  wallet: WalletState;
  addresses: WalletAddress[];
  onForget: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [sync, setSync] = useState<SyncStatus | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [batches, setBatches] = useState<BatchProgress[]>([]);
  const [doneLog, setDoneLog] = useState<BatchSummary[]>([]);
  const [pollError, setPollError] = useState<string | null>(null);
  const syncing = sync?.state === "syncing";
  const now = useNow(syncing);
  // Anchors the overall bar so it can be projected forward smoothly between the
  // discrete jumps that arrive when a batch commits.
  const anchor = useRef<ProgressAnchor>({ frac: 0, etaSeconds: null, atMs: 0 });
  const shownFrac = useRef(0);
  const primary = addresses[0];

  useEffect(() => {
    let active = true;

    async function refetch() {
      const [bal, history] = await Promise.all([
        getBalance().catch(() => null),
        getTransactions().catch(() => null),
      ]);
      if (!active) return;
      if (bal) setBalance(bal);
      if (history) setTxs(history);
    }

    async function poll() {
      try {
        const status = await getSyncStatus();
        if (!active) return;
        setSync(status);
        setPollError(null);
        await refetch();
      } catch (e) {
        if (active) setPollError(String(e));
      }
    }

    poll();

    const unlisten = onSyncEvent((ev) => {
      if (!active) return;
      setPollError(null);
      switch (ev.event) {
        case "progress":
          setSync(ev.status);
          setBatches(ev.batches ?? []);
          reanchor(anchor, shownFrac, ev.status);
          break;
        case "batchDone":
          // Keep just the last couple of finished batches, not a growing log.
          setDoneLog((log) => [ev.batch, ...log].slice(0, 2));
          break;
        case "finished":
          setSync(ev.status);
          setBatches([]);
          anchor.current = { frac: 1, etaSeconds: null, atMs: Date.now() };
          refetch();
          break;
        case "transaction":
          refetch();
          break;
        case "error":
          setSync((prev) =>
            prev ? { ...prev, state: "error", error: ev.message } : prev,
          );
          break;
      }
    });

    // Safety net: if the push stream drops, a slow poll still heals the view.
    const timer = setInterval(poll, 20000);

    return () => {
      active = false;
      clearInterval(timer);
      unlisten.then((fn) => fn()).catch(() => {});
    };
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pt-[6vh]">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Your wallet
        </h1>
        <p className="text-sm text-muted-foreground">
          The wallet file is owned by the background process, which keeps syncing
          and posting notifications while this window is closed.
        </p>
      </header>

      <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-4 py-3">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">Total balance</span>
          <span className="font-heading text-2xl font-semibold tabular-nums">
            {balance ? formatZec(totalConfirmed(balance)) : "…"} ZEC
          </span>
        </div>
        <SyncBadge sync={sync} />
      </div>

      {pollError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Can't reach the background process: {pollError}
        </p>
      )}

      {syncing && (
        <div className="flex flex-col gap-3">
          <SyncProgress sync={sync} frac={overallFrac(anchor, shownFrac, now)} />
          {(batches.length > 0 || doneLog.length > 0) && (
            <div className="ml-1.5 flex flex-col gap-3 border-l-2 border-border pl-3">
              <BatchList batches={batches} now={now} />
              <RecentBatches log={doneLog} />
            </div>
          )}
        </div>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Transactions</h2>
        {txs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {sync?.state === "idle"
              ? "No transactions for this viewing key."
              : "None yet."}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
            {txs.map((tx) => (
              <TxRow key={tx.txid} tx={tx} />
            ))}
          </ul>
        )}
      </section>

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Network</dt>
        <dd className="capitalize">{wallet.network}</dd>
        <dt className="text-muted-foreground">Import type</dt>
        <dd className="uppercase">{wallet.importType}</dd>
        <dt className="text-muted-foreground">Birthday</dt>
        <dd>{wallet.birthdayHeight}</dd>
        <dt className="text-muted-foreground">Synced height</dt>
        <dd className="tabular-nums">
          {sync?.syncedHeight ? sync.syncedHeight.toLocaleString() : "—"}
          {sync?.chainTip ? ` / ${sync.chainTip.toLocaleString()}` : ""}
        </dd>
      </dl>

      {primary && (
        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">Unified address</span>
          <code className="break-all rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs">
            {primary.ua}
          </code>
          {primary.transparent && (
            <code className="break-all rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs">
              {primary.transparent}
            </code>
          )}
        </div>
      )}

      <Button
        variant="destructive"
        className="self-start"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await onForget();
          setBusy(false);
        }}
      >
        Forget wallet
      </Button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

const SYNC_LABELS: Record<SyncStatus["state"], string> = {
  idle: "Synced",
  syncing: "Syncing…",
  error: "Sync error",
};

function SyncProgress({ sync, frac }: { sync: SyncStatus; frac: number }) {
  const phase = sync.phase === "committing" ? "Committing" : "Scanning";
  const pct = Math.min(100, Math.max(0, Math.floor(frac * 100)));
  const counts =
    sync.totalOutputs && sync.totalOutputs > 0
      ? `${(sync.scannedOutputs ?? 0).toLocaleString()}/${sync.totalOutputs.toLocaleString()} notes`
      : null;
  const eta = sync.etaSeconds ? shortDuration(sync.etaSeconds) : null;
  return (
    <div className="flex flex-col gap-1.5">
      <Bar frac={frac} />
      <p className="text-xs text-muted-foreground tabular-nums">
        {phase} notes since the wallet birthday ({pct}%
        {counts ? `, ${counts}` : ""}
        {eta ? `, ~${eta} left` : ""}). The first sync can take a few minutes.
      </p>
    </div>
  );
}

type Tracked<T> = { key: string; item: T; leaving: boolean };

/// Tracks a keyed list across renders, keeping just-removed items mounted (marked
/// `leaving`) for `durationMs` so they can animate out. New items keep their place
/// in the incoming order; departing ones hold their old position. Lets the lists
/// grow and shrink with animation instead of snapping, which is what removes the
/// layout jumps.
function useTransitionList<T>(
  items: T[],
  getKey: (item: T) => string,
  durationMs = 300,
): Tracked<T>[] {
  const [tracked, setTracked] = useState<Tracked<T>[]>(() =>
    items.map((item) => ({ key: getKey(item), item, leaving: false })),
  );
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const live = new Map(items.map((item) => [getKey(item), item]));
    setTracked((prev) => {
      const prevIndex = new Map(prev.map((entry, i) => [entry.key, i]));
      const present = items.map((item) => ({
        key: getKey(item),
        item,
        leaving: false,
      }));
      // Re-insert departing items near where they used to sit, so they collapse
      // in place rather than jumping to the end of the list.
      const result = [...present];
      for (const entry of prev) {
        if (!live.has(entry.key)) {
          const at = Math.min(prevIndex.get(entry.key) ?? result.length, result.length);
          result.splice(at, 0, { ...entry, leaving: true });
        }
      }
      return result;
    });
  }, [items, getKey]);

  useEffect(() => {
    for (const entry of tracked) {
      if (entry.leaving && !timers.current.has(entry.key)) {
        const id = setTimeout(() => {
          timers.current.delete(entry.key);
          setTracked((prev) => prev.filter((e) => e.key !== entry.key));
        }, durationMs);
        timers.current.set(entry.key, id);
      }
    }
  }, [tracked, durationMs]);

  return tracked;
}

/// Animates its child's height (and opacity) open on mount and closed when
/// `leaving`, via the grid `0fr→1fr` rows trick. Spacing lives inside the child so
/// it collapses too, leaving no residual gap.
function Collapse({
  leaving,
  children,
}: {
  leaving: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const shown = open && !leaving;
  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${shown ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

const batchKey = (batch: BatchProgress) => batch.id;
const summaryKey = (batch: BatchSummary) =>
  `${batch.id}:${batch.timing.totalSecs}`;

function BatchList({
  batches,
  now,
}: {
  batches: BatchProgress[];
  now: number;
}) {
  const ordered = useMemo(
    () => [...batches].sort((a, b) => a.start - b.start),
    [batches],
  );
  const entries = useTransitionList(ordered, batchKey);
  return (
    <div className="flex flex-col">
      {entries.map((entry) => (
        <Collapse key={entry.key} leaving={entry.leaving}>
          <div className="pb-2">
            <BatchRow batch={entry.item} now={now} />
          </div>
        </Collapse>
      ))}
    </div>
  );
}

function BatchRow({ batch, now }: { batch: BatchProgress; now: number }) {
  const elapsed = Math.max(0, (now - batch.phaseStartedAtMs) / 1000);
  const waiting = batch.phase === "waiting";
  const label =
    batch.phase === "scanning"
      ? "scanning"
      : batch.phase === "committing"
        ? "committing"
        : "queued to commit";

  let frac = 0;
  let estimate: string;
  if (waiting) {
    estimate = shortDuration(elapsed);
  } else if (batch.expectedSecs && batch.expectedSecs > 0) {
    if (elapsed >= batch.expectedSecs) {
      frac = 1;
      estimate = "finishing";
    } else {
      frac = elapsed / batch.expectedSecs;
      estimate = `~${Math.round(frac * 100)}% (~${shortDuration(batch.expectedSecs - elapsed)} left)`;
    }
  } else {
    estimate = `${batch.outputs.toLocaleString()} notes`;
  }

  return (
    <div className="flex flex-col gap-1 font-mono text-xs tabular-nums">
      <div className="flex items-center justify-between gap-2 whitespace-nowrap">
        <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
          {batch.start.toLocaleString()}–{batch.end.toLocaleString()}
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
            {batch.priority}
          </span>
        </span>
        <span className="truncate text-right text-muted-foreground">
          {label} · {estimate}
        </span>
      </div>
      {/* A waiting batch is done scanning, so it stays full but recolours and
          pulses to read as "parked, not progressing". */}
      <Bar frac={waiting ? 1 : frac} tone={batch.phase} pulse={waiting} />
    </div>
  );
}

function RecentBatches({ log }: { log: BatchSummary[] }) {
  const entries = useTransitionList(log, summaryKey);
  if (entries.length === 0) return null;
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="text-sm font-medium">Recent batches</h2>
      <div className="flex flex-col">
        {entries.map((entry) => (
          <Collapse key={entry.key} leaving={entry.leaving}>
            <div className="pb-1.5">
              <RecentBatchRow batch={entry.item} />
            </div>
          </Collapse>
        ))}
      </div>
    </section>
  );
}

function RecentBatchRow({ batch }: { batch: BatchSummary }) {
  const t = batch.timing;
  const c = t.commit;
  const blocks = batch.end - batch.start;
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border bg-muted/20 px-3 py-2 font-mono text-[11px] leading-relaxed tabular-nums">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="text-green-600 dark:text-green-400">✓</span>
          {batch.start.toLocaleString()}–{batch.end.toLocaleString()}
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {batch.priority}
          </span>
        </span>
        <span className="text-muted-foreground">
          {blocks.toLocaleString()} blk · {batch.outputs.toLocaleString()} out ·{" "}
          {shortDuration(t.totalSecs)}
        </span>
      </div>
      <div className="text-muted-foreground">
        scan {shortDuration(t.fetchSecs)}/{shortDuration(t.decryptionSecs)}/
        {shortDuration(t.treeSecs)} · wait {shortDuration(t.waitSecs)} · commit{" "}
        {shortDuration(t.commitSecs)}
      </div>
      <div className="text-muted-foreground">
        commit: ckpt {shortDuration(c.checkpoints)} · front{" "}
        {shortDuration(c.frontiers)} · insert {shortDuration(c.insertTree)} ·
        spend_fetch {shortDuration(c.spendFetch)} · spend_cpu{" "}
        {shortDuration(c.spendCpu)} · cleanup {shortDuration(c.cleanup)} · other{" "}
        {shortDuration(c.other)}
      </div>
    </div>
  );
}

type BarTone = "scanning" | "committing" | "waiting";

const BAR_COLOR: Record<BarTone, string> = {
  scanning: "bg-primary",
  committing: "bg-violet-500",
  waiting: "bg-amber-500",
};

function Bar({
  frac,
  tone = "scanning",
  pulse = false,
}: {
  frac: number;
  tone?: BarTone;
  pulse?: boolean;
}) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full rounded-full ${BAR_COLOR[tone]} transition-[width] duration-200 ${pulse ? "animate-pulse" : ""}`}
        style={{ width: `${Math.min(100, Math.max(2, frac * 100))}%` }}
      />
    </div>
  );
}

type ProgressAnchor = {
  frac: number;
  etaSeconds: number | null;
  atMs: number;
};

/// Re-anchor the overall bar on each push. A fresh round (resume or reorg) starts
/// lower, so the shown value is allowed to fall back to it.
function reanchor(
  anchor: Ref<ProgressAnchor>,
  shown: Ref<number>,
  status: SyncStatus,
) {
  const total = status.totalOutputs ?? 0;
  const frac =
    total > 0 ? (status.scannedOutputs ?? 0) / total : status.percent / 100;
  // A fresh round (resume or reorg) starts lower; let the bar fall back to it.
  if (frac + 0.02 < shown.current) shown.current = frac;
  // Only move the time anchor when real progress advanced. Between commits the
  // daemon re-pushes the same fraction every ~120ms; holding the anchor lets the
  // projection keep gliding instead of resetting its elapsed clock each push.
  if (frac > anchor.current.frac || anchor.current.atMs === 0) {
    anchor.current = { frac, etaSeconds: status.etaSeconds ?? null, atMs: Date.now() };
  } else {
    anchor.current.etaSeconds = status.etaSeconds ?? anchor.current.etaSeconds;
  }
}

/// Project the anchored fraction forward by elapsed time at the ETA rate, so the
/// bar glides continuously between the discrete jumps a commit produces. Monotonic
/// within a round: a late real value just behind the estimate never steps it back.
function overallFrac(
  anchor: Ref<ProgressAnchor>,
  shown: Ref<number>,
  now: number,
): number {
  const { frac, etaSeconds, atMs } = anchor.current;
  let target = frac;
  if (frac < 1 && etaSeconds && etaSeconds > 0 && atMs > 0) {
    const elapsed = (now - atMs) / 1000;
    // Approach the next checkpoint but hold just short until it really lands.
    target = frac + (1 - frac) * Math.min(0.98, elapsed / etaSeconds);
  }
  shown.current = Math.max(shown.current, target);
  return Math.min(1, shown.current);
}

/// Ticks `Date.now()` several times a second while `active`, to drive the
/// continuous animation of the overall and per-batch bars between pushes.
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

function shortDuration(seconds: number): string {
  if (seconds >= 3600) {
    return `${Math.floor(seconds / 3600)}h${Math.floor((seconds % 3600) / 60)}m`;
  }
  if (seconds >= 60) {
    const s = Math.round(seconds);
    return `${Math.floor(s / 60)}m${s % 60}s`;
  }
  if (seconds >= 1) {
    return `${seconds.toFixed(1)}s`;
  }
  return `${Math.max(0, Math.round(seconds * 1000))}ms`;
}

function SyncBadge({ sync }: { sync: SyncStatus | null }) {
  const state = sync?.state ?? "syncing";
  const tone =
    state === "idle"
      ? "border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400"
      : state === "error"
        ? "border-destructive/40 bg-destructive/10 text-destructive"
        : "border-border bg-muted text-muted-foreground";
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}
      title={sync?.error ?? undefined}
    >
      {SYNC_LABELS[state]}
    </span>
  );
}

function TxRow({ tx }: { tx: Tx }) {
  const received = tx.kind === "received";
  return (
    <li className="flex items-center justify-between gap-4 px-3 py-2 text-sm">
      <div className="flex flex-col">
        <span className="font-medium">
          {received ? "Received" : "Sent"}
          {tx.status === "pending" && (
            <span className="ml-2 text-xs text-muted-foreground">pending</span>
          )}
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {tx.txid.slice(0, 16)}…
        </span>
      </div>
      <span
        className={`tabular-nums ${received ? "text-green-600 dark:text-green-400" : ""}`}
      >
        {received ? "+" : "−"}
        {formatZec(BigInt(tx.valueZat))} ZEC
      </span>
    </li>
  );
}

function totalConfirmed(balance: Balance): bigint {
  return [balance.orchard, balance.sapling, balance.transparent].reduce(
    (sum, pool) => sum + BigInt(pool?.confirmed ?? "0"),
    0n,
  );
}

function formatZec(zatoshis: bigint): string {
  const zec = Number(zatoshis) / 1e8;
  return zec.toLocaleString(undefined, { maximumFractionDigits: 8 });
}
