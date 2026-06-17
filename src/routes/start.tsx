import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getWalletState } from "@/lib/ipc";

// Entry gate. Asks the daemon whether a wallet exists and sends the user to the
// dashboard or into onboarding. A dark frame holds the moment while the daemon
// answers (it spawns on first probe). If it can't be reached, onboarding is the
// safe landing.
export function StartGate() {
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    getWalletState()
      .then((s) => {
        if (!active) return;
        const to = !s.exists ? "/onboarding" : s.locked ? "/unlock" : "/dashboard";
        navigate({ to, replace: true });
      })
      .catch(() => {
        if (active) navigate({ to: "/onboarding", replace: true });
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  return <div className="fixed inset-0 z-50 bg-ink" />;
}
