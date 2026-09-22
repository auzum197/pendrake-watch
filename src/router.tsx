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
  validateSearch: (s: Record<string, unknown>): { mode?: "add" } => ({
    mode: s.mode === "add" ? "add" : undefined,
  }),
  component: OnboardingPage,
});

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
  beforeLoad: () => {
    if (!isEnabled("notes")) throw redirect({ to: "/dashboard" });
  },
  component: NotesPage,
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
    txRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultViewTransition: false,
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}