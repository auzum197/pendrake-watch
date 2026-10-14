import type { Balance, Pool, Tx, WalletNote } from "@/lib/ipc";
import {
  type BalancePoint,
  confirmed,
  shortDate,
  totalConfirmed,
} from "@/lib/format";

// A pool's standing, derived from the live feed: its confirmed balance and share of
// the total, when it last moved, a balance trend for the sparkline, and the note-level
// breakdown the card reveals on expand. Orchard and Sapling are shielded; Transparent
// is in the open. Ironwood is the post-NU6.3 shielded pool.
export type PoolStat = {
  pool: Pool;
  confirmed: bigint;
  share: number;
  lastActivity: number | null;
  trend: number[];
  largest: bigint | null;
  smallest: bigint | null;
  noteCount: number;
  netFlow: bigint;
};

const POOLS: Pool[] = ["ironwood", "orchard", "sapling", "transparent"];

export const POOL_NAMES: Record<Pool, string> = {
  ironwood: "Ironwood",
  orchard: "Orchard",
  sapling: "Sapling",
  transparent: "Transparent",
};

export type PoolSeries = {
  pool: Pool;
  name: string;
  points: BalancePoint[];
};

type Move = { time: number; height: number | null; delta: number };

function poolMoves(notes: WalletNote[]): Move[] {
  const moves: Move[] = [];
  for (const note of notes) {
    const zec = Number(note.valueZat) / 1e8;
    if (note.time != null)
      moves.push({ time: note.time, height: note.height, delta: zec });
    if (note.spentTime != null)
      moves.push({
        time: note.spentTime,
        height: note.spentHeight,
        delta: -zec,
      });
  }
  return moves.sort((before, after) => before.time - after.time);
}

export type TimeFrame = { start: number; end: number };

export function poolHistory(
  notes: WalletNote[],
  frame?: TimeFrame,
): PoolSeries[] {
  const byPool = POOLS.map((pool) => ({
    pool,
    moves: poolMoves(notes.filter((note) => note.pool === pool)),
  })).filter((entry) => entry.moves.length > 0);
  if (byPool.length === 0) return [];

  const times = byPool.flatMap((entry) => entry.moves.map((move) => move.time));
  const first = Math.min(...times);
  const last = Math.max(...times);
  const span = last - first;
  const runway = span > 0 ? Math.round(span * 0.07) : 86_400;
  const start = frame?.start ?? first - runway;
  const end = frame?.end ?? last;

  return byPool.map(({ pool, moves }) => {
    let running = 0;
    for (const move of moves) {
      if (move.time >= start) break;
      running = Math.max(0, running + move.delta);
    }
    const points: BalancePoint[] = [
      { key: "start", t: start, value: running, label: "" },
    ];
    moves.forEach((move, index) => {
      if (move.time < start) return;
      running = Math.max(0, running + move.delta);
      points.push({
        key: `${pool}-${index}`,
        t: move.time,
        value: running,
        label: shortDate(move.time),
        height: move.height ?? undefined,
      });
    });
    if (points[points.length - 1].t < end)
      points.push({ key: "end", t: end, value: running, label: "" });
    return { pool, name: POOL_NAMES[pool], points };
  });
}

export function poolStats(
  balance: Balance | null,
  txs: Tx[],
  notes: WalletNote[],
): PoolStat[] {
  const total = totalConfirmed(balance) ?? 0n;
  const confirmedTxs = txs
    .filter((t) => t.status === "confirmed")
    .sort((a, b) => a.datetime - b.datetime);

  return POOLS.map((pool) => {
    const bal = confirmed(balance?.[pool]);
    const share = total > 0n ? (Number(bal) / Number(total)) * 100 : 0;
    const poolNotes = notes.filter((n) => n.pool === pool);

    // The trend is rebuilt from the wallet's notes, not from transaction outputs: a
    // spend consumes a note as an *input* and its change lands in another pool, so the
    // outputs of a spending transaction never name the pool the funds left. Each note
    // adds its value at the block it confirmed in and subtracts it again at the block
    // it was spent, so a fully-spent pool correctly returns to zero.
    const moves: { height: number; delta: number }[] = [];
    for (const n of poolNotes) {
      const v = Number(n.valueZat) / 1e8;
      if (n.height != null) moves.push({ height: n.height, delta: v });
      if (n.spentHeight != null)
        moves.push({ height: n.spentHeight, delta: -v });
    }
    moves.sort((a, b) => a.height - b.height);
    let running = 0;
    const trend: number[] = [0];
    for (const m of moves) {
      running = Math.max(0, running + m.delta);
      trend.push(running);
    }

    // Net flow nets every note that ever landed in the pool against the ones since
    // spent, so a pool that has cycled all its funds out reads zero, not its gross
    // intake.
    let received = 0n;
    let spent = 0n;
    for (const n of poolNotes) {
      const v = BigInt(n.valueZat);
      received += v;
      if (n.status === "spent") spent += v;
    }
    const netFlow = received - spent;

    // Largest/smallest/count read off the notes the wallet still holds in this pool,
    // so they describe what's spendable now, not historical outputs already spent.
    const held = poolNotes.filter((n) => n.status === "unspent");
    const values = held.map((n) => BigInt(n.valueZat));
    const largest = values.length
      ? values.reduce((m, v) => (v > m ? v : m))
      : null;
    const smallest = values.length
      ? values.reduce((m, v) => (v < m ? v : m))
      : null;

    // Last activity is the newest confirmed transaction that produced an output in
    // this pool. confirmedTxs is sorted ascending, so the final match wins.
    let lastActivity: number | null = null;
    for (const tx of confirmedTxs) {
      if (tx.notes.some((n) => n.pool === pool)) lastActivity = tx.datetime;
    }

    return {
      pool,
      confirmed: bal,
      share,
      lastActivity,
      trend,
      largest,
      smallest,
      noteCount: held.length,
      netFlow,
    };
  });
}
