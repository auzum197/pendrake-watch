import { useLayoutEffect, useRef, useState } from "react";
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
} from "@/components/ui/alert-dialog/alert-dialog";
import { Button } from "@/components/ui/button/button";
import { LifeHashIcon } from "@/components/onboarding/lifehash";
import {
  listWallets,
  removeWallet,
  verifyPassphrase,
  type Network,
} from "@/lib/ipc";
import { mostRecentOther } from "@/lib/wallet-recency";
import { showSelectedWallet } from "@/hooks/use-wallet-data";
import { cn } from "@/lib/utils";

type Step = "explain" | "reauth";

export function RemoveDialog({
  open,
  onOpenChange,
  walletId,
  fingerprint,
  network,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletId: string | null;
  fingerprint: string | null;
  network: Network;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("explain");
  const [passphrase, setPassphrase] = useState("");
  const [shown, setShown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  const [leaving, setLeaving] = useState<Step | null>(null);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setHeight(entry.borderBoxSize[0].blockSize);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function go(next: Step) {
    if (next === step) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!reduced) setLeaving(step);
    setStep(next);
  }

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
    if (!walletId) return;
    setBusy(true);
    setError(null);
    try {
      if (!(await verifyPassphrase(passphrase))) {
        setError("That passphrase doesn't match.");
        setBusy(false);
        return;
      }
      const wallets = await listWallets().catch(() => []);
      const state = await removeWallet(
        walletId,
        mostRecentOther(wallets, walletId),
      );
      if (state.exists) {
        showSelectedWallet(state);
        onOpenChange(false);
      } else {
        navigate({ to: "/onboarding" });
      }
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  }

  const renderStep = (s: Step) =>
    s === "explain" ? (
      <>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove this Wallet?</AlertDialogTitle>
          <AlertDialogDescription>
            Removing erases this Wallet's identity and synced history from this
            device. Your other Wallets keep syncing. It's watch-only, so
            re-importing the UFVK restores it, with no funds at risk.
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
            <span className="truncate font-mono text-xs text-muted-foreground select-text">
              {fingerprint ?? "Unknown fingerprint"}
            </span>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button onClick={() => go("reauth")}>Continue</Button>
        </AlertDialogFooter>
      </>
    ) : (
      <>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm your passphrase</AlertDialogTitle>
          <AlertDialogDescription>
            Enter your passphrase to remove the Wallet. This wipes it
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
          {error && <span className="text-xs text-destructive">{error}</span>}
        </form>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={passphrase.length === 0 || busy}
            onClick={confirm}
          >
            {busy ? "Removing…" : "Remove Wallet"}
          </Button>
        </AlertDialogFooter>
      </>
    );

  return (
    <AlertDialog open={open} onOpenChange={change}>
      <AlertDialogContent>
        {/* -mx-1/px-1 keeps the wrapper clipped through the morph without cutting
            the passphrase input's focus ring at the horizontal edges. */}
        <div
          style={{ height }}
          className="relative -mx-1 overflow-hidden px-1 transition-[height] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
        >
          <div ref={contentRef}>
            <div
              key={step}
              className={cn(
                "grid gap-6 duration-200 motion-reduce:animate-none",
                leaving && "animate-in fade-in-0 fill-mode-both",
              )}
            >
              {renderStep(step)}
            </div>
          </div>
          {leaving && (
            <div
              key={`leaving-${leaving}`}
              aria-hidden
              onAnimationEnd={() => setLeaving(null)}
              className="pointer-events-none absolute inset-x-1 top-0 grid gap-6 duration-200 animate-out fade-out-0 fill-mode-both motion-reduce:hidden"
            >
              {renderStep(leaving)}
            </div>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
