import { useState } from "react";
import { IconAlertCircle } from "@tabler/icons-react";
import type { WalletState } from "@/lib/ipc";
import { Button } from "@/components/ui/button/button";
import { RemoveDialog } from "@/components/settings/remove-dialog";

export function UnavailableWallet({ wallet }: { wallet: WalletState }) {
	const [removing, setRemoving] = useState(false);
	return (
		<section className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
			<IconAlertCircle className="size-10 text-red-400" />
			<div className="flex max-w-md flex-col gap-2">
				<h1 className="font-heading text-2xl font-bold tracking-tight">
					This Wallet can't be opened
				</h1>
				<p className="text-sm text-muted-foreground">
					Its file on this device would not open, so it isn't syncing. Your
					other Wallets are unaffected. It's watch-only, so removing it and
					importing the UFVK again restores it with no funds at risk.
				</p>
				{wallet.unavailable && (
					<p className="mt-2 rounded-lg bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground select-text">
						{wallet.unavailable}
					</p>
				)}
			</div>
			<Button variant="destructive" onClick={() => setRemoving(true)}>
				Remove Wallet…
			</Button>
			<RemoveDialog
				open={removing}
				onOpenChange={setRemoving}
				walletId={wallet.walletId ?? null}
				fingerprint={wallet.fingerprint}
				network={wallet.network}
			/>
		</section>
	);
}
