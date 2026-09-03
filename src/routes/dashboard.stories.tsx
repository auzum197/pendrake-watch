import { useEffect } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, mocked, userEvent, waitFor, within } from "storybook/test";
import { withRouter } from "@/stories/with-router";
import { txs as fewTxs } from "@/stories/fixtures";
import { hydrateDiscreet } from "@/lib/discreet";
import {
	getPriceHistory,
	getSpotPrice,
	onSyncEvent,
	setDiscreet,
	setFiatEnabled,
	type Balance,
	type PricePoint,
	type PriceSpot,
	type SyncStatus,
	type Tx,
	type WalletState,
} from "@/lib/ipc";
import { DashboardView } from "./dashboard";

const wallet: WalletState = {
	exists: true,
	locked: false,
	sessionHeld: true,
	walletId: "w1",
	fingerprint: "a1b2c3d4e5f6",
	label: "Cold storage",
	importType: "ufvk",
	viewMode: "full",
	network: "mainnet",
	birthdayHeight: 419_200,
	indexerUri: "https://zec.rocks:443",
	notificationsEnabled: true,
};

const DAY = 86_400;
const now = Math.floor(Date.now() / 1000);

const SYNC: Record<Exclude<SyncKind, "closed">, SyncStatus> = {
	syncing: {
		state: "syncing",
		syncedHeight: 2_390_000,
		chainTip: 2_400_000,
		percent: 62,
		phase: "scanning",
		etaSeconds: 540,
	},
	synced: {
		state: "idle",
		syncedHeight: 2_400_000,
		chainTip: 2_400_000,
		percent: 100,
		lastSyncedAt: now,
	},
	unreachable: {
		state: "error",
		syncedHeight: 2_390_000,
		chainTip: 2_400_000,
		percent: 62,
		error: "connection refused",
		unreachable: true,
	},
	wrongChain: {
		state: "error",
		syncedHeight: 2_390_000,
		chainTip: 2_400_000,
		percent: 62,
		error: "anchor not found",
		wrongChain: true,
	},
	syncError: {
		state: "error",
		syncedHeight: 2_390_000,
		chainTip: 2_400_000,
		percent: 62,
		error: "scan failed: bad block",
	},
};

const BALANCE: Record<Exclude<BalanceKind, "loading">, Balance> = {
	empty: { orchard: { confirmed: "0", total: "0" } },
	small: { orchard: { confirmed: "123450000", total: "123450000" } },
	large: {
		orchard: { confirmed: "12000000000", total: "12000000000" },
		sapling: { confirmed: "998184475", total: "998184475" },
	},
};

function yearOfTxs(): Tx[] {
	const list: Tx[] = [];
	for (let i = 0; i < 40; i++) {
		const kind = i % 3 === 2 ? "sent" : "received";
		const value = String(50_000_000 + ((i * 7_919_000) % 800_000_000));
		list.push({
			txid: `${i.toString(16).padStart(4, "0")}b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6`,
			datetime: now - (i * 9 + 1) * DAY,
			blockHeight: 2_400_000 - i * 10_000,
			kind,
			valueZat: value,
			netZat: kind === "sent" ? `-${value}` : value,
			status: "confirmed",
			notes: [{ pool: "orchard", direction: kind, outputIndex: 0, valueZat: value }],
		});
	}
	return [
		{
			txid: "ffffaabbccdd",
			datetime: now - 600,
			kind: "received",
			valueZat: "5000000",
			netZat: "5000000",
			status: "pending",
			notes: [{ pool: "orchard", direction: "received", outputIndex: 0, valueZat: "5000000" }],
		},
		...list,
	];
}

const HISTORY: Record<HistoryKind, Tx[]> = {
	none: [],
	few: fewTxs,
	year: yearOfTxs(),
};

function priceHistory(): PricePoint[] {
	const points: PricePoint[] = [];
	for (let d = 400; d >= 0; d--) {
		const date = new Date((now - d * DAY) * 1000).toISOString().slice(0, 10);
		points.push({
			date,
			usdPerZec: 30 + 12 * Math.sin(d / 40) + d / 50,
			confidence: d % 50 === 0 ? "low" : "high",
		});
	}
	return points;
}

const SPOT: Record<Exclude<PriceKind, "none">, PriceSpot> = {
	fresh: { usdPerZec: 41.37, fetchedAt: now - 20, sources: ["coingecko", "kraken"] },
	stale: {
		usdPerZec: 41.37,
		fetchedAt: now - 3 * 3600,
		sources: ["coingecko"],
		stale: true,
	},
};

type SyncKind = "syncing" | "synced" | "unreachable" | "wrongChain" | "syncError" | "closed";
type BalanceKind = "loading" | "empty" | "small" | "large";
type HistoryKind = "none" | "few" | "year";
type PriceKind = "none" | "fresh" | "stale";

type HomeArgs = {
	switching: boolean;
	sync: SyncKind;
	syncPercent: number;
	balance: BalanceKind;
	history: HistoryKind;
	fiatEnabled: boolean;
	price: PriceKind;
	discreet: boolean;
};

function Home(args: HomeArgs) {
	useEffect(() => {
		hydrateDiscreet(args.discreet);
		return () => hydrateDiscreet(false);
	}, [args.discreet]);

	const sync =
		args.sync === "closed"
			? null
			: args.sync === "syncing"
				? { ...SYNC.syncing, percent: args.syncPercent }
				: SYNC[args.sync];
	return (
		<div className="flex flex-col gap-6">
			<DashboardView
				wallet={{ ...wallet, fiatEnabled: args.fiatEnabled }}
				balance={args.balance === "loading" ? null : BALANCE[args.balance]}
				txs={HISTORY[args.history]}
				sync={sync}
				switching={args.switching}
			/>
		</div>
	);
}

const meta = {
	title: "App/Home",
	component: Home,
	decorators: [withRouter],
	parameters: { layout: "padded" },
	beforeEach: ({ args }) => {
		mocked(onSyncEvent).mockResolvedValue(() => {});
		mocked(setDiscreet).mockResolvedValue(wallet);
		mocked(setFiatEnabled).mockResolvedValue({ ...wallet, fiatEnabled: true });
		mocked(getSpotPrice).mockResolvedValue(args.price === "none" ? null : SPOT[args.price]);
		mocked(getPriceHistory).mockResolvedValue(args.price === "none" ? [] : priceHistory());
	},
	argTypes: {
		switching: { control: "boolean", description: "Another Wallet is being selected" },
		sync: {
			control: "select",
			options: ["syncing", "synced", "unreachable", "wrongChain", "syncError", "closed"],
		},
		syncPercent: {
			control: { type: "range", min: 0, max: 100, step: 1 },
			if: { arg: "sync", eq: "syncing" },
		},
		balance: { control: "select", options: ["loading", "empty", "small", "large"] },
		history: { control: "select", options: ["none", "few", "year"] },
		fiatEnabled: { control: "boolean", description: "USD consent already given" },
		price: { control: "select", options: ["none", "fresh", "stale"] },
		discreet: { control: "boolean" },
	},
	args: {
		switching: false,
		sync: "synced",
		syncPercent: 62,
		balance: "small",
		history: "few",
		fiatEnabled: false,
		price: "none",
		discreet: false,
	},
} satisfies Meta<typeof Home>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Synced: Story = {};

export const Syncing: Story = { args: { sync: "syncing" } };

export const Unreachable: Story = { args: { sync: "unreachable" } };

export const WrongChain: Story = { args: { sync: "wrongChain" } };

export const SyncError: Story = { args: { sync: "syncError" } };

export const Loading: Story = {
	args: { sync: "closed", balance: "loading", history: "none" },
};

export const Empty: Story = { args: { balance: "empty", history: "none" } };

export const Switching: Story = { args: { switching: true } };

export const LongHistory: Story = { args: { balance: "large", history: "year" } };

export const Discreet: Story = { args: { discreet: true } };

export const Usd: Story = {
	args: { fiatEnabled: true, price: "fresh", balance: "large", history: "year" },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole("button", { name: "USD" }));
		await waitFor(() => expect(canvas.getByText("updated just now")).toBeVisible());
	},
};

export const UsdStale: Story = {
	args: { fiatEnabled: true, price: "stale", balance: "large", history: "year" },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole("button", { name: "USD" }));
		await waitFor(() => expect(canvas.getByText("updated 3h ago")).toBeVisible());
	},
};

export const UsdConsent: Story = {
	args: { fiatEnabled: false, price: "fresh", history: "year" },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole("button", { name: "USD" }));
		await waitFor(() =>
			expect(within(document.body).getByText("Show balances in USD?")).toBeVisible(),
		);
	},
};
