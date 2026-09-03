import type { WalletSummary } from "@/lib/ipc";

const RECENCY_KEY = "pendrake.walletRecency";

function readRecency(): Record<string, number> {
	try {
		const raw = localStorage.getItem(RECENCY_KEY);
		return raw ? JSON.parse(raw) : {};
	} catch {
		return {};
	}
}

export function markUsed(id: string) {
	const recency = readRecency();
	recency[id] = Date.now();
	localStorage.setItem(RECENCY_KEY, JSON.stringify(recency));
}

export function orderWallets(
	wallets: WalletSummary[],
	selectedId: string | null,
): WalletSummary[] {
	const recency = readRecency();
	const others = wallets
		.filter((w) => w.id !== selectedId)
		.sort((a, b) => {
			const ra = recency[a.id];
			const rb = recency[b.id];
			if (ra !== undefined && rb !== undefined) return rb - ra;
			if (ra !== undefined) return -1;
			if (rb !== undefined) return 1;
			return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
		});
	const selected = wallets.find((w) => w.id === selectedId);
	return selected ? [...others, selected] : others;
}

export function mostRecentOther(
	wallets: WalletSummary[],
	removedId: string,
): string | undefined {
	return orderWallets(wallets, removedId).find((w) => w.id !== removedId)?.id;
}
