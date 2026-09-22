import { useState } from "react";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog/alert-dialog";
import { Button } from "@/components/ui/button/button";

// Fiat display is off by default because it reaches third-party price providers, an
// outbound request beyond the Indexer (docs/adr/0008). Turning USD on is gated on this
// modal so the user consents to that egress with the trade-off spelled out. The invariant
// held regardless: only bulk price data is fetched, never a price keyed to one of your
// transactions, so a lookup can't be tied to your wallet activity.
export function FiatConsentDialog({
	open,
	onOpenChange,
	onAccept,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onAccept: () => Promise<void>;
}) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function accept() {
		setBusy(true);
		setError(null);
		try {
			await onAccept();
			onOpenChange(false);
		} catch (e) {
			setError(String(e));
		} finally {
			setBusy(false);
		}
	}

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Show balances in USD?</AlertDialogTitle>
					<AlertDialogDescription>
						Pendrake fetches the ZEC price from third-party providers. Those
						services see your IP address.
					</AlertDialogDescription>
				</AlertDialogHeader>

				<p className="rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
					Only the overall ZEC price is fetched. A price lookup can't be linked
					to your specific wallet activity.
				</p>

				{error && <span className="text-xs text-destructive">{error}</span>}

				<AlertDialogFooter>
					<AlertDialogCancel disabled={busy}>Not now</AlertDialogCancel>
					<Button disabled={busy} onClick={accept}>
						{busy ? "Enabling…" : "Enable USD"}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
