import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { removeWallet, unlock as unlockWallet } from "@/lib/ipc";

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

  async function submit() {
    setBusy(true);
    setError(false);
    try {
      await unlockWallet(password);
      navigate({ to: "/dashboard" });
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function startOver() {
    await removeWallet();
    navigate({ to: "/onboarding" });
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-ink text-white">
      <div className="relative hidden w-1/2 shrink-0 items-center justify-center overflow-hidden lg:flex">
        <div className="absolute left-1/4 top-1/3 size-[28rem] -translate-x-1/2 rounded-full bg-brand/40 blur-[64px]" />
        <span className="relative font-heading text-[16rem] leading-none font-bold text-brand select-none">
          龙
        </span>
      </div>

      <div className="flex flex-1 items-center px-10 py-12">
        <form
          className="mx-auto flex w-full max-w-md flex-col gap-7"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <header className="flex flex-col gap-2">
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
              Starting over wipes the wallet store and returns to onboarding. It's
              watch-only, so re-importing the UFVK restores it, with no funds at
              risk.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={startOver}>Start over</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
