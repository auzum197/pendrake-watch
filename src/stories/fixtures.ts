import type { BalancePoint } from "@/lib/format";
import type { Tx, WalletNote } from "@/lib/ipc";

// A balance series for BalanceChart. Times are in milliseconds, matching the unit
// the chart reads off the leading point.
export const balanceSeries: BalancePoint[] = [
  { key: "start", t: 1_700_000_000_000, value: 0, label: "" },
  { key: "tx1", t: 1_700_600_000_000, value: 0.5, label: "Nov 21" },
  { key: "tx2", t: 1_701_200_000_000, value: 1.2345, label: "Nov 28" },
];

// A short transaction history for TxList. datetime is in unix seconds, the unit the
// daemon sends and the list formats against.
export const txs: Tx[] = [
  {
    txid: "a1b2c3d4e5f6",
    datetime: 1_701_200_000,
    blockHeight: 2_400_120,
    kind: "received",
    valueZat: "73450000",
    netZat: "73450000",
    status: "confirmed",
    notes: [
      {
        pool: "orchard",
        direction: "received",
        outputIndex: 0,
        valueZat: "73450000",
        memo: "Coffee money",
      },
    ],
  },
  {
    txid: "f6e5d4c3b2a1",
    datetime: 1_701_000_000,
    blockHeight: 2_399_980,
    kind: "sent",
    valueZat: "21000000",
    netZat: "-21010000",
    status: "confirmed",
    notes: [
      {
        pool: "sapling",
        direction: "sent",
        outputIndex: 0,
        valueZat: "21000000",
        recipient: "zs1exampleexampleexample",
      },
      {
        pool: "orchard",
        direction: "received",
        outputIndex: 1,
        valueZat: "1010000",
      },
    ],
  },
  {
    txid: "0099aabbccdd",
    datetime: 1_701_300_000,
    kind: "received",
    valueZat: "5000000",
    netZat: "5000000",
    status: "pending",
    notes: [
      {
        pool: "sapling",
        direction: "received",
        outputIndex: 0,
        valueZat: "5000000",
      },
    ],
  },
];

// Wallet-wide notes for the debug table, one per pool plus the spend and mempool
// edge cases the row renderer switches on: a spent (muted) note with a spentHeight, a
// change note, and an unconfirmed one with a null height that shows the mempool badge.
export const walletNotes: WalletNote[] = [
  {
    idx: 0,
    pool: "orchard",
    valueZat: "73450000",
    status: "unspent",
    height: 2_400_120,
    time: 1_712_000_000,
    txid: "a1b2c3d4e5f6a1b2c3d4",
    change: false,
    spentHeight: null,
    spentTime: null,
  },
  {
    idx: 1,
    pool: "sapling",
    valueZat: "21000000",
    status: "spent",
    height: 2_399_980,
    time: 1_711_989_500,
    txid: "f6e5d4c3b2a1f6e5d4c3",
    change: false,
    spentHeight: 2_400_050,
    spentTime: 1_711_994_750,
  },
  {
    idx: 2,
    pool: "orchard",
    valueZat: "1010000",
    status: "unspent",
    height: 2_400_050,
    time: 1_711_994_750,
    txid: "0099aabbccdd0099aabb",
    change: true,
    spentHeight: null,
    spentTime: null,
  },
  {
    idx: 3,
    pool: "transparent",
    valueZat: "5000000",
    status: "pending",
    height: null,
    time: null,
    txid: "1122334455661122334455",
    change: false,
    spentHeight: null,
    spentTime: null,
  },
];
