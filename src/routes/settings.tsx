import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { IconAlertTriangle } from "@tabler/icons-react";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { LifeHashIcon } from "@/components/onboarding/lifehash";
import { ReplaceDialog } from "@/components/settings/replace-dialog";
import { useWalletData } from "@/hooks/use-wallet-data";

// Settings, with the current Wallet's identity and a danger zone for Replace.
// AUZ-47 will add the Indexer section to this same page.
export function SettingsPage() {
  const navigate = useNavigate();
  const { wallet, sync, loaded } = useWalletData();
  const [replacing, setReplacing] = useState(false);

  // No wallet means onboarding hasn't run, so there's nothing to configure here.
  useEffect(() => {
    if (loaded && wallet && !wallet.exists) navigate({ to: "/onboarding" });
  }, [loaded, wallet, navigate]);

  return (
    <AppShell active="settings" wallet={wallet} sync={sync}>
      <h1 className="font-heading text-xl font-bold">Settings</h1>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="font-heading text-base font-semibold">Wallet</h2>
        <div className="mt-4 flex items-center gap-4">
          {wallet?.fingerprint ? (
            <LifeHashIcon
              fingerprint={wallet.fingerprint}
              className="size-14 shrink-0 rounded-full"
            />
          ) : (
            <div className="size-14 shrink-0 rounded-full bg-zinc-100" />
          )}
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="inline-flex w-fit items-center rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium capitalize text-brand">
              {wallet?.network ?? "—"}
            </span>
            <span className="truncate font-mono text-xs text-zinc-400">
              {wallet?.fingerprint ?? "No wallet"}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-destructive/30 bg-destructive/[0.03] p-6">
        <div className="flex items-center gap-2 text-destructive">
          <IconAlertTriangle className="size-4" />
          <h2 className="font-heading text-base font-semibold">Danger zone</h2>
        </div>
        <div className="mt-4 flex items-start justify-between gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-900">
              Replace Wallet
            </span>
            <span className="text-sm text-zinc-500">
              Import a different UFVK in place of this one. Erases the current
              Wallet's identity and history. This can't be undone.
            </span>
          </div>
          <Button
            variant="destructive"
            className="shrink-0"
            onClick={() => setReplacing(true)}
          >
            Replace…
          </Button>
        </div>
      </section>

      <ReplaceDialog
        open={replacing}
        onOpenChange={setReplacing}
        fingerprint={wallet?.fingerprint ?? null}
        network={wallet?.network ?? "mainnet"}
      />
    </AppShell>
  );
}
