import type { Row, Wallet } from "../components/dashboard";
import { ACTIVITY, clockLabel, HISTORY, WALLET, type Point } from "./content";

const STEP = 25 * 60;
const LAST = 18.5 * 3600;

export const rows: Row[] = ACTIVITY.map((tx, i) => ({
  ...tx,
  id: -i - 1,
  fresh: false,
}));

export const wallet: Wallet = {
  ...WALLET,
  balance: HISTORY[HISTORY.length - 1].value,
  points: HISTORY,
  rows,
};

export function series(values: number[]): Point[] {
  return values.map((value, i) => {
    const t = LAST - (values.length - 1 - i) * STEP;
    return { t, value, label: clockLabel(t) };
  });
}
