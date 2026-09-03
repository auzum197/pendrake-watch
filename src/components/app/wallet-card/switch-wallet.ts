import { selectWallet } from "@/lib/ipc";
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
		const state = await selectWallet(id);
		markUsed(id);
		showSelectedWallet(state);
	} catch (e) {
		appToast.error("Couldn't switch Wallet", String(e));
		reloadWalletData();
	}
}
