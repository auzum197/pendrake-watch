import type { WalletState } from "@/lib/ipc";

export function selectedDisplayName(wallet: WalletState | null): string {
  const custom = wallet?.label?.trim();
  if (custom) return custom;
  if (wallet?.fingerprint) return wallet.fingerprint.slice(0, 8);
  return "—";
}
