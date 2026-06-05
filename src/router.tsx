import {
	createRootRoute,
	createRoute,
	createRouter,
	redirect,
} from "@tanstack/react-router";
import { RootLayout } from "@/routes/root";
import { AppLayout } from "@/routes/app-layout";
import { SetupPage } from "@/routes/setup";
import { LoginPage } from "@/routes/login";
import { DashboardPage } from "@/routes/dashboard";
import { TransactionsPage } from "@/routes/transactions";
import { AccountsPage } from "@/routes/accounts";
import { AccountDetailPage } from "@/routes/account-detail";
import { SettingsPage } from "@/routes/settings";
import { tauri } from "@/lib/tauri";
import type { Pool } from "@/types/wallet";

const rootRoute = createRootRoute({
	component: RootLayout,
});

// "/" forwards into the app; the layout guard decides setup / login / dashboard.
const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	beforeLoad: () => {
		throw redirect({ to: "/dashboard" });
	},
});

// Onboarding. Blocked once a wallet exists.
const setupRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/setup",
	beforeLoad: async () => {
		const status = await tauri.walletStatus();
		if (status.initialized) {
			throw redirect({ to: status.unlocked ? "/dashboard" : "/login" });
		}
	},
	component: SetupPage,
});

// Login. Only reachable when initialized but locked.
const loginRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/login",
	beforeLoad: async () => {
		const status = await tauri.walletStatus();
		if (!status.initialized) throw redirect({ to: "/setup" });
		if (status.unlocked) throw redirect({ to: "/dashboard" });
	},
	component: LoginPage,
});

// Pathless layout: guards the app + renders the persistent sidebar.
const appLayoutRoute = createRoute({
	getParentRoute: () => rootRoute,
	id: "app",
	beforeLoad: async () => {
		const status = await tauri.walletStatus();
		if (!status.initialized) throw redirect({ to: "/setup" });
		if (!status.unlocked) throw redirect({ to: "/login" });
	},
	component: AppLayout,
});

const dashboardRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: "/dashboard",
	component: DashboardPage,
});

const transactionsRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: "/transactions",
	validateSearch: (search: Record<string, unknown>): { pool?: Pool } => {
		const pool = search.pool;
		if (pool === "transparent" || pool === "sapling" || pool === "orchard") {
			return { pool };
		}
		return {};
	},
	component: TransactionsPage,
});

const accountsRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: "/accounts",
	component: AccountsPage,
});

const accountDetailRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: "/accounts/$accountId",
	component: AccountDetailPage,
});

const settingsRoute = createRoute({
	getParentRoute: () => appLayoutRoute,
	path: "/settings",
	component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
	indexRoute,
	setupRoute,
	loginRoute,
	appLayoutRoute.addChildren([
		dashboardRoute,
		transactionsRoute,
		accountsRoute,
		accountDetailRoute,
		settingsRoute,
	]),
]);

// Left-to-right ordering of the top-level app routes (drives view transitions).
const ROUTE_ORDER: Record<string, number> = {
	"/dashboard": 0,
	"/transactions": 1,
	"/accounts": 2,
	"/settings": 3,
};

function routeOrder(pathname: string | undefined): number {
	return ROUTE_ORDER[pathname ?? "/dashboard"] ?? 0;
}

export const router = createRouter({
	routeTree,
	defaultPreload: "intent",
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
