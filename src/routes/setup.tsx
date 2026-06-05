import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { tauri, TauriInvokeError } from "@/lib/tauri";
import { useWalletStore } from "@/stores/walletStore";

/**
 * Onboarding screen. Renders outside the app shell (no sidebar) and is the
 * redirect target of the wallet-config guard.
 *
 * NOTE: the `ping` call below talks to Rust directly from the component on
 * purpose — it's a diagnostics probe, not domain data, and there is no store
 * for it. Wallet *data* always flows through store actions instead.
 */
export function SetupPage() {
  const navigate = useNavigate();
  const setConfigured = useWalletStore((s) => s.setConfigured);

  const [pingResult, setPingResult] = useState<string | null>(null);
  const [pingError, setPingError] = useState<string | null>(null);

  async function testIpc() {
    setPingError(null);
    setPingResult(null);
    try {
      setPingResult(await tauri.ping());
    } catch (err) {
      setPingError(err instanceof TauriInvokeError ? err.message : "IPC failed");
    }
  }

  function initWallet() {
    // Real flow will validate + encrypt a viewing key here. For the scaffold we
    // just flip the gate flag and enter the app.
    setConfigured(true);
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="font-heading text-3xl font-bold tracking-tight">
        Set up your wallet
      </h1>
      <p className="text-muted-foreground">
        Pendrake is a view-only Zcash wallet. In the MVP you'll paste a viewing
        key and set a password here. For now, initialize a mock wallet to explore
        the app.
      </p>

      <div className="flex w-full flex-col gap-3">
        <Button onClick={initWallet}>Initialize mock wallet</Button>

        <Button variant="outline" onClick={testIpc}>
          Test IPC (ping)
        </Button>

        {pingResult && (
          <p className="text-sm text-foreground">
            Rust replied: <span className="font-mono">{pingResult}</span>
          </p>
        )}
        {pingError && (
          <p className="text-sm text-destructive">Error: {pingError}</p>
        )}
      </div>
    </div>
  );
}
