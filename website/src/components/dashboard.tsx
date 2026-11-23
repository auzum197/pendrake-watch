import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import "@/components/app/reveal.css";
import {
  ACTIVITY,
  clockLabel,
  HISTORY,
  POOL_NAME,
  randomTx,
  WALLET,
  type Point,
  type Tx,
} from "../lib/content";
import { countTo, gsap, reducedMotion, rowIn } from "../lib/motion";
import { DitherChart } from "./dither-chart";
import { Icon } from "./icons";
import "../styles/app-frame.css";
import "../styles/fragments.css";

export type Row = Tx & { id: number; fresh: boolean };
export type Wallet = {
  name: string;
  fingerprint: string;
  balance: number;
  points: Point[];
  rows: Row[];
};

const PERIOD = 11_000;
const FIRST = 6700;
const KEPT = 9;

export function useWallet(): Wallet {
  const [points, setPoints] = useState(HISTORY);
  const [balance, setBalance] = useState(HISTORY[HISTORY.length - 1].value);
  const [rows, setRows] = useState<Row[]>(() =>
    ACTIVITY.map((tx, i) => ({ ...tx, id: -i - 1, fresh: false })),
  );

  useEffect(() => {
    let value = HISTORY[HISTORY.length - 1].value;
    let block = ACTIVITY[0].block;
    let next = 0;

    const receive = () => {
      const tx = randomTx(block, value, true);
      const from = value;
      const id = next;
      block = tx.block;
      value = +(value + Number(tx.amount)).toFixed(4);
      next += 1;
      const to = value;
      setPoints((list) => {
        const last = list[list.length - 1];
        const t = last.t + (last.t - list[0].t) / (list.length - 1);
        return [...list.slice(1), { t, value: to, label: clockLabel(t) }];
      });
      setRows((list) => [{ ...tx, id, fresh: true }, ...list].slice(0, KEPT));
      countTo(from, to, setBalance);
    };

    let timer = setTimeout(function tick() {
      receive();
      timer = setTimeout(tick, PERIOD);
    }, FIRST);
    return () => clearTimeout(timer);
  }, []);

  return { ...WALLET, balance, points, rows };
}

export function TxRow({
  tx,
  ref,
}: {
  tx: Row;
  ref?: (el: HTMLDivElement | null) => void;
}) {
  const received = tx.dir === "Received";
  return (
    <div className="frame-tx-row" ref={ref}>
      <Icon
        name={received ? "received" : "sent"}
        className="size-4 text-muted-foreground"
        label={tx.dir}
      />
      <span className={`frame-tx-amount ${received ? "is-received" : ""}`}>
        {received ? "+" : "−"}
        {tx.amount}
        <Icon name="zec" className="frame-tx-zec" />
      </span>
      <span className="text-muted-foreground">{tx.txid}</span>
      <span className="frame-tx-pool" data-pool={tx.pool}>
        {POOL_NAME[tx.pool]}
      </span>
      <span className="text-muted-foreground font-sans">{tx.date}</span>
      <span className="text-muted-foreground">
        {tx.block.toLocaleString("en-US")}
      </span>
    </div>
  );
}

export function Ledger({ rows, limit }: { rows: Row[]; limit: number }) {
  const shown = rows.slice(0, limit + 1);
  const order = shown.map((tx) => tx.id).join();
  const els = useRef(new Map<number, HTMLDivElement>());
  const tops = useRef(new Map<number, number>());

  useLayoutEffect(() => {
    const still = reducedMotion();
    for (const id of tops.current.keys()) {
      if (!els.current.has(id)) tops.current.delete(id);
    }
    for (const [id, el] of els.current) {
      const top = el.getBoundingClientRect().top;
      const prev = tops.current.get(id);
      tops.current.set(id, top);
      if (still) continue;
      if (prev === undefined) {
        if (id >= 0) rowIn(el);
      } else if (prev !== top) {
        gsap.fromTo(
          el,
          { y: prev - top },
          { y: 0, duration: 0.55, ease: "power3.out", overwrite: "auto" },
        );
      }
    }
  }, [order]);

  return (
    <div className="frame-tx mt-4" aria-hidden>
      <div className="frame-tx-head">
        <span />
        <span>Amount</span>
        <span>Txid</span>
        <span>Pools</span>
        <span>Date</span>
        <span>Block</span>
      </div>
      <div className="ledger-rows" style={{ "--rows": limit } as CSSProperties}>
        {shown.map((tx) => (
          <TxRow
            key={tx.id}
            tx={tx}
            ref={(el) => {
              if (el) els.current.set(tx.id, el);
              else els.current.delete(tx.id);
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function Segmented({
  options,
  initial,
}: {
  options: string[];
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const active = Math.max(0, options.indexOf(value));
  return (
    <div
      className="frame-seg"
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      <span
        aria-hidden
        className="frame-seg-fill"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${active * 100}%)`,
        }}
      />
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === value}
          onClick={() => setValue(option)}
          className="frame-seg-btn"
          data-active={option === value}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

const zec = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });

export function Dashboard({ wallet }: { wallet: Wallet }) {
  return (
    <>
      <section className="frame-card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="text-base font-medium text-muted-foreground">
                Total Balance
              </span>
              <Icon name="eye" className="size-3.5 text-white/45" />
              <span className="frame-pill">
                <Icon name="check" className="size-3.5 text-brand" />
                Synced
              </span>
            </div>
            <span className="frame-amount">
              {zec(wallet.balance)}{" "}
              <span className="frame-amount-unit">ZEC</span>
            </span>
            <div className="h-4" />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-3">
            <div className="w-44">
              <Segmented options={["ZEC", "USD"]} initial="ZEC" />
            </div>
            <button type="button" className="frame-pools-btn">
              Pools
            </button>
          </div>
        </div>
        <hr className="my-6 border-border" />
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-heading text-base font-semibold">
              Balance over time
            </h2>
            <span className="text-xs font-medium text-brand">
              At your all-time high
            </span>
          </div>
          <div className="flex w-108 max-w-3/5 shrink-0 items-center gap-3">
            <button
              type="button"
              className="frame-stack-btn"
              aria-label="Stack pools"
              aria-pressed="false"
            >
              <Icon name="stack" className="size-4" />
            </button>
            <div className="min-w-0 flex-1">
              <Segmented
                options={["All", "1Y", "1M", "1W", "1D"]}
                initial="1D"
              />
            </div>
          </div>
        </div>
        <DitherChart
          points={wallet.points}
          className="mt-4 aspect-900/240 w-full"
        />
      </section>
      <section className="frame-card">
        <h2 className="font-heading text-base font-semibold">
          Recent Activity
        </h2>
        <Ledger rows={wallet.rows} limit={4} />
      </section>
    </>
  );
}
