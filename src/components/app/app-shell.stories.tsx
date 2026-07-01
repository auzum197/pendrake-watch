import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppShell } from "./app-shell";
import { withRouter } from "@/stories/with-router";
import type { SyncStatus, WalletState } from "@/lib/ipc";

const wallet: WalletState = {
  exists: true,
  locked: false,
  sessionHeld: true,
  fingerprint: "a1b2c3d4e5f6",
  importType: "ufvk",
  viewMode: "full",
  network: "mainnet",
  birthdayHeight: 419_200,
  indexerUri: "https://zec.rocks:443",
  notificationsEnabled: true,
};

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

const Placeholder = () => (
  <div className="flex flex-col gap-2">
    <h1 className="font-heading text-2xl font-semibold">Home</h1>
    <p className="text-muted-foreground">The routed screen renders here.</p>
  </div>
);

const meta = {
  component: AppShell,
  decorators: [withRouter],
  parameters: { layout: "fullscreen" },
  args: { active: "wallet", wallet, sync: syncing, children: <Placeholder /> },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Syncing: Story = {};
export const Synced: Story = { args: { sync: synced } };
export const Unreachable: Story = {
  args: { sync: { ...synced, state: "error", unreachable: true } },
};
export const NoWallet: Story = {
  args: { wallet: null, sync: null },
};
