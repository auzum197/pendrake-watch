import { Outlet } from "@tanstack/react-router";
import { Sidebar } from "@/components/layout/sidebar";

/**
 * Layout route for the authenticated app shell: a persistent {@link Sidebar}
 * plus a content area that swaps per route via `<Outlet />`. The wallet-config
 * guard lives on the route definition in `src/router.tsx`.
 */
export function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="page flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
