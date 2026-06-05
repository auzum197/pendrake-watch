import { useEffect } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import type { Theme } from "@/types/settings";

/** Apply the resolved theme to <html> by toggling the `.dark` class. */
function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;
  const dark = theme === "dark" || (theme === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", dark);
}

/**
 * Keeps the actual app theme in sync with the persisted `theme` setting,
 * including following the OS preference when set to "system".
 */
export function useApplyTheme() {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);
}
