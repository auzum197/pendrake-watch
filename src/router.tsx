import {
	createRootRoute,
	createRoute,
	createRouter,
} from "@tanstack/react-router";
import { RootLayout } from "@/routes/root";
import { HomePage } from "@/routes/home";
import { AboutPage } from "@/routes/about";

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

const routeTree = rootRoute.addChildren([indexRoute, aboutRoute]);

// Left-to-right ordering of the top-level routes
const ROUTE_ORDER: Record<string, number> = {
	"/": 0,
	"/about": 1,
};

function routeOrder(pathname: string | undefined): number {
	return ROUTE_ORDER[pathname ?? "/"] ?? 0;
}

export const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	// Animate route changes via the browser View Transitions API
	defaultViewTransition: {
		types: ({ fromLocation, toLocation }) => {
			const forward =
				routeOrder(toLocation.pathname) >= routeOrder(fromLocation?.pathname);
			return [forward ? "slide-forward" : "slide-back"];
		},
	},
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
