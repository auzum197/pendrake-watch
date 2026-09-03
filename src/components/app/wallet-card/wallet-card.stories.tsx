import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, mocked, userEvent, waitFor, within } from "storybook/test";
import { WalletCard } from "./wallet-card";
import { withRouter } from "@/stories/with-router";
import { listWallets } from "@/lib/ipc";
import type { WalletState, WalletSummary } from "@/lib/ipc";

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
    label: "e4608135",
    fingerprint: "e4608135aabb",
    network: "regtest",
    birthdayHeight: 2_100_000,
    selected: false,
    lastBalance: "12850000000",
  },
  {
    id: "w4",
    label: "Imported",
    fingerprint: "5c17fe902bd1",
    network: "regtest",
    birthdayHeight: 0,
    selected: false,
    lastBalance: "320400000",
    unavailable: "wallet file could not be read",
  },
];

const meta = {
  component: WalletCard,
  decorators: [
    withRouter,
    (Story) => (
      <div className="flex h-[420px] w-64 flex-col bg-ink px-3 pt-4 text-white">
        <Story />
        <nav className="mt-5 flex flex-col gap-1">
          <span className="rounded-lg bg-brand px-3 py-2 text-sm font-bold text-ink">Home</span>
          <span className="px-3 py-2 text-sm font-medium text-white/55">Activity</span>
          <span className="px-3 py-2 text-sm font-medium text-white/55">Notes</span>
        </nav>
      </div>
    ),
  ],
  beforeEach: () => {
    mocked(listWallets).mockResolvedValue(wallets);
  },
  argTypes: {
    wallet: { control: false },
    switching: { control: "boolean" },
  },
  args: { wallet, switching: false },
} satisfies Meta<typeof WalletCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsed: Story = {};

export const Unfolded: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Switch wallet" }));
    await waitFor(() => expect(canvas.getByText("Spending")).toBeVisible());
  },
};

export const Switching: Story = { args: { switching: true } };
