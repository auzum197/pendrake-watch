import {
	createRootRoute,
	createRoute,
	createRouter,
} from "@tanstack/react-router";
import { RootLayout } from "@/routes/root";
import { StartGate } from "@/routes/start";
import { AboutPage } from "@/routes/about";
import { TxDetailPage } from "@/routes/tx";
import { OnboardingPage } from "@/routes/onboarding";
import { DashboardPage } from "@/routes/dashboard";
import { ActivityPage } from "@/routes/activity";
import { UnlockPage } from "@/routes/unlock";

const rootRoute = createRootRoute({
	component: RootLayout,
});

const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: StartGate,
});

const aboutRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/about",
	component: AboutPage,
});

const txRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/tx/$txid",
	component: TxDetailPage,
});

const onboardingRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/onboarding",
	component: OnboardingPage,
});

const dashboardRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/dashboard",
	component: DashboardPage,
});

const activityRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/activity",
	component: ActivityPage,
});

const unlockRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/unlock",
	component: UnlockPage,
});

const routeTree = rootRoute.addChildren([
	indexRoute,
	aboutRoute,
	txRoute,
	onboardingRoute,
	dashboardRoute,
	activityRoute,
	unlockRoute,
]);

export const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	defaultViewTransition: true,
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
