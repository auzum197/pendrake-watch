import type { WalletSummary } from "./generated/wire";

const KEY = "pendrake.selectedWallet";

export function getSelectedId(): string | null {
  return localStorage.getItem(KEY);
}

export function setSelectedId(id: string | null): void {
  if (id) localStorage.setItem(KEY, id);
  else localStorage.removeItem(KEY);
}

export function resolveSelectedId(wallets: WalletSummary[]): string | null {
  const stored = getSelectedId();
  const next =
    wallets.find((w) => w.id === stored)?.id ?? wallets[0]?.id ?? null;
  if (next !== stored) setSelectedId(next);
  return next;
}
