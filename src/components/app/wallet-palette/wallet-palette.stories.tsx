import { useEffect } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, mocked, userEvent, waitFor, within } from "storybook/test";
import { withRouter } from "@/stories/with-router";
import { listWallets, type WalletState, type WalletSummary } from "@/lib/ipc";
import { openWalletPalette } from "@/lib/wallet-palette";
import { WalletPalette } from "./wallet-palette";

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

const wallets: WalletSummary[] = [
  {
    id: "w1",
    label: "Cold storage",
    fingerprint: "a1b2c3d4e5f6",
    network: "mainnet",
    birthdayHeight: 419_200,
    selected: true,
    lastBalance: "897091655",
  },
  {
    id: "w2",
    label: "Spending",
    fingerprint: "0099aabbccdd",
    network: "mainnet",
    birthdayHeight: 2_390_000,
    selected: false,
    lastBalance: "89709165",
    sync: {
      state: "syncing",
      syncedHeight: 2_100_000,
      chainTip: 2_400_000,
      percent: 12,
      phase: "scanning",
    },
  },
  {
    id: "w3",
    label: "Exchange",
    fingerprint: "77aa11bb22cc",
    network: "mainnet",
    birthdayHeight: 2_000_000,
    selected: false,
    lastBalance: "320400000",
  },
];

function Open() {
  useEffect(() => {
    openWalletPalette();
  }, []);
  return <WalletPalette wallet={wallet} />;
}

const meta = {
  title: "App/WalletPalette",
  component: Open,
  decorators: [withRouter],
  beforeEach: () => {
    mocked(listWallets).mockResolvedValue(wallets);
  },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Open>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filtered: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByText("Exchange")).toBeVisible());
    await userEvent.type(canvas.getByPlaceholderText("Switch wallet…"), "ex");
    await expect(canvas.queryByText("Spending")).toBeNull();
  },
};
