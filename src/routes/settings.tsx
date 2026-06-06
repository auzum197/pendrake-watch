import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUiStore } from "@/stores/uiStore";
import { useWalletStore } from "@/stores/walletStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { TauriInvokeError, tauri } from "@/lib/tauri";
import { handleDeepLink, SAMPLE_DEEP_LINKS } from "@/lib/deeplink";
import type { Currency, EndpointInfo, Theme } from "@/types/settings";

const THEMES: Theme[] = ["light", "dark", "system"];
const CURRENCIES: Currency[] = ["USD", "ARS"];

const AUTO_LOCK_OPTIONS: { label: string; minutes: number }[] = [
  { label: "1 min", minutes: 1 },
  { label: "5 min", minutes: 5 },
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "Nunca", minutes: 0 },
];

export function SettingsPage() {
  const navigate = useNavigate();

  // UI-only prefs (localStorage)
  const balanceHidden = useUiStore((s) => s.balanceHidden);
  const toggleBalanceHidden = useUiStore((s) => s.toggleBalanceHidden);
  const autoLockMinutes = useUiStore((s) => s.autoLockMinutes);
  const setAutoLockMinutes = useUiStore((s) => s.setAutoLockMinutes);

  // App settings (SQLite via Tauri)
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const currency = useSettingsStore((s) => s.currency);
  const setCurrency = useSettingsStore((s) => s.setCurrency);
  const autoSync = useSettingsStore((s) => s.autoSyncOnStartup);
  const setAutoSync = useSettingsStore((s) => s.setAutoSync);
  const endpoint = useSettingsStore((s) => s.endpoint);
  const defaultEndpoints = useSettingsStore((s) => s.defaultEndpoints);
  const setEndpoint = useSettingsStore((s) => s.setEndpoint);

  // Auth
  const changePassword = useWalletStore((s) => s.changePassword);
  const lockWallet = useWalletStore((s) => s.lockWallet);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwOk, setPwOk] = useState(false);
  const [busy, setBusy] = useState(false);

  // Custom endpoint form
  const [customHost, setCustomHost] = useState("");
  const [customPort, setCustomPort] = useState("443");
  const [customTls, setCustomTls] = useState(true);
  const [endpointError, setEndpointError] = useState<string | null>(null);

  // Live connection probe (PW-040)
  const [probing, setProbing] = useState(false);
  const [probeInfo, setProbeInfo] = useState<EndpointInfo | null>(null);
  const [probeError, setProbeError] = useState<string | null>(null);

  const isActiveEndpoint = (host: string, port: number) =>
    endpoint?.host === host && endpoint?.port === port;

  async function selectEndpoint(host: string, port: number, useTls: boolean) {
    setEndpointError(null);
    try {
      await setEndpoint({ host, port, useTls });
    } catch (err) {
      setEndpointError(
        err instanceof TauriInvokeError ? err.message : "Endpoint inválido",
      );
    }
  }

  async function onSaveCustomEndpoint(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const port = Number(customPort);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      setEndpointError("Puerto inválido.");
      return;
    }
    await selectEndpoint(customHost.trim(), port, customTls);
  }

  async function onTestConnection() {
    if (!endpoint) return;
    setProbing(true);
    setProbeInfo(null);
    setProbeError(null);
    try {
      setProbeInfo(await tauri.validateEndpointLive(endpoint));
    } catch (err) {
      setProbeError(
        err instanceof TauriInvokeError ? err.message : "No se pudo conectar",
      );
    } finally {
      setProbing(false);
    }
  }

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

      {/* Servidor (lightwalletd) */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground">
            Servidor (lightwalletd)
          </h2>
          <p className="text-xs text-muted-foreground">
            Nodo con el que se sincroniza la wallet.{" "}
            {endpoint && (
              <span className="font-mono text-foreground">
                {endpoint.useTls ? "https" : "http"}://{endpoint.host}:
                {endpoint.port}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {defaultEndpoints.map((ep) => (
            <Button
              key={`${ep.config.host}:${ep.config.port}`}
              variant={
                isActiveEndpoint(ep.config.host, ep.config.port)
                  ? "default"
                  : "outline"
              }
              size="sm"
              onClick={() =>
                void selectEndpoint(
                  ep.config.host,
                  ep.config.port,
                  ep.config.useTls,
                )
              }
            >
              {ep.label}
            </Button>
          ))}
        </div>

        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={onSaveCustomEndpoint}
        >
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs text-muted-foreground">Host custom</span>
            <Input
              placeholder="mi-nodo.ejemplo.com"
              value={customHost}
              onChange={(e) => setCustomHost(e.currentTarget.value)}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>
          <label className="flex w-24 flex-col gap-1">
            <span className="text-xs text-muted-foreground">Puerto</span>
            <Input
              inputMode="numeric"
              value={customPort}
              onChange={(e) => setCustomPort(e.currentTarget.value)}
            />
          </label>
          <Button
            type="button"
            variant={customTls ? "default" : "outline"}
            size="sm"
            onClick={() => setCustomTls((v) => !v)}
          >
            TLS {customTls ? "on" : "off"}
          </Button>
          <Button type="submit" size="sm" disabled={!customHost.trim()}>
            Usar
          </Button>
        </form>
        {endpointError && (
          <p className="text-sm text-destructive">{endpointError}</p>
        )}

        {/* Live connection probe (PW-040) */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void onTestConnection()}
            disabled={probing || !endpoint}
          >
            {probing ? "Probando…" : "Probar conexión"}
          </Button>
          {probeInfo && (
            <span className="text-xs text-emerald-500">
              ✓ {probeInfo.chainName} · bloque{" "}
              {probeInfo.blockHeight.toLocaleString()} · {probeInfo.vendor}{" "}
              {probeInfo.version}
            </span>
          )}
          {probeError && (
            <span className="text-xs text-destructive">{probeError}</span>
          )}
        </div>
      </section>

      {/* Apariencia */}
      <section className="flex flex-col gap-3 border-t border-border pt-6">
        <h2 className="text-sm font-semibold text-muted-foreground">Apariencia</h2>
        <div className="flex gap-2">
          {THEMES.map((t) => (
            <Button
              key={t}
              variant={theme === t ? "default" : "outline"}
              size="sm"
              className="capitalize"
              onClick={() => void setTheme(t)}
            >
              {t}
            </Button>
          ))}
        </div>
      </section>

      {/* Moneda */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground">Moneda</h2>
          <p className="text-xs text-muted-foreground">
            Preferencia para mostrar valores fiat (conversión fuera del MVP).
          </p>
        </div>
        <div className="flex gap-2">
          {CURRENCIES.map((c) => (
            <Button
              key={c}
              variant={currency === c ? "default" : "outline"}
              size="sm"
              onClick={() => void setCurrency(c)}
            >
              {c}
            </Button>
          ))}
        </div>
      </section>

      {/* Sincronización */}
      <section className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Sincronizar al iniciar</h2>
          <p className="text-xs text-muted-foreground">
            Comenzar la sincronización automáticamente al abrir la app.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void setAutoSync(!autoSync)}>
          {autoSync ? "Activado" : "Desactivado"}
        </Button>
      </section>

      {/* Ocultar saldos */}
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

      {/* Auto-bloqueo */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground">
            Auto-bloqueo
          </h2>
          <p className="text-xs text-muted-foreground">
            Bloquea la wallet automáticamente tras un período de inactividad.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {AUTO_LOCK_OPTIONS.map((opt) => (
            <Button
              key={opt.minutes}
              variant={autoLockMinutes === opt.minutes ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoLockMinutes(opt.minutes)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </section>

      {/* Cambiar contraseña */}
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

      {/* Notificaciones (simulación / dev) */}
      <section className="flex flex-col gap-3 border-t border-border pt-6">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground">
            Notificaciones (simulación)
          </h2>
          <p className="text-xs text-muted-foreground">
            Dispara notificaciones nativas de prueba. El sync real las disparará
            desde el daemon; esto las simula hasta entonces. Al hacer clic en la
            notificación se abre <span className="font-mono">pendrake://…</span> y la
            app navega a la vista correspondiente.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void tauri.notifyTest("tx")}
          >
            Notif. nativa: tx recibida
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void tauri.notifyTest("sync")}
          >
            Notif. nativa: sync completo
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Probar sólo la navegación del deep-link (sin pasar por el SO):
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleDeepLink(SAMPLE_DEEP_LINKS.tx)}
          >
            Simular clic → tx
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleDeepLink(SAMPLE_DEEP_LINKS.sync)}
          >
            Simular clic → sync
          </Button>
        </div>
      </section>

      {/* Cerrar sesión */}
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
