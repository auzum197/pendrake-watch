import {
  createEffect,
  createSignal,
  For,
  on,
  onCleanup,
  onMount,
  Show,
  type Accessor,
} from "solid-js";
import "@/components/app/reveal.css";
import {
  ACTIVITY,
  clockLabel,
  FINGERPRINTS,
  HISTORY,
  POOL_NAME,
  randomTx,
  type Point,
  type Tx,
} from "./content";
import { DitherChart } from "./dither-chart";
import { Icon } from "./icons";
import { countTo, gsap, riseIn, rowIn } from "./motion";
import { every, LifeHashIcon, reducedMotion } from "./shared";
import "./app-frame.css";
import "./fragments.css";

export type Arrival = { id: number; tx: Tx; wallet: string; index: number };
export type Row = Tx & { wallet: number; id: number; fresh: boolean };

const NAMES = [
  { name: "Cold storage", fp: FINGERPRINTS[0] },
  { name: "Savings", fp: FINGERPRINTS[1] },
  { name: "Grants", fp: FINGERPRINTS[2] },
];
const FACTORS = [1, 0.42, 0.18];

export type WalletSim = {
  name: string;
  fp: string;
  balance: Accessor<number>;
  points: Accessor<Point[]>;
  apply: (tx: Tx) => void;
};

export function useWalletSim(
  count = 3,
  ms = 5000,
  after = 1500,
  inbound = false,
) {
  const wallets: WalletSim[] = NAMES.slice(0, count).map((w, i) => {
    const history = HISTORY.map((p) => ({
      ...p,
      value: +(p.value * FACTORS[i]).toFixed(4),
    }));
    const [points, setPoints] = createSignal(history);
    const [balance, setBalance] = createSignal(
      history[history.length - 1].value,
    );
    return {
      ...w,
      points,
      balance,
      apply(tx) {
        const delta = Number(tx.amount) * (tx.dir === "Sent" ? -1 : 1);
        const next = +(balance() + delta).toFixed(4);
        setPoints((list) => {
          const last = list[list.length - 1];
          const step = (last.t - list[0].t) / (list.length - 1);
          const t = last.t + step;
          const label = clockLabel(t);
          return [...list.slice(1), { t, value: next, label }];
        });
        countTo(balance(), next, setBalance);
      },
    };
  });

  const [rows, setRows] = createSignal<Row[]>(
    ACTIVITY.map((t, i) => ({
      ...t,
      wallet: i % count,
      id: -i - 1,
      fresh: false,
    })),
  );
  const [latest, setLatest] = createSignal<Arrival | null>(null);
  const pending = new Map<number, () => void>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let n = 0;
  onCleanup(() => timers.forEach(clearTimeout));

  const land = (id: number) => {
    const fn = pending.get(id);
    if (!fn) return;
    pending.delete(id);
    fn();
  };

  let block = ACTIVITY[0].block;
  every(
    ms,
    () => {
      const wi = (n * 2) % count;
      const tx = randomTx(block, wallets[wi].balance(), inbound);
      block = tx.block;
      const id = n;
      n += 1;
      pending.set(id, () => {
        wallets[wi].apply(tx);
        setRows((list) =>
          [{ ...tx, wallet: wi, id, fresh: true }, ...list].slice(0, 9),
        );
      });
      setLatest({ id, tx, wallet: wallets[wi].name, index: wi });
      if (reducedMotion()) land(id);
      else timers.add(setTimeout(() => land(id), 3500));
    },
    after,
  );

  return { wallets, rows, latest, land };
}

export function TxRow(props: {
  tx: Row;
  wallets?: WalletSim[];
  ref?: (el: HTMLDivElement) => void;
}) {
  const received = () => props.tx.dir === "Received";
  return (
    <div class="frame-tx-row" ref={props.ref}>
      <Icon
        name={received() ? "received" : "sent"}
        class="size-4 text-muted-foreground"
        label={props.tx.dir}
      />
      <Show when={props.wallets}>
        {(wallets) => (
          <LifeHashIcon
            fingerprint={wallets()[props.tx.wallet].fp}
            size={20}
            class="rounded-full"
          />
        )}
      </Show>
      <span class={`frame-tx-amount ${received() ? "is-received" : ""}`}>
        {received() ? "+" : "−"}
        {props.tx.amount}
        <Icon name="zec" class="frame-tx-zec" />
      </span>
      <span class="text-muted-foreground">{props.tx.txid}</span>
      <span class="frame-tx-pool" data-pool={props.tx.pool}>
        {POOL_NAME[props.tx.pool]}
      </span>
      <span class="text-muted-foreground font-sans">{props.tx.date}</span>
      <span class="text-muted-foreground">
        {props.tx.block.toLocaleString("en-US")}
      </span>
    </div>
  );
}

export function Ledger(props: {
  rows: Accessor<Row[]>;
  wallets?: WalletSim[];
  class?: string;
  limit?: number;
  header?: boolean;
  plain?: boolean;
}) {
  let host!: HTMLDivElement;
  let list!: HTMLDivElement;
  const limit = () => props.limit ?? 5;
  const shown = () => props.rows().slice(0, limit() + 1);
  const els = new Map<number, HTMLDivElement>();
  const tops = new Map<number, number>();
  const flip = () => {
    for (const [id, el] of els) {
      if (!el.isConnected) {
        els.delete(id);
        tops.delete(id);
        continue;
      }
      const top = el.getBoundingClientRect().top;
      const prev = tops.get(id);
      tops.set(id, top);
      if (prev === undefined) {
        if (!reducedMotion() && props.rows().find((r) => r.id === id)?.fresh)
          rowIn(el);
      } else if (prev !== top && !reducedMotion()) {
        gsap.fromTo(
          el,
          { y: prev - top },
          { y: 0, duration: 0.55, ease: "power3.out", overwrite: "auto" },
        );
      }
    }
  };
  onMount(() => {
    riseIn([...host.querySelectorAll(".frame-tx-row")], 0.3);
    for (const [id, el] of els) tops.set(id, el.getBoundingClientRect().top);
  });
  createEffect(on(shown, () => queueMicrotask(flip), { defer: true }));
  return (
    <div
      ref={host}
      class={`${props.plain ? "" : "ledger"} frame-tx ${props.class ?? ""}`}
      data-wallets={!!props.wallets}
      aria-hidden
    >
      <div class="frame-tx-head" hidden={props.header === false}>
        <span />
        <Show when={props.wallets}>
          <span />
        </Show>
        <span>Amount</span>
        <span>Txid</span>
        <span>Pools</span>
        <span>Date</span>
        <span>Block</span>
      </div>
      <div ref={list} class="ledger-rows" style={{ "--rows": limit() }}>
        <For each={shown()}>
          {(tx) => (
            <TxRow
              tx={tx}
              wallets={props.wallets}
              ref={(el) => els.set(tx.id, el)}
            />
          )}
        </For>
      </div>
    </div>
  );
}

export function Segmented(props: {
  options: string[];
  value: string;
  onChange?: (v: string) => void;
}) {
  const active = () => Math.max(0, props.options.indexOf(props.value));
  return (
    <div
      class="frame-seg"
      style={{
        "grid-template-columns": `repeat(${props.options.length}, 1fr)`,
      }}
    >
      <span
        aria-hidden
        class="frame-seg-fill"
        style={{
          width: `calc((100% - 0.5rem) / ${props.options.length})`,
          transform: `translateX(${active() * 100}%)`,
        }}
      />
      <For each={props.options}>
        {(o) => (
          <button
            type="button"
            aria-pressed={o === props.value}
            onClick={() => props.onChange?.(o)}
            class="frame-seg-btn"
            data-active={o === props.value}
          >
            {o}
          </button>
        )}
      </For>
    </div>
  );
}

const fmtZec = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });

export function Dashboard(props: {
  wallet: WalletSim;
  rows: Accessor<Row[]>;
  limit?: number;
  number?: (el: HTMLElement) => void;
}) {
  const [range, setRange] = createSignal("1D");
  const [denom, setDenom] = createSignal("ZEC");
  return (
    <>
      <section class="frame-card">
        <div class="flex items-start justify-between gap-4">
          <div class="flex flex-col gap-3">
            <div class="flex items-center gap-3">
              <span class="text-base font-medium text-muted-foreground">
                Total Balance
              </span>
              <Icon name="eye" class="size-3.5 text-white/45" />
              <span class="frame-pill">
                <Icon name="check" class="size-3.5 text-brand" />
                Synced
              </span>
            </div>
            <span class="frame-amount" ref={(el) => props.number?.(el)}>
              {fmtZec(props.wallet.balance())}{" "}
              <span class="frame-amount-unit">ZEC</span>
            </span>
            <div class="h-4" />
          </div>
          <div class="flex shrink-0 flex-col items-end gap-3">
            <div class="w-44">
              <Segmented
                options={["ZEC", "USD"]}
                value={denom()}
                onChange={setDenom}
              />
            </div>
            <button type="button" class="frame-pools-btn">
              Pools
            </button>
          </div>
        </div>
        <hr class="my-6 border-border" />
        <div class="flex items-center justify-between gap-4">
          <div class="flex flex-col gap-0.5">
            <h2 class="font-heading text-base font-semibold">
              Balance over time
            </h2>
            <span class="text-xs font-medium text-brand">
              At your all-time high
            </span>
          </div>
          <div class="flex w-108 max-w-3/5 shrink-0 items-center gap-3">
            <button type="button" class="frame-stack-btn" aria-pressed="false">
              <Icon name="stack" class="size-4" />
            </button>
            <div class="min-w-0 flex-1">
              <Segmented
                options={["All", "1Y", "1M", "1W", "1D"]}
                value={range()}
                onChange={setRange}
              />
            </div>
          </div>
        </div>
        <DitherChart
          points={props.wallet.points()}
          class="mt-4 aspect-900/240 w-full"
        />
      </section>
      <section class="frame-card">
        <h2 class="font-heading text-base font-semibold">Recent Activity</h2>
        <Ledger rows={props.rows} limit={props.limit ?? 4} plain class="mt-4" />
      </section>
    </>
  );
}
