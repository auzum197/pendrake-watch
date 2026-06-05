import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUiStore, type Theme } from "@/stores/uiStore";
import { useWalletStore } from "@/stores/walletStore";
import { TauriInvokeError } from "@/lib/tauri";

const THEMES: Theme[] = ["light", "dark", "system"];

/** Preferences + account security (PW-016 change password, PW-017 logout). */
export function SettingsPage() {
  const navigate = useNavigate();

  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const balanceHidden = useUiStore((s) => s.balanceHidden);
  const toggleBalanceHidden = useUiStore((s) => s.toggleBalanceHidden);

  const changePassword = useWalletStore((s) => s.changePassword);
  const lockWallet = useWalletStore((s) => s.lockWallet);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwOk, setPwOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwError(null);
    setPwOk(false);
    if (newPassword.length < 8) {
      setPwError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirm) {
      setPwError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    try {
      await changePassword(oldPassword, newPassword);
      setPwOk(true);
      setOldPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err) {
      setPwError(
        err instanceof TauriInvokeError
          ? "Contraseña actual incorrecta."
          : "Error inesperado",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onLogout() {
    await lockWallet();
    await navigate({ to: "/login" });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <h1 className="font-heading text-2xl font-bold tracking-tight">Ajustes</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Apariencia</h2>
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
          <h2 className="text-sm font-semibold">Ocultar saldos</h2>
          <p className="text-xs text-muted-foreground">
            Enmascara los montos como {"$•••"} en toda la app.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={toggleBalanceHidden}>
          {balanceHidden ? "Mostrar" : "Ocultar"}
        </Button>
      </section>

      <section className="flex flex-col gap-3 border-t border-border pt-6">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Cambiar contraseña
        </h2>
        <form className="flex max-w-sm flex-col gap-3" onSubmit={onChangePassword}>
          <Input
            type="password"
            placeholder="Contraseña actual"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.currentTarget.value)}
          />
          <Input
            type="password"
            placeholder="Nueva contraseña"
            value={newPassword}
            onChange={(e) => setNewPassword(e.currentTarget.value)}
          />
          <Input
            type="password"
            placeholder="Repetir nueva contraseña"
            value={confirm}
            onChange={(e) => setConfirm(e.currentTarget.value)}
          />
          {pwError && <p className="text-sm text-destructive">{pwError}</p>}
          {pwOk && (
            <p className="text-sm text-emerald-500">Contraseña actualizada.</p>
          )}
          <Button type="submit" size="sm" disabled={busy || !oldPassword}>
            {busy ? "Guardando…" : "Cambiar contraseña"}
          </Button>
        </form>
      </section>

      <section className="flex items-center justify-between border-t border-border pt-6">
        <div>
          <h2 className="text-sm font-semibold">Cerrar sesión</h2>
          <p className="text-xs text-muted-foreground">
            Bloquea la wallet y borra la clave de la memoria.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onLogout}>
          Cerrar sesión
        </Button>
      </section>
    </div>
  );
}
