import { toast } from "sonner";
import { openSettings } from "@/lib/settings-modal";
import { reloadWalletData } from "@/hooks/use-wallet-data";

export const TOAST_ID = {
	unreachable: "indexer-unreachable",
	wrongChain: "wrong-chain",
	daemon: "daemon-unreachable",
} as const;

const reviewIndexer = {
	label: "Change Indexer",
	onClick: () => openSettings({ indexer: true }),
};

export const appToast = {
	unreachable() {
		return toast.warning("Can't reach your Indexer.", {
			id: TOAST_ID.unreachable,
			duration: Infinity,
			action: reviewIndexer,
		});
	},
	wrongChain() {
		return toast.error(
			"Your Indexer is serving a different chain than this Wallet synced.",
			{
				id: TOAST_ID.wrongChain,
				duration: Infinity,
				action: { ...reviewIndexer, label: "Review Indexer" },
			},
		);
	},
	daemon(reason: string) {
		return toast.error("Can't reach the background process.", {
			id: TOAST_ID.daemon,
			description: reason,
			duration: Infinity,
			action: { label: "Retry", onClick: () => reloadWalletData() },
		});
	},
	error(title: string, description?: string) {
		return toast.error(title, { description });
	},
	success(title: string, description?: string) {
		return toast.success(title, { description });
	},
	info(title: string, description?: string) {
		return toast.info(title, { description });
	},
	dismiss(id: string) {
		toast.dismiss(id);
	},
};
