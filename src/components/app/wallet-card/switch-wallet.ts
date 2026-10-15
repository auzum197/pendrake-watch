import { getWalletState } from "@/lib/ipc";
import { setSelectedId } from "@/lib/selection";
import { markUsed } from "@/lib/wallet-recency";
import {
  beginWalletSwitch,
  reloadWalletData,
  showSelectedWallet,
} from "@/hooks/use-wallet-data";
import { appToast } from "../app-toast/app-toast";

export async function switchWallet(id: string): Promise<void> {
  beginWalletSwitch();
  try {
    const state = await getWalletState(id);
    setSelectedId(id);
    markUsed(id);
    showSelectedWallet(state);
  } catch (e) {
    appToast.error("Couldn't switch Wallet", String(e));
    reloadWalletData();
  }
}
