import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useUiStore, type Theme } from "@/stores/uiStore";
import { useWalletStore } from "@/stores/walletStore";

const THEMES: Theme[] = ["light", "dark", "system"];

/** Preferences + wallet reset. Endpoint/pool config land here in later cards. */
export function SettingsPage() {
  const navigate = useNavigate();

  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const balanceHidden = useUiStore((s) => s.balanceHidden);
  const toggleBalanceHidden = useUiStore((s) => s.toggleBalanceHidden);

  const reset = useWalletStore((s) => s.reset);

  function resetWallet() {
    reset();
    navigate({ to: "/setup" });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <h1 className="font-heading text-2xl font-bold tracking-tight">
        Settings
      </h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Appearance</h2>
        <div className="flex gap-2">
          {THEMES.map((t) => (
            <Button
              key={t}
              variant={theme === t ? "default" : "outline"}
              size="sm"
              className="capitalize"
              onClick={() => setTheme(t)}
            >
              {t}
            </Button>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Hide balances</h2>
          <p className="text-xs text-muted-foreground">
            Mask amounts as {"$•••"} across the app.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={toggleBalanceHidden}>
          {balanceHidden ? "Show" : "Hide"}
        </Button>
      </section>

      <section className="flex items-center justify-between border-t border-border pt-6">
        <div>
          <h2 className="text-sm font-semibold text-destructive">Reset wallet</h2>
          <p className="text-xs text-muted-foreground">
            Clears local config and returns to setup.
          </p>
        </div>
        <Button variant="destructive" size="sm" onClick={resetWallet}>
          Reset
        </Button>
      </section>
    </div>
  );
}
