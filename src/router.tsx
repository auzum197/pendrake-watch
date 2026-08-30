import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { isEnabled } from "@/lib/features";
import { RootLayout } from "@/routes/root";
import { AppLayout } from "@/routes/app-layout";
import { StartGate } from "@/routes/start";
import { TxDetailPage } from "@/routes/tx";
import { OnboardingPage } from "@/routes/onboarding";
import { DashboardPage } from "@/routes/dashboard";
import { PoolsPage } from "@/routes/pools";
import { ActivityPage } from "@/routes/activity";
import { NotesPage } from "@/routes/notes";
import { SettingsPage } from "@/routes/settings";
import { UnlockPage } from "@/routes/unlock";

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: StartGate,
});

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding",
  // Sidebar "Add wallet…" uses ?mode=add so import does not wipe existing wallets.
  validateSearch: (s: Record<string, unknown>): { mode?: "add" } => ({
    mode: s.mode === "add" ? "add" : undefined,
  }),
  component: OnboardingPage,
});

// Pathless layout: the signed-in screens share one AppShell instance, mounted
// here so the sidebar persists while only their content swaps.
const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  component: AppLayout,
});

const txRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/tx/$txid",
  component: TxDetailPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const poolsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/pools",
  component: PoolsPage,
});

const activityRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/activity",
  component: ActivityPage,
});

const notesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/notes",
  // Notes is an opt-in experimental feature. With its flag off the screen is gone, not
  // just hidden from the sidebar, so a direct visit or a restored route bounces home.
  beforeLoad: () => {
    if (!isEnabled("notes")) throw redirect({ to: "/dashboard" });
  },
  component: NotesPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: "/settings",
  component: SettingsPage,
});

const unlockRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/unlock",
  component: UnlockPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  onboardingRoute,
  unlockRoute,
  appLayoutRoute.addChildren([
    dashboardRoute,
    poolsRoute,
    activityRoute,
    notesRoute,
    settingsRoute,
    txRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  // No page view-transition crossfade. It snapshots the outgoing page, and capturing
  // a tall virtualized list (the Activity history) stalled every navigation away from
  // it — WebKit rasterizes the full scroll height regardless of paint containment.
  // Screens animate themselves in on mount instead (see lib/motion), which never
  // touches the outgoing DOM, so navigation stays instant whatever the history size.
  defaultViewTransition: false,
  // Restore each route's scroll on back/forward. The app's scroll lives in a
  // nested container (AppShell's <main>, tagged data-scroll-restoration-id), not
  // the window, so returning from a transaction lands the list where it was.
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}