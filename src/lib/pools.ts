import type { Balance, Pool, Tx, WalletNote } from "@/lib/ipc";
import { confirmed, totalConfirmed } from "@/lib/format";

// A pool's standing, derived from the live feed: its confirmed balance and share of
// the total, when it last moved, a balance trend for the sparkline, and the note-level
// breakdown the card reveals on expand. Orchard and Sapling are shielded; Transparent
// is in the open.
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

const POOLS: Pool[] = ["orchard", "sapling", "transparent"];

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
