// A deep link (pendrake://tx?txid=…) that arrives while the wallet is locked is
// stashed here and replayed after the next successful unlock, so the lock screen is
// never skipped. sessionStorage survives the in-app hop through /unlock; a true
// relaunch re-delivers the link, which re-stashes.
const KEY = "pendrake.pendingTxid";

export function stashPendingTxid(txid: string) {
	sessionStorage.setItem(KEY, txid);
}

export function takePendingTxid(): string | null {
	const txid = sessionStorage.getItem(KEY);
	if (txid) sessionStorage.removeItem(KEY);
	return txid;
}
