import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { HoldButton } from "@/components/ui/hold-button";
import { removeWallet, unlock as unlockWallet } from "@/lib/ipc";
import { getCachedWallet, setCachedWallet } from "@/hooks/use-wallet-data";
import { takePendingTxid } from "@/lib/deep-link";
import pendrakeLogo from "@/assets/pendrake-logo.svg";

// Unlock screen (docs/adr/0003). The global passphrase set at onboarding is what
// decrypts the wallet, so collecting it here is the lock. The real version hands
// the passphrase to the daemon over IPC (`Unlock { passphrase }`); until that
// lands this checks the in-session passphrase. A forgotten passphrase can't be
// recovered (Argon2, never stored), so the only way out is the destructive "Start
// over", which wipes the store and returns to onboarding via the remove machinery.
export function UnlockPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmStartOver, setConfirmStartOver] = useState(false);

  // Reaching the lock screen with the session already open means a back navigation
  // landed here after unlocking. Don't prompt again: resume the pending tx or go
  // home. Read once, synchronously, so the form never flashes before the redirect.
  const alreadyOpen = useRef(getCachedWallet()?.locked === false).current;
  useEffect(() => {
    if (!alreadyOpen) return;
    const txid = takePendingTxid();
    if (txid) navigate({ to: "/tx/$txid", params: { txid }, replace: true });
    else navigate({ to: "/dashboard", replace: true });
  }, [alreadyOpen, navigate]);

  async function submit() {
    setBusy(true);
    setError(false);
    try {
      const state = await unlockWallet(password);
      // Reflect the now-unlocked session in the shared cache before navigating, so
      // the layout guard on the next screen doesn't read a stale lock and bounce
      // straight back here.
      setCachedWallet(state);
      // Resume a deep link that arrived while locked, otherwise land on the
      // dashboard. Replace so the lock screen drops out of history and backing out
      // of the tx never re-prompts.
      const txid = takePendingTxid();
      if (txid) navigate({ to: "/tx/$txid", params: { txid }, replace: true });
      else navigate({ to: "/dashboard", replace: true });
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function startOver() {
    // Wipe the wallet, then let the confirm modal animate closed before leaving.
    // Navigating right away unmounts this whole screen and cuts the exit
    // animation, so hold the route until the 150ms close has played.
    await removeWallet();
    setConfirmStartOver(false);
    await new Promise((resolve) => setTimeout(resolve, 200));
    navigate({ to: "/onboarding" });
  }

  // Hold the dark surface through the one-frame redirect, so an already-open
  // session never shows the password form.
  if (alreadyOpen) return <div className="fixed inset-0 z-50 bg-ink" />;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-ink px-10 py-12 text-white">
      <img src={pendrakeLogo} alt="Pendrake" className="h-[27px] select-none" />
      <div className="flex w-full flex-1 flex-col justify-center py-10">
        <form
          className="mx-auto flex w-full max-w-md flex-col gap-7"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <header className="flex flex-col items-center gap-2 text-center">
            <h1 className="font-heading text-4xl font-bold tracking-tight">
              Unlock wallet
            </h1>
            <p className="text-sm text-white/50">
              Enter your password to unlock this wallet.
            </p>
          </header>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-white/60">Password</span>
            <div className="relative">
              <input
                autoFocus
                type={shown ? "text" : "password"}
                className="h-12 w-full rounded-xl border border-ink-line bg-ink-soft px-4 pr-12 font-mono text-sm text-white outline-none transition-colors placeholder:text-white/35 focus-visible:border-brand"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.currentTarget.value);
                  setError(false);
                }}
              />
              <button
                type="button"
                onClick={() => setShown((s) => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white/70"
              >
                {shown ? (
                  <IconEyeOff className="size-4" />
                ) : (
                  <IconEye className="size-4" />
                )}
              </button>
            </div>
            {error && (
              <span className="text-xs text-red-400">
                That password doesn't match.
              </span>
            )}
          </label>

          <button
            type="submit"
            disabled={password.length === 0 || busy}
            className="h-12 w-full rounded-full bg-brand text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90 disabled:bg-white/10 disabled:text-white/40"
          >
            {busy ? "Unlocking…" : "Unlock"}
          </button>

          <button
            type="button"
            onClick={() => setConfirmStartOver(true)}
            className="self-center text-sm text-white/45 transition-colors hover:text-white/70"
          >
            Forgot passphrase?
          </button>
        </form>
      </div>

      <AlertDialog open={confirmStartOver} onOpenChange={setConfirmStartOver}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start over?</AlertDialogTitle>
            <AlertDialogDescription>
              The passphrase isn't stored anywhere and the wallet file is
              encrypted with it, so a forgotten passphrase can't be recovered.
              Starting over wipes every wallet and returns to onboarding. It's
              watch-only, so no funds are at risk, but you'll need your viewing
              keys again to re-import.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel className="px-4">Cancel</AlertDialogCancel>
            <HoldButton onConfirm={startOver} className="h-9 w-auto px-4">
              Hold to start over
            </HoldButton>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
