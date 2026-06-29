import { useEffect } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { getWalletState } from "@/lib/ipc";
import { Splash } from "@/components/app/splash";

// Shortest the splash stays up, so a fast daemon probe doesn't flash it.
const SPLASH_MIN_MS = 600;

// Entry gate. Asks the daemon whether a wallet exists and sends the user to the
// dashboard or into onboarding. The branded splash holds the moment while the
// daemon answers (it spawns on first probe). If it can't be reached, onboarding
// is the safe landing.
export function StartGate() {
  const navigate = useNavigate();
  const router = useRouter();
  useEffect(() => {
    let active = true;
    Promise.all([
      getWalletState(),
      new Promise<void>((resolve) => setTimeout(resolve, SPLASH_MIN_MS)),
    ])
      .then(([s]) => {
        if (!active) return;
        // A deep link handled during the splash may have already routed away from
        // the gate; don't override its destination with the default landing.
        if (router.state.location.pathname !== "/") return;
        const to = !s.exists ? "/onboarding" : s.locked ? "/unlock" : "/dashboard";
        navigate({ to, replace: true });
      })
      .catch(() => {
        if (active) navigate({ to: "/onboarding", replace: true });
      });
    return () => {
      active = false;
    };
  }, [navigate, router]);

  return <Splash />;
}
