import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app/app-shell";
import { useWalletData } from "@/hooks/use-wallet-data";

// The chrome shared by every signed-in screen: the sidebar and the scrollable
// content frame. Mounted once for the whole branch, so the sidebar persists
// across navigations (it never remounts, and the view transition holds it still)
// while only the routed content swaps.
function sectionFor(pathname: string) {
  if (pathname.startsWith("/settings")) return "settings" as const;
  if (pathname.startsWith("/activity") || pathname.startsWith("/tx"))
    return "activity" as const;
  return "wallet" as const;
}

export function AppLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { wallet, sync, loaded } = useWalletData();

  // No wallet means onboarding hasn't run, so none of these screens have anything
  // to show. Guarded once here rather than in each page.
  useEffect(() => {
    if (loaded && wallet && !wallet.exists) navigate({ to: "/onboarding" });
  }, [loaded, wallet, navigate]);

  return (
    <AppShell active={sectionFor(pathname)} wallet={wallet} sync={sync}>
      <Outlet />
    </AppShell>
  );
}
