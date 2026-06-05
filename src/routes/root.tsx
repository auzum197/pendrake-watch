import { Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

/**
 * Outermost shell. Intentionally minimal: setup/onboarding renders here without
 * chrome, while the authenticated app supplies its own sidebar via AppLayout.
 */
export function RootLayout() {
  return (
    <>
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </>
  );
}
