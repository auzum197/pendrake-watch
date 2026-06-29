import { useEffect, useState } from "react";
import {
  getAddresses,
  getBalance,
  getSyncStatus,
  getTransactions,
  getWalletState,
  onSyncEvent,
  type Balance,
  type SyncStatus,
  type Tx,
  type WalletAddress,
  type WalletState,
} from "@/lib/ipc";

export type WalletData = {
  wallet: WalletState | null;
  balance: Balance | null;
  txs: Tx[];
  sync: SyncStatus | null;
  addresses: WalletAddress[];
  loaded: boolean;
  error: string | null;
};

// Last good snapshot, kept in module scope so a route change (e.g. opening a tx
// and coming back) shows the previous balance and history at once instead of
// flashing empty while the daemon answers again.
const cache: Omit<WalletData, "loaded" | "error"> = {
  wallet: null,
  balance: null,
  txs: [],
  sync: null,
  addresses: [],
};

// Reconcile the cached wallet after a state change made outside the hook (an
// unlock from the lock screen). Without this the next signed-in screen reads a
// stale `locked: true` and the layout guard bounces back to /unlock.
export function setCachedWallet(state: WalletState) {
  cache.wallet = state;
}

// The last known wallet state, or null before the first load. Lets the lock screen
// tell an open session from a locked one synchronously, without a daemon round-trip.
export function getCachedWallet(): WalletState | null {
  return cache.wallet;
}

// The transaction from the last loaded history, if present. Lets the detail view
// render instantly on a click from a populated list instead of waiting on a
// daemon round-trip. Returns null on a cold deep-link, where the list never
// loaded.
export function getCachedTx(txid: string): Tx | null {
  return cache.txs.find((tx) => tx.txid === txid) ?? null;
}

// Loads the wallet snapshot from the daemon and keeps it live off the pushed
// sync-event stream, with a slow poll as a safety net. Reads only, the same
// commands home.tsx uses, so the dashboard reflects the real engine.
export function useWalletData(): WalletData {
  const [wallet, setWallet] = useState(cache.wallet);
  const [balance, setBalance] = useState(cache.balance);
  const [txs, setTxs] = useState(cache.txs);
  const [sync, setSync] = useState(cache.sync);
  const [addresses, setAddresses] = useState(cache.addresses);
  const [loaded, setLoaded] = useState(cache.wallet !== null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function refetch() {
      const [bal, history, status] = await Promise.all([
        getBalance().catch(() => null),
        getTransactions().catch(() => null),
        getSyncStatus().catch(() => null),
      ]);
      if (!active) return;
      if (bal) {
        cache.balance = bal;
        setBalance(bal);
      }
      if (history) {
        cache.txs = history;
        setTxs(history);
      }
      if (status) {
        cache.sync = status;
        setSync(status);
      }
    }

    async function load() {
      try {
        const state = await getWalletState();
        if (!active) return;
        cache.wallet = state;
        setWallet(state);
        setError(null);
        if (state.exists) {
          const addrs = await getAddresses().catch(() => []);
          if (active) {
            cache.addresses = addrs;
            setAddresses(addrs);
          }
          await refetch();
        }
      } catch (e) {
        if (active) setError(String(e));
      } finally {
        if (active) setLoaded(true);
      }
    }

    load();

    const unlisten = onSyncEvent((ev) => {
      if (!active) return;
      switch (ev.event) {
        case "progress":
          // A progress tick moves the scan forward but changes neither the
          // balance nor the history, so only the sync status updates here.
          // Refetching the whole snapshot on every tick rebuilt the chart's
          // data each time. Balance and history refresh on `transaction` and
          // `finished`, with the slow poll as the safety net.
          cache.sync = ev.status;
          setSync(ev.status);
          break;
        case "finished":
          cache.sync = ev.status;
          setSync(ev.status);
          refetch();
          break;
        case "transaction":
          refetch();
          break;
        case "error":
          setSync((prev) =>
            prev
              ? {
                  ...prev,
                  state: "error",
                  error: ev.message,
                  unreachable: ev.unreachable ?? false,
                }
              : prev,
          );
          break;
      }
    });

    const timer = setInterval(refetch, 20000);

    return () => {
      active = false;
      clearInterval(timer);
      unlisten.then((fn) => fn()).catch(() => {});
    };
  }, []);

  return { wallet, balance, txs, sync, addresses, loaded, error };
}
