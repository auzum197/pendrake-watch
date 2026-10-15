import { getWalletState } from "@/lib/ipc";
import { getSelectedId, setSelectedId } from "@/lib/selection";
import { showSelectedWallet } from "@/hooks/use-wallet-data";

export async function selectLinkedWallet(walletId: string | undefined) {
  if (!walletId || walletId === getSelectedId()) return;
  const state = await getWalletState(walletId);
  setSelectedId(walletId);
  showSelectedWallet(state);
}

const KEY = "pendrake.pendingLink";

export type PendingLink = {
  txid: string;
  walletId?: string;
};

export function stashPendingLink(link: PendingLink) {
  sessionStorage.setItem(KEY, JSON.stringify(link));
}

export function takePendingLink(): PendingLink | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  sessionStorage.removeItem(KEY);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
