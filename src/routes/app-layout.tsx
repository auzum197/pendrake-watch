import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app/app-shell/app-shell";
import { useWalletData } from "@/hooks/use-wallet-data";

// The chrome shared by every signed-in screen: the sidebar and the scrollable
// content frame. Mounted once for the whole branch, so the sidebar persists
// across navigations (it never remounts, and the view transition holds it still)
// while only the routed content swaps.
function sectionFor(pathname: string) {
  if (pathname.startsWith("/settings")) return "settings" as const;
  if (pathname.startsWith("/notes")) return "notes" as const;
  if (pathname.startsWith("/activity") || pathname.startsWith("/tx"))
    return "activity" as const;
  return "wallet" as const;
}

export function AppLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { wallet, sync, loaded, switching } = useWalletData();

  // Signed-in branch only. Onboarding (/onboarding?mode=add) and unlock live on the
  // root route tree, outside this layout, so "Add wallet" is never blocked here.
  useEffect(() => {
    if (!loaded || !wallet) return;
    // No wallets on disk (first run, or last wallet removed).
    if (!wallet.exists) {
      navigate({ to: "/onboarding" });
      return;
    }
    // Locked session must re-authenticate before wallet reads. Replace so unlock
    // doesn't stack as a back target.
    if (wallet.locked) {
      navigate({ to: "/unlock", replace: true });
    }
  }, [loaded, wallet, navigate]);

  // Avoid flashing an empty shell while redirecting.
  if (!loaded || !wallet?.exists || wallet.locked) {
    return null;
  }

  return (
    <AppShell
      active={sectionFor(pathname)}
      wallet={wallet}
      sync={sync}
      switching={switching}
    >
      <Outlet />
    </AppShell>
  );
}