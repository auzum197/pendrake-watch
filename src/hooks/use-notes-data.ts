import { useEffect, useState } from "react";
import { getNotes, onSyncEvent, type WalletNote } from "@/lib/ipc";
import { onWalletReload, onWalletSwitchStart } from "@/hooks/use-wallet-data";

export type NotesData = {
  notes: WalletNote[];
  loaded: boolean;
  error: string | null;
};

// Last loaded notes, kept in module scope so returning to the view (e.g. opening a
// transaction and coming back) shows the previous list at once instead of flashing
// the loading state while the daemon answers again. Null until the first load, which
// is what tells the view to show its cold-start skeleton rather than an empty table.
let cache: WalletNote[] | null = null;

// Loads the wallet's notes from the daemon and keeps them live off the sync-event
// stream. The note list only moves when funds arrive or a scan round commits, so it
// refetches on `transaction` and `finished` rather than on every progress tick, with
// a slow poll as a safety net. Built live each call (the daemon reads it straight off
// the wallet), since the debug view wants ground truth, not a cache.
export function useNotesData(): NotesData {
  const [notes, setNotes] = useState<WalletNote[]>(cache ?? []);
  const [loaded, setLoaded] = useState(cache !== null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function refetch() {
      try {
        const next = await getNotes();
        if (!active) return;
        cache = next;
        setNotes(next);
        setError(null);
      } catch (e) {
        if (active) setError(String(e));
      } finally {
        if (active) setLoaded(true);
      }
    }

    refetch();

    const unlisten = onSyncEvent((ev) => {
      if (!active) return;
      if (ev.event === "transaction" || ev.event === "finished") refetch();
    });

    const stopSwitch = onWalletSwitchStart(() => {
      if (!active) return;
      cache = null;
      setNotes([]);
      setLoaded(false);
    });
    const stopReload = onWalletReload(() => {
      if (active) refetch();
    });

    const timer = setInterval(refetch, 20000);

    return () => {
      active = false;
      clearInterval(timer);
      unlisten.then((fn) => fn()).catch(() => {});
      stopSwitch();
      stopReload();
    };
  }, []);

  return { notes, loaded, error };
}
