import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWalletStore } from "@/stores/walletStore";
import { TauriInvokeError } from "@/lib/tauri";

/**
 * Login (PW-014): the password re-derives the DEK to unlock the vault. A wrong
 * password (or a missing keychain entry) fails the AEAD unwrap in Rust.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const unlockWallet = useWalletStore((s) => s.unlockWallet);

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await unlockWallet(password);
      await navigate({ to: "/dashboard" });
    } catch (err) {
      setError(
        err instanceof TauriInvokeError
          ? "Contraseña incorrecta."
          : "Error inesperado",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Pendrake
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ingresá tu contraseña para desbloquear la wallet.
        </p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          placeholder="Contraseña"
          autoFocus
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={busy || password.length === 0}>
          {busy ? "Desbloqueando…" : "Desbloquear"}
        </Button>
      </form>
    </div>
  );
}
