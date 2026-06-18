import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { LifeHashIcon } from "@/components/onboarding/lifehash";
import { forgetWallet, verifyPassphrase, type Network } from "@/lib/ipc";

type Step = "explain" | "reauth";

// Replace is the v0 path to a different Wallet (CONTEXT.md): a destructive swap
// behind a two-step confirmation. Step one names what the wipe erases, step two
// re-authenticates against the daemon's held passphrase. Nothing is touched until
// the final confirm, so cancelling at either step leaves the Wallet intact. On
// confirm the daemon keeps the session passphrase across the wipe, so onboarding
// skips Set Password and the new Wallet inherits it (docs/adr/0004).
export function ReplaceDialog({
  open,
  onOpenChange,
  fingerprint,
  network,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fingerprint: string | null;
  network: Network;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("explain");
  const [passphrase, setPassphrase] = useState("");
  const [shown, setShown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Closing resets the flow so reopening starts clean and a failed attempt never
  // lingers. No IPC has fired before the final confirm, so the Wallet is untouched.
  function change(next: boolean) {
    if (!next) {
      setStep("explain");
      setPassphrase("");
      setShown(false);
      setError(null);
      setBusy(false);
    }
    onOpenChange(next);
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      if (!(await verifyPassphrase(passphrase))) {
        setError("That passphrase doesn't match.");
        setBusy(false);
        return;
      }
      // keepSession so the new Wallet inherits the passphrase (docs/adr/0004).
      await forgetWallet(true);
      navigate({ to: "/onboarding" });
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={change}>
      <AlertDialogContent>
        {step === "explain" ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Replace this Wallet?</AlertDialogTitle>
              <AlertDialogDescription>
                Replacing imports a different UFVK in place of this one. The
                current Wallet's identity and synced history are erased and can't
                be recovered. It's watch-only, so re-importing the UFVK restores
                it, with no funds at risk.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
              {fingerprint ? (
                <LifeHashIcon
                  fingerprint={fingerprint}
                  className="size-11 shrink-0 rounded-full"
                />
              ) : (
                <div className="size-11 shrink-0 rounded-full bg-muted" />
              )}
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-xs font-medium capitalize text-muted-foreground">
                  {network}
                </span>
                <span className="truncate font-mono text-xs text-muted-foreground">
                  {fingerprint ?? "Unknown fingerprint"}
                </span>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button onClick={() => setStep("reauth")}>Continue</Button>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm your passphrase</AlertDialogTitle>
              <AlertDialogDescription>
                Enter your passphrase to replace the Wallet. This wipes it
                immediately and can't be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (passphrase.length > 0 && !busy) confirm();
              }}
            >
              <div className="relative">
                <input
                  autoFocus
                  type={shown ? "text" : "password"}
                  className="h-11 w-full rounded-lg border border-border bg-background px-3.5 pr-11 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                  placeholder="Enter your passphrase"
                  value={passphrase}
                  onChange={(e) => {
                    setPassphrase(e.currentTarget.value);
                    setError(null);
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShown((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {shown ? (
                    <IconEyeOff className="size-4" />
                  ) : (
                    <IconEye className="size-4" />
                  )}
                </button>
              </div>
              {error && (
                <span className="text-xs text-destructive">{error}</span>
              )}
            </form>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={passphrase.length === 0 || busy}
                onClick={confirm}
              >
                {busy ? "Replacing…" : "Replace Wallet"}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
