import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { expect, fn, mocked, userEvent, within } from "storybook/test";
import { exportUfvk, type SyncStatus, type WalletSummary } from "@/lib/ipc";
import { withRouter } from "@/stories/with-router";
import { WalletsPanel } from "./wallets-panel";

const SYNCED: SyncStatus = {
  state: "idle",
  syncedHeight: 2_400_000,
  chainTip: 2_400_000,
  percent: 100,
  lastSyncedAt: 1_700_000_000,
};

const WALLETS: WalletSummary[] = [
  {
    id: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
    label: "Cold storage",
    fingerprint: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
    network: "mainnet",
    birthdayHeight: 419_200,
    selected: true,
    lastBalance: "897091655",
    sync: SYNCED,
    notificationsEnabled: true,
    indexerUri: "https://zec.rocks:443",
  },
  {
    id: "9f8e7d6c5b4a39281706f5e4d3c2b1a0",
    label: "9f8e7d6c",
    fingerprint: "9f8e7d6c5b4a39281706f5e4d3c2b1a0",
    network: "mainnet",
    birthdayHeight: 2_100_000,
    selected: false,
    lastBalance: "1200000",
    sync: { ...SYNCED, state: "syncing", percent: 37 },
    notificationsEnabled: false,
    indexerUri: "https://na.zec.rocks:443",
  },
  {
    id: "0011223344556677889900aabbccddee",
    label: "Regtest bench",
    fingerprint: "0011223344556677889900aabbccddee",
    network: "regtest",
    birthdayHeight: 1,
    selected: false,
    lastBalance: null,
    unavailable: "wallet file could not be read",
    notificationsEnabled: true,
    indexerUri: "http://127.0.0.1:9067",
  },
];

const meta = {
  component: WalletsPanel,
  decorators: [withRouter],
  args: { wallets: WALLETS, focusWallet: null, refresh: fn() },
  beforeEach: () => {
    mocked(exportUfvk).mockResolvedValue("uview1qqqqqqqqqqqqqqqq");
  },
} satisfies Meta<typeof WalletsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FocusedWallet: Story = {
  args: { focusWallet: WALLETS[2].id },
};

export const PickAnother: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("option", { name: /regtest bench/i }),
    );
    await expect(
      await canvas.findByRole("button", { name: /use this wallet/i }),
    ).toBeVisible();
  },
};
