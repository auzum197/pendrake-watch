import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app/app-shell/app-shell";
import { UnavailableWallet } from "@/components/app/unavailable-wallet/unavailable-wallet";
import { useWalletData } from "@/hooks/use-wallet-data";

function sectionFor(pathname: string) {
  if (pathname.startsWith("/notes")) return "notes" as const;
  if (pathname.startsWith("/activity") || pathname.startsWith("/tx"))
    return "activity" as const;
  return "wallet" as const;
}

export function AppLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { wallet, sync, loaded, switching, error } = useWalletData();

  useEffect(() => {
    if (!loaded || !wallet) return;
    if (!wallet.exists) {
      navigate({ to: "/onboarding" });
      return;
    }
    if (wallet.locked) {
      navigate({ to: "/unlock", replace: true });
    }
  }, [loaded, wallet, navigate]);

  if (!loaded || !wallet?.exists || wallet.locked) {
    return null;
  }

  return (
    <AppShell
      active={sectionFor(pathname)}
      wallet={wallet}
      sync={sync}
      switching={switching}
      error={error}
    >
      {wallet.unavailable ? <UnavailableWallet wallet={wallet} /> : <Outlet />}
    </AppShell>
  );
}