import { useEffect } from "react";
import { Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useSettingsStore } from "@/stores/settingsStore";
import { useApplyTheme } from "@/hooks/useApplyTheme";

/**
 * Outermost shell. Loads app settings from the backend on startup and keeps the
 * theme applied to <html>. Renders for every route (setup/login/app), so the
 * theme works even before the wallet is unlocked (settings are not encrypted).
 */
export function RootLayout() {
  const load = useSettingsStore((s) => s.load);

  useEffect(() => {
    void load().catch(() => {
      /* settings unavailable (e.g. outside Tauri) — fall back to defaults */
    });
  }, [load]);

  useApplyTheme();

  return (
    <>
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </>
  );
}
