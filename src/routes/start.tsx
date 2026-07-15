import { useEffect } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { getWalletState } from "@/lib/ipc";

// Entry gate. Asks the daemon whether a wallet exists and sends the user to the
// dashboard or into onboarding. Nothing is drawn while it answers (the daemon
// spawns on first probe), just the app's dark surface, so the landing screen is
// the first thing the user sees. If the daemon can't be reached, onboarding is
// the safe landing.
export function StartGate() {
  const navigate = useNavigate();
  const router = useRouter();
  useEffect(() => {
    let active = true;
    getWalletState()
      .then((s) => {
        if (!active) return;
        // A deep link handled during the probe may have already routed away from
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

  return <div className="fixed inset-0 z-50 bg-ink" />;
}
