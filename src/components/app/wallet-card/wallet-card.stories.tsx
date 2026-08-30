import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, mocked, userEvent, within } from "storybook/test";
import { WalletCard } from "./wallet-card";
import { withRouter } from "@/stories/with-router";
import { listWallets } from "@/lib/ipc";
import type { SyncStatus, WalletState, WalletSummary } from "@/lib/ipc";

const wallet: WalletState = {
  exists: true,
  locked: false,
  sessionHeld: true,
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
    active: true,
  },
  {
    id: "w2",
    label: "Spending",
    fingerprint: "0099aabbccdd",
    network: "mainnet",
    birthdayHeight: 2_390_000,
    active: false,
  },
  {
    id: "w3",
    label: "e4608135",
    fingerprint: "e4608135aabb",
    network: "regtest",
    birthdayHeight: 2_100_000,
    active: false,
  },
  {
    id: "w4",
    label: "Imported",
    fingerprint: "5c17fe902bd1",
    network: "regtest",
    birthdayHeight: 0,
    active: false,
  },
];

const syncing: SyncStatus = {
  state: "syncing",
  syncedHeight: 2_390_000,
  chainTip: 2_400_000,
  percent: 62,
  phase: "scanning",
  etaSeconds: 540,
};

const synced: SyncStatus = {
  state: "idle",
  syncedHeight: 2_400_000,
  chainTip: 2_400_000,
  percent: 100,
};

const meta = {
  component: WalletCard,
  decorators: [
    withRouter,
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
  beforeEach: () => {
    mocked(listWallets).mockResolvedValue(wallets);
  },
  argTypes: {
    wallet: { control: false },
    sync: { control: false },
    walletSyncs: { control: false },
    walletBalances: { control: false },
  },
  args: { wallet, sync: synced },
} satisfies Meta<typeof WalletCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsed: Story = { args: { sync: syncing } };

export const Switcher: Story = {
  args: {
    walletSyncs: { w1: synced, w2: syncing, w3: synced, w4: synced },
    walletBalances: {
      w1: 897_091_655n,
      w3: 12_850_000_000n,
      w4: 320_400_000n,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Switch wallet" }));
    await expect(await canvas.findByText("Spending")).toBeVisible();
  },
};
