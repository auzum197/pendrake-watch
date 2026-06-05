import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useWalletStore } from "@/stores/walletStore";
import { useUiStore } from "@/stores/uiStore";

/** User interactions that count as "activity" and reset the idle timer. */
const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "wheel",
  "touchstart",
] as const;

/** Throttle window for resetting the timer (avoid resetting on every pixel). */
const RESET_THROTTLE_MS = 1_000;

/**
 * Auto-lock by inactivity (PW-017). After `autoLockMinutes` of no interaction,
 * locks the wallet (drops the DEK from backend memory via `lockWallet`) and
 * redirects to the login screen.
 *
 * Mounted in {@link AppLayout}, which only renders while the wallet is unlocked,
 * so the timer is scoped to an active session. `autoLockMinutes = 0` disables it.
 */
export function useAutoLock() {
  const navigate = useNavigate();
  const lockWallet = useWalletStore((s) => s.lockWallet);
  const autoLockMinutes = useUiStore((s) => s.autoLockMinutes);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (autoLockMinutes <= 0) return; // disabled

    const timeoutMs = autoLockMinutes * 60_000;
    let lastReset = 0;

    const clear = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const lockNow = async () => {
      try {
        await lockWallet();
      } finally {
        navigate({ to: "/login" });
      }
    };

    const arm = () => {
      clear();
      timerRef.current = window.setTimeout(() => {
        void lockNow();
      }, timeoutMs);
    };

    const onActivity = () => {
      const now = Date.now();
      if (now - lastReset < RESET_THROTTLE_MS) return;
      lastReset = now;
      arm();
    };

    arm();
    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, onActivity, { passive: true }),
    );

    return () => {
      clear();
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, onActivity),
      );
    };
  }, [autoLockMinutes, lockWallet, navigate]);
}
