import type { Balance, SyncStatus } from "@/lib/ipc";

export function confirmed(pool: Balance["orchard"]): bigint {
  return BigInt(pool?.confirmed ?? "0");
}

export function totalConfirmed(balance: Balance | null): bigint | null {
  if (!balance) return null;
  return (
    confirmed(balance.orchard) +
    confirmed(balance.sapling) +
    confirmed(balance.transparent)
  );
}

export function formatZec(zatoshis: bigint): string {
  return (Number(zatoshis) / 1e8).toLocaleString(undefined, {
    maximumFractionDigits: 8,
  });
}

// At the chain tip the daemon keeps running short rounds, so its state flips
// idle/syncing every couple of seconds. Treat "caught up to the tip" as synced so
// the label holds steady instead of flickering.
export function isSynced(sync: SyncStatus | null): boolean {
  if (!sync) return false;
  return (
    sync.state === "idle" ||
    (sync.chainTip > 0 && sync.syncedHeight >= sync.chainTip)
  );
}

export function syncLabel(sync: SyncStatus | null): string {
  if (!sync) return "Connecting…";
  if (sync.state === "error") return "Sync error";
  if (isSynced(sync)) return "Synced";
  return `Syncing… ${Math.round(sync.percent)}%`;
}

export function formatHeight(sync: SyncStatus | null): string {
  const h = sync?.chainTip || sync?.syncedHeight;
  return h ? h.toLocaleString() : "—";
}

export function formatTime(epoch: number): string {
  const ms = epoch < 1e12 ? epoch * 1000 : epoch;
  const d = new Date(ms);
  const today = new Date();
  const hhmm = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  return sameDay
    ? `Today ${hhmm}`
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
