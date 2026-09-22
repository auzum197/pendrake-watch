import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BalanceChart, type Denom } from "./BalanceChart";
import type { BalancePoint } from "@/lib/format";


type WalletStyle = "hodl" | "trader" | "dust" | "whale";

type PlaygroundProps = {
	transactions: number;
	years: number;
	style: WalletStyle;
	seed: number;
	denom: Denom;
};

const END = Date.UTC(2026, 0, 15) / 1000;
const DAY = 86_400;

function mulberry32(seed: number) {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function label(t: number, spanDays: number): string {
	return new Date(t * 1000).toLocaleDateString(undefined, {
		month: "short",
		...(spanDays > 540 ? { year: "numeric" } : { day: "numeric" }),
	});
}

function delta(style: WalletStyle, balance: number, r: () => number): number {
	switch (style) {
		case "hodl":
			return r() < 0.85
				? r() * r() * 2 + 0.05
				: -Math.min(balance * r() * 0.3, balance);
		case "trader":
			return r() < 0.5
				? r() * 4 + 0.1
				: -Math.min(balance * (0.1 + r() * 0.5), balance);
		case "dust":
			return r() < 0.97 ? 0.0001 + r() * 0.01 : r() * 0.5;
		case "whale":
			return r() < 0.7
				? 100 + r() * r() * 4_900
				: -Math.min(balance * (0.2 + r() * 0.6), balance);
	}
}

function zecSeries({
	transactions,
	years,
	style,
	seed,
}: Omit<PlaygroundProps, "denom">): BalancePoint[] {
	const r = mulberry32(seed);
	const span = years * 365 * DAY;
	const t0 = END - span;
	const spanDays = span / DAY;

	const times = Array.from({ length: transactions }, () => t0 + r() * span).sort(
		(a, b) => a - b,
	);

	let balance = 0;
	let height = 2_000_000;
	const points: BalancePoint[] = [
		{ key: "start", t: t0 - span * 0.03, value: 0, label: "" },
	];
	times.forEach((t, i) => {
		balance = Math.max(0, balance + delta(style, balance, r));
		height += 50 + Math.floor(r() * 4_000);
		points.push({
			key: `tx-${i}`,
			t,
			value: balance,
			label: label(t, spanDays),
			height,
		});
	});
	return points;
}

function usdSeries(zec: BalancePoint[], seed: number): BalancePoint[] {
	const r = mulberry32(seed ^ 0x9e3779b9);
	const t0 = zec[0].t;
	const span = zec[zec.length - 1].t - t0;
	const spanDays = span / DAY;
	const samples = Math.min(260, Math.max(60, Math.round(spanDays)));

	let price = 30 + r() * 20;
	let txIdx = 1;
	let held = 0;
	const points: BalancePoint[] = [];
	for (let i = 0; i <= samples; i++) {
		const t = t0 + (span * i) / samples;
		price = Math.max(5, price * (1 + (r() - 0.485) * 0.06));
		let jump = 0;
		while (txIdx < zec.length && zec[txIdx].t <= t) {
			jump += Math.abs(zec[txIdx].value - held) * price;
			held = zec[txIdx].value;
			txIdx++;
		}
		points.push({
			key: `d-${i}`,
			t,
			value: held * price,
			label: label(t, spanDays),
			zec: held,
			change: jump > 0,
			jump,
		});
	}
	return points;
}

function ChartPlayground({ denom, ...gen }: PlaygroundProps) {
	const points = useMemo(() => {
		const zec = zecSeries(gen);
		return denom === "usd" ? usdSeries(zec, gen.seed) : zec;
	}, [denom, gen.transactions, gen.years, gen.style, gen.seed]); // eslint-disable-line react-hooks/exhaustive-deps
	return <BalanceChart points={points} denom={denom} />;
}

const meta = {
	component: ChartPlayground,
	decorators: [
		(Story) => (
			<div className="w-[900px] rounded-2xl border border-border bg-card p-6">
				<Story />
			</div>
		),
	],
	argTypes: {
		transactions: {
			control: { type: "range", min: 1, max: 2000, step: 1 },
		},
		years: {
			control: { type: "range", min: 0.25, max: 8, step: 0.25 },
		},
		style: {
			control: "select",
			options: ["hodl", "trader", "dust", "whale"],
		},
		seed: { control: { type: "number", min: 1 } },
		denom: { control: "radio", options: ["zec", "usd"] },
	},
	args: {
		transactions: 40,
		years: 1,
		style: "hodl",
		seed: 7,
		denom: "zec",
	},
} satisfies Meta<typeof ChartPlayground>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const MultiYear: Story = {
	args: { transactions: 350, years: 5 },
};

export const DenseHistory: Story = {
	args: { transactions: 2000, years: 3, style: "trader" },
};

export const Whale: Story = {
	args: { transactions: 40, years: 8, style: "whale", seed: 3 },
};

export const DustStorm: Story = {
	args: { transactions: 600, years: 1, style: "dust" },
};

export const Trader: Story = {
	args: { transactions: 150, years: 1, style: "trader" },
};

export const FirstTransaction: Story = {
	args: { transactions: 1, years: 0.25 },
};

export const UsdMultiYear: Story = {
	args: { transactions: 200, years: 4, denom: "usd" },
};
