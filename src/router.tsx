import {
	createRootRoute,
	createRoute,
	createRouter,
} from "@tanstack/react-router";
import { RootLayout } from "@/routes/root";
import { HomePage } from "@/routes/home";
import { AboutPage } from "@/routes/about";
import { TxDetailPage } from "@/routes/tx";

const rootRoute = createRootRoute({
	component: RootLayout,
});

const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: HomePage,
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

const routeTree = rootRoute.addChildren([indexRoute, aboutRoute, txRoute]);

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
