import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWalletStore } from "@/stores/walletStore";
import { TauriInvokeError } from "@/lib/tauri";

/**
 * First-run onboarding (PW-012/PW-029): the user pastes a viewing key and sets a
 * password. The backend generates a keychain master key, derives the DEK and
 * stores the viewing key encrypted (PW-006). Rendered without the app sidebar.
 */
export function SetupPage() {
  const navigate = useNavigate();
  const setupWallet = useWalletStore((s) => s.setupWallet);

  const [viewingKey, setViewingKey] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setBusy(true);
    try {
      await setupWallet(viewingKey.trim(), password);
      await navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof TauriInvokeError ? err.message : "Error inesperado");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Configurar wallet
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pegá tu viewing key de Zcash y elegí una contraseña. La clave se guarda
          cifrada en este dispositivo; nunca sale de acá.
        </p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Viewing key</span>
          <textarea
            className="min-h-24 resize-none rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="uview1..."
            value={viewingKey}
            onChange={(e) => setViewingKey(e.currentTarget.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Contraseña</span>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            placeholder="Mínimo 8 caracteres"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Repetir contraseña</span>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.currentTarget.value)}
          />
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={busy || !viewingKey.trim()}>
          {busy ? "Configurando…" : "Crear wallet"}
        </Button>
      </form>
    </div>
  );
}
