import { useCallback, useEffect, useState } from "react";
import { hydrateDiscreet } from "@/lib/discreet";
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
  switching: boolean;
  /** Re-fetch wallet + balances/txs/sync without a full page reload. */
  reload: () => Promise<void>;
};

// Last good snapshot, kept in module scope so a route change (e.g. opening a tx
// and coming back) shows the previous balance and history at once instead of
// flashing empty while the daemon answers again.
const cache: Omit<WalletData, "loaded" | "error" | "switching" | "reload"> = {
  wallet: null,
  balance: null,
  txs: [],
  sync: null,
  addresses: [],
};

const RELOAD_EVENT = "pendrake-wallet-reload";
const WALLET_STATE_EVENT = "pendrake-wallet-state";
const SWITCH_EVENT = "pendrake-wallet-switch";

let pendingSwitch = false;

// Reconcile the cached wallet after a state change made outside the hook (unlock,
// rename, select). Dispatches so mounted hooks update React state immediately.
export function setCachedWallet(state: WalletState) {
  cache.wallet = state;
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(WALLET_STATE_EVENT, { detail: state }),
    );
  }
}

// Drop balance/history/sync so a switched wallet never flashes the previous
// account's numbers while the new snapshot loads.
export function clearWalletSnapshotCache() {
  cache.balance = null;
  cache.txs = [];
  cache.sync = null;
  cache.addresses = [];
}

// Ask every mounted useWalletData() to re-run load(). Used after select/remove.
export function reloadWalletData() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(RELOAD_EVENT));
  }
}

export function beginWalletSwitch() {
  pendingSwitch = true;
  clearWalletSnapshotCache();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SWITCH_EVENT));
  }
}

export function onWalletSwitchStart(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(SWITCH_EVENT, cb);
  return () => window.removeEventListener(SWITCH_EVENT, cb);
}

export function onWalletReload(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(RELOAD_EVENT, cb);
  return () => window.removeEventListener(RELOAD_EVENT, cb);
}

export function getCachedWallet(): WalletState | null {
  return cache.wallet;
}

export function getCachedTx(txid: string): Tx | null {
  return cache.txs.find((tx) => tx.txid === txid) ?? null;
}

// Loads the wallet snapshot from the daemon and keeps it live off the pushed
// sync-event stream, with a slow poll as a safety net.
export function useWalletData(): WalletData {
  const [wallet, setWallet] = useState(cache.wallet);
  const [balance, setBalance] = useState(cache.balance);
  const [txs, setTxs] = useState(cache.txs);
  const [sync, setSync] = useState(cache.sync);
  const [addresses, setAddresses] = useState(cache.addresses);
  const [loaded, setLoaded] = useState(cache.wallet !== null);
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(pendingSwitch);

  const applySnapshot = useCallback(
    (next: {
      wallet: WalletState;
      balance: Balance | null;
      txs: Tx[];
      sync: SyncStatus | null;
      addresses: WalletAddress[];
    }) => {
      cache.wallet = next.wallet;
      cache.balance = next.balance;
      cache.txs = next.txs;
      cache.sync = next.sync;
      cache.addresses = next.addresses;
      setWallet(next.wallet);
      setBalance(next.balance);
      setTxs(next.txs);
      setSync(next.sync);
      setAddresses(next.addresses);
      hydrateDiscreet(next.wallet.discreet ?? false);
    },
    [],
  );

  const load = useCallback(async () => {
    try {
      const state = await getWalletState();
      hydrateDiscreet(state.discreet ?? false);
      setError(null);
      if (!state.exists) {
        applySnapshot({
          wallet: state,
          balance: null,
          txs: [],
          sync: null,
          addresses: [],
        });
        return;
      }
      const [addrs, bal, history, status] = await Promise.all([
        getAddresses().catch(() => [] as WalletAddress[]),
        getBalance().catch(() => null),
        getTransactions().catch(() => null),
        getSyncStatus().catch(() => null),
      ]);
      applySnapshot({
        wallet: state,
        balance: bal,
        txs: history ?? [],
        sync: status,
        addresses: addrs,
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setLoaded(true);
      pendingSwitch = false;
      setSwitching(false);
    }
  }, [applySnapshot]);

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

    load();

    const onReload = () => {
      if (active) void load();
    };
    window.addEventListener(RELOAD_EVENT, onReload);

    // Immediate wallet-only updates (rename, unlock, select) without full reload.
    const onWalletState = (e: Event) => {
      if (!active) return;
      const state = (e as CustomEvent<WalletState>).detail;
      if (!state) return;
      cache.wallet = state;
      setWallet(state);
      hydrateDiscreet(state.discreet ?? false);
    };
    window.addEventListener(WALLET_STATE_EVENT, onWalletState);

    const onSwitch = () => {
      if (active) setSwitching(true);
    };
    window.addEventListener(SWITCH_EVENT, onSwitch);

    const unlisten = onSyncEvent((ev) => {
      if (!active) return;
      switch (ev.event) {
        case "progress":
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
                  wrongChain: ev.wrongChain ?? false,
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
      window.removeEventListener(RELOAD_EVENT, onReload);
      window.removeEventListener(WALLET_STATE_EVENT, onWalletState);
      window.removeEventListener(SWITCH_EVENT, onSwitch);
      unlisten.then((fn) => fn()).catch(() => {});
    };
  }, [load]);

  return {
    wallet,
    balance,
    txs,
    sync,
    addresses,
    loaded,
    error,
    switching,
    reload: load,
  };
}