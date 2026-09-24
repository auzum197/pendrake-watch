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
import { appToast } from "@/components/app/app-toast/app-toast";
import { rescanWallet } from "@/lib/ipc";

export function RescanDialog({
  open,
  onOpenChange,
  walletId,
  birthdayHeight,
  onQueued,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletId: string;
  birthdayHeight: number;
  onQueued: () => void;
}) {
  const [busy, setBusy] = useState(false);

  function change(next: boolean) {
    if (!next) setBusy(false);
    onOpenChange(next);
  }

  async function confirm() {
    setBusy(true);
    try {
      await rescanWallet(walletId);
      onOpenChange(false);
      onQueued();
    } catch (e) {
      appToast.error("Couldn't rescan this Wallet", String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={change}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rescan this Wallet?</AlertDialogTitle>
          <AlertDialogDescription>
            Pendrake drops the synced history on this device and scans the chain
            again from block {birthdayHeight.toLocaleString()}. The balance and
            notes rebuild as the scan runs. The Wallet's identity and viewing
            key don't change.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button disabled={busy} onClick={() => void confirm()}>
            {busy ? "Starting…" : "Rescan"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
