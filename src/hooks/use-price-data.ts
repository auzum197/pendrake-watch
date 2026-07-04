import { useEffect, useState } from "react";
import {
  getPriceHistory,
  getSpotPrice,
  onSyncEvent,
  type PricePoint,
  type PriceSpot,
} from "@/lib/ipc";

export type PriceData = {
  // The latest reconciled spot, or null before the first fetch. Carries its own
  // staleness flag from the daemon.
  spot: PriceSpot | null;
  // The daily series the chart marks the balance against, oldest first.
  history: PricePoint[];
  loaded: boolean;
};

// Prices are global ZEC/USD data, not wallet-specific, so a single module-scope cache is
// shared across routes (mirroring use-wallet-data). Kept warm so the dashboard shows the
// last value at once on navigation instead of flashing blank.
const cache: { spot: PriceSpot | null; history: PricePoint[] } = {
  spot: null,
  history: [],
};

// Loads the reconciled spot and daily series, then keeps the spot live off the daemon's
// pushed `priceUpdate` events. Only meaningful once fiat is enabled: while it's off the
// daemon fetches nothing, so these return null / empty and the UI falls back to ZEC.
export function usePriceData(enabled: boolean): PriceData {
  const [spot, setSpot] = useState(cache.spot);
  const [history, setHistory] = useState(cache.history);
  const [loaded, setLoaded] = useState(cache.spot !== null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    async function load() {
      const [s, h] = await Promise.all([
        getSpotPrice().catch(() => null),
        getPriceHistory().catch(() => []),
      ]);
      if (!active) return;
      if (s) {
        cache.spot = s;
        setSpot(s);
      }
      if (h.length > 0) {
        cache.history = h;
        setHistory(h);
      }
      setLoaded(true);
    }

    load();

    const unlisten = onSyncEvent((ev) => {
      if (!active || ev.event !== "priceUpdate") return;
      cache.spot = ev.spot;
      setSpot(ev.spot);
    });

    // The daily series only grows once a day; a slow poll picks up the new day and any
    // history that landed after the first load without waiting for a navigation.
    const timer = setInterval(() => {
      getPriceHistory()
        .then((h) => {
          if (active && h.length > 0) {
            cache.history = h;
            setHistory(h);
          }
        })
        .catch(() => {});
    }, 60_000);

    return () => {
      active = false;
      clearInterval(timer);
      unlisten.then((fn) => fn()).catch(() => {});
    };
  }, [enabled]);

  return { spot, history, loaded };
}
