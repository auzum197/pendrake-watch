import { type ReactNode, useMemo, useState } from "react";
import {
  IconActivity,
  IconChevronDown,
  IconCircleCheckFilled,
  IconHelpCircle,
  IconHome,
  IconListDetails,
  IconLock,
  IconPlant,
  IconSettings,
  IconTrees,
  IconWallet,
} from "@tabler/icons-react";
import pendrakeLogo from "@/assets/pendrake-logo.svg";
import { Segmented } from "@/components/app/segmented/segmented";
import { TxList } from "@/components/app/tx-list/tx-list";
import { LifeHashIcon } from "@/components/onboarding/lifehash";
import { txs } from "@/stories/fixtures";
import {
  type BalancePoint,
  type ChartRange,
  filterRange,
  formatUsd,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { DitherArea, type DitherLook } from "../dither/dither-area";
import { DitherWash } from "./dither-wash";
import { poolWalk } from "./fake-data";
import { INK, type Rgb } from "../dither/palette";

export type ShellProps = {
  points: BalancePoint[];
  usd?: boolean;
  look?: Partial<DitherLook>;
};

const WALLET = { fingerprint: "a1b2c3d4e5f6", label: "Cold storage" };

const RANGES: { value: ChartRange; label: string }[] = [
  { value: "all", label: "All" },
  { value: "year", label: "1Y" },
  { value: "month", label: "1M" },
  { value: "week", label: "1W" },
  { value: "day", label: "1D" },
];

const NAV = [
  { icon: IconHome, label: "Home", active: true },
  { icon: IconActivity, label: "Activity" },
  { icon: IconListDetails, label: "Notes" },
];

const NAV_FOOT = [
  { icon: IconSettings, label: "Settings" },
  { icon: IconHelpCircle, label: "About" },
  { icon: IconLock, label: "Sign Out" },
];

const POOLS = [
  { name: "Orchard", Icon: IconTrees, ink: INK.orchard, share: 0.62, seed: 11 },
  { name: "Sapling", Icon: IconPlant, ink: INK.sapling, share: 0.3, seed: 12 },
  {
    name: "Transparent",
    Icon: IconWallet,
    ink: INK.transparent,
    share: 0.08,
    seed: 13,
  },
];

function total(points: BalancePoint[]): number {
  return points[points.length - 1]?.value ?? 0;
}

function formatTotal(v: number, usd: boolean): string {
  return usd
    ? formatUsd(v)
    : v.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

function useRange(points: BalancePoint[]) {
  const [range, setRange] = useState<ChartRange>("all");
  const series = useMemo(() => filterRange(points, range), [points, range]);
  return { range, setRange, series };
}

function Frame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex bg-ink text-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Content({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative min-w-0 flex-1 bg-background", className)}>
      <main className="absolute inset-0 overflow-y-auto">
        <div className="flex min-h-full flex-col gap-6 px-8 pb-7 pt-14">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  active,
  rail,
  mono,
  accent = "bg-brand text-ink",
}: {
  icon: typeof IconHome;
  label: string;
  active?: boolean;
  rail?: boolean;
  mono?: boolean;
  accent?: string;
}) {
  return (
    <button
      type="button"
      title={rail ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 overflow-hidden py-2 text-sm transition duration-150 ease-out active:scale-97",
        rail ? "mx-3.5 justify-center rounded-full px-0" : "rounded-lg px-4.5",
        mono && "rounded-none text-xs uppercase tracking-widest",
        active
          ? `${accent} font-bold`
          : "font-medium text-white/55 hover:bg-white/5 hover:text-white/80",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!rail && <span className="whitespace-nowrap">{label}</span>}
    </button>
  );
}

function WalletStub({
  rail,
  mono,
  className,
}: {
  rail?: boolean;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 bg-white/5 px-3 py-3",
        mono ? "rounded-none border border-white/15" : "rounded-xl",
        rail && "justify-center bg-transparent px-0",
        className,
      )}
    >
      <LifeHashIcon
        fingerprint={WALLET.fingerprint}
        className="size-10 shrink-0 rounded-full"
      />
      {!rail && (
        <>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "truncate text-sm font-semibold text-white",
                mono && "font-mono",
              )}
            >
              {WALLET.label}
            </p>
            <p className="truncate font-mono text-xs text-white/50">
              {WALLET.fingerprint.slice(0, 8)}
            </p>
          </div>
          <IconChevronDown className="size-4 shrink-0 text-white/40" />
        </>
      )}
    </div>
  );
}

function Sidebar({
  rail,
  mono,
  accent,
  wash,
  className,
}: {
  rail?: boolean;
  mono?: boolean;
  accent?: string;
  wash?: ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "relative flex shrink-0 flex-col bg-ink px-3 pb-5 pt-11 text-white",
        rail ? "w-22.5" : "w-64.5",
        mono ? "border-r border-white/15" : "border-r-2 border-border",
        className,
      )}
    >
      {wash}
      <div className="relative flex justify-center px-2 py-2">
        <div className={cn("overflow-hidden", rail ? "w-8" : "w-42.5")}>
          <img src={pendrakeLogo} alt="Pendrake" className="h-8 max-w-none" />
        </div>
      </div>
      <WalletStub rail={rail} mono={mono} className="relative mt-5" />
      <nav className="relative mt-5 flex flex-col gap-1">
        {NAV.map((n) => (
          <NavItem
            key={n.label}
            {...n}
            rail={rail}
            mono={mono}
            accent={accent}
          />
        ))}
      </nav>
      <nav className="relative mt-auto flex flex-col gap-1">
        {NAV_FOOT.map((n) => (
          <NavItem
            key={n.label}
            {...n}
            rail={rail}
            mono={mono}
            accent={accent}
          />
        ))}
      </nav>
    </aside>
  );
}

function SyncPill({ mono }: { mono?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 border border-border bg-muted px-3 py-1 text-xs text-muted-foreground",
        mono ? "rounded-none uppercase tracking-wider" : "rounded-full",
      )}
    >
      <IconCircleCheckFilled
        className={cn(
          "size-3.5 shrink-0",
          mono ? "text-pool-ironwood" : "text-brand",
        )}
      />
      Synced
    </span>
  );
}

function Hero({
  points,
  usd = false,
  size = "lg",
  mono,
  className,
}: {
  points: BalancePoint[];
  usd?: boolean;
  size?: "lg" | "md";
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "text-base font-medium text-muted-foreground",
            mono && "text-xs uppercase tracking-widest",
          )}
        >
          Total Balance
        </span>
        <SyncPill mono={mono} />
      </div>
      <span
        className={cn(
          "font-bold leading-none tabular-nums",
          mono ? "font-mono" : "font-heading",
          size === "lg" ? "text-5xl" : "text-3xl",
        )}
      >
        {formatTotal(total(points), usd)}{" "}
        <span
          className={cn(
            "font-normal text-muted-foreground",
            size === "lg" ? "text-2xl" : "text-lg",
          )}
        >
          {usd ? "USD" : "ZEC"}
        </span>
      </span>
    </div>
  );
}

function Activity({ mono, className }: { mono?: boolean; className?: string }) {
  return (
    <section
      className={cn(
        "border border-border bg-card p-6",
        mono ? "rounded-none border-white/15 bg-transparent" : "rounded-2xl",
        className,
      )}
    >
      <h2
        className={cn(
          "font-heading text-base font-semibold",
          mono && "font-mono text-xs uppercase tracking-widest text-white/50",
        )}
      >
        Recent Activity
      </h2>
      <TxList txs={txs} limit={5} />
    </section>
  );
}

function PoolTile({
  pool,
  base,
  look,
  mono,
  layout = "row",
}: {
  pool: (typeof POOLS)[number];
  base: number;
  look: Partial<DitherLook>;
  mono?: boolean;
  layout?: "row" | "stack";
}) {
  const series = useMemo(() => poolWalk(pool.seed, 90, pool.share), [pool]);
  return (
    <div
      className={cn(
        "flex border border-border bg-card",
        mono ? "rounded-none border-white/15 bg-transparent" : "rounded-2xl",
        layout === "row" ? "flex-col gap-3 p-4" : "items-center gap-4 p-4",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span
          className={cn(
            "flex items-center gap-2 text-xs text-muted-foreground",
            mono && "font-mono uppercase tracking-widest",
          )}
        >
          <pool.Icon className="size-3.5" />
          {pool.name}
        </span>
        <span
          className={cn(
            "text-lg font-semibold tabular-nums",
            mono ? "font-mono" : "font-heading",
          )}
        >
          {(base * pool.share).toLocaleString(undefined, {
            maximumFractionDigits: 4,
          })}
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            ZEC
          </span>
        </span>
      </div>
      <DitherArea
        points={series}
        ink={pool.ink}
        axes={false}
        interactive={false}
        animate={false}
        sparkles={false}
        bloom="off"
        variant="gradient"
        kind="area"
        curve="step"
        cell={2}
        {...look}
        className={layout === "row" ? "h-14 w-full" : "h-12 w-28 shrink-0"}
      />
    </div>
  );
}

function PoolRow({
  base,
  look = {},
  mono,
}: {
  base: number;
  look?: Partial<DitherLook>;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {POOLS.map((p) => (
        <PoolTile key={p.name} pool={p} base={base} look={look} mono={mono} />
      ))}
    </div>
  );
}

function ChartHeader({
  range,
  setRange,
  mono,
}: {
  range: ChartRange;
  setRange: (r: ChartRange) => void;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2
        className={cn(
          "font-heading text-base font-semibold",
          mono && "font-mono text-xs uppercase tracking-widest text-white/50",
        )}
      >
        Balance over time
      </h2>
      <div className="w-96 max-w-3/5">
        <Segmented
          tone="neutral"
          value={range}
          onChange={setRange}
          options={RANGES}
        />
      </div>
    </div>
  );
}

export function ClassicShell({ points, usd = false, look = {} }: ShellProps) {
  const { range, setRange, series } = useRange(points);
  return (
    <Frame>
      <Sidebar />
      <Content>
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <Hero points={points} usd={usd} />
            <div className="w-44">
              <Segmented
                tone="neutral"
                value={usd ? "usd" : "zec"}
                onChange={() => {}}
                options={[
                  { value: "zec", label: "ZEC" },
                  { value: "usd", label: "USD" },
                ]}
              />
            </div>
          </div>
          <hr className="my-6 border-border" />
          <ChartHeader range={range} setRange={setRange} />
          <div className="mt-4">
            <DitherArea
              points={series}
              usd={usd}
              className="aspect-900/240 w-full"
              {...look}
            />
          </div>
        </section>
        <Activity />
      </Content>
    </Frame>
  );
}

export function HeroWashShell({ points, usd = false, look = {} }: ShellProps) {
  const { range, setRange, series } = useRange(points);
  const ink: Rgb = look.ink ?? INK.brand;
  return (
    <Frame>
      <Sidebar
        wash={
          <DitherWash
            ink={ink}
            direction="up"
            cell={3}
            opacity={0.3}
            className="top-auto h-72"
          />
        }
      />
      <Content>
        <section className="relative overflow-hidden rounded-2xl border border-border bg-card">
          <div className="absolute inset-x-0 bottom-0 h-64">
            <DitherArea
              points={series}
              usd={usd}
              axes={false}
              ink={ink}
              variant="gradient"
              cell={3}
              bloom="aura"
              sparkles
              className="h-full w-full"
              {...look}
            />
          </div>
          <div className="relative flex items-start justify-between gap-4 p-6 pb-52">
            <Hero points={points} usd={usd} />
            <div className="w-88">
              <Segmented
                tone="neutral"
                value={range}
                onChange={setRange}
                options={RANGES}
              />
            </div>
          </div>
        </section>
        <PoolRow base={total(points)} look={{ variant: look.variant }} />
        <Activity />
      </Content>
    </Frame>
  );
}

export function TerminalShell({ points, usd = false, look = {} }: ShellProps) {
  const { range, setRange, series } = useRange(points);
  const ink: Rgb = look.ink ?? INK.ironwood;
  const panel = "rounded-none border border-white/15 p-6";
  return (
    <Frame className="font-mono">
      <Sidebar
        mono
        accent="bg-pool-ironwood text-ink"
        className="w-56 bg-ink"
        wash={
          <DitherWash
            ink={ink}
            direction="down"
            cell={4}
            opacity={0.45}
            className="bottom-auto h-40"
          />
        }
      />
      <Content className="bg-ink">
        <section className={panel}>
          <div className="flex items-start justify-between gap-4">
            <Hero points={points} usd={usd} mono />
            <div className="text-right text-xs uppercase tracking-widest text-white/40">
              <p>tip 2,400,000</p>
              <p className="mt-1">zec.rocks:443</p>
            </div>
          </div>
        </section>
        <section className={panel}>
          <ChartHeader range={range} setRange={setRange} mono />
          <div className="mt-5">
            <DitherArea
              points={series}
              usd={usd}
              ink={ink}
              variant="hatched"
              curve="step"
              cell={3}
              bloom="off"
              sparkles={false}
              className="aspect-900/260 w-full"
              {...look}
            />
          </div>
        </section>
        <PoolRow
          base={total(points)}
          mono
          look={{ variant: "hatched", cell: 3 }}
        />
        <Activity mono />
      </Content>
    </Frame>
  );
}

export function SplitShell({ points, usd = false, look = {} }: ShellProps) {
  const { range, setRange, series } = useRange(points);
  return (
    <Frame>
      <Sidebar rail />
      <Content>
        <div className="grid grid-cols-[minmax(0,1fr)_--spacing(80)] gap-6">
          <section className="flex min-h-128 flex-col rounded-2xl border border-border bg-card p-6">
            <ChartHeader range={range} setRange={setRange} />
            <DitherArea
              points={series}
              usd={usd}
              variant="dotted"
              cell={3}
              bloom="high"
              curve="linear"
              className="mt-6 min-h-0 flex-1"
              {...look}
            />
          </section>
          <div className="flex flex-col gap-4">
            <section className="rounded-2xl border border-border bg-card p-5">
              <Hero points={points} usd={usd} size="md" />
            </section>
            {POOLS.map((p) => (
              <PoolTile
                key={p.name}
                pool={p}
                base={total(points)}
                layout="stack"
                look={{ variant: "dotted", cell: 2 }}
              />
            ))}
          </div>
        </div>
        <Activity />
      </Content>
    </Frame>
  );
}

export function TopbarShell({ points, usd = false, look = {} }: ShellProps) {
  const { range, setRange, series } = useRange(points);
  const ink: Rgb = look.ink ?? INK.brand;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground">
      <DitherWash
        ink={ink}
        direction="up"
        cell={4}
        opacity={0.22}
        className="top-auto h-96"
      />
      <header className="relative z-10 flex h-14 shrink-0 items-center gap-6 border-b border-border bg-ink/70 pl-24 pr-6 backdrop-blur-xl">
        <img src={pendrakeLogo} alt="Pendrake" className="h-7 max-w-none" />
        <nav className="flex items-center gap-1 rounded-full border border-ink-line bg-ink-soft p-1">
          {NAV.map((n) => (
            <button
              key={n.label}
              type="button"
              aria-current={n.active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                n.active
                  ? "bg-white/10 text-white"
                  : "text-white/55 hover:text-white/80",
              )}
            >
              <n.icon className="size-4" />
              {n.label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <SyncPill />
          <div className="flex items-center gap-2">
            <LifeHashIcon
              fingerprint={WALLET.fingerprint}
              className="size-7 rounded-full"
            />
            <span className="text-sm font-semibold text-white">
              {WALLET.label}
            </span>
            <IconChevronDown className="size-4 text-white/40" />
          </div>
        </div>
      </header>
      <main className="relative flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-8 py-10">
          <div className="flex items-end justify-between gap-6">
            <Hero points={points} usd={usd} />
            <div className="w-88">
              <Segmented
                tone="neutral"
                value={range}
                onChange={setRange}
                options={RANGES}
              />
            </div>
          </div>
          <section className="rounded-2xl border border-border bg-card/80 p-6 backdrop-blur-sm">
            <DitherArea
              points={series}
              usd={usd}
              ink={ink}
              kind="bars"
              bins={28}
              variant="gradient"
              cell={2}
              bloom="low"
              sparkles={false}
              className="aspect-900/260 w-full"
              {...look}
            />
          </section>
          <PoolRow base={total(points)} look={{ kind: "line", bloom: "low" }} />
          <Activity className="bg-card/80 backdrop-blur-sm" />
        </div>
      </main>
    </div>
  );
}
