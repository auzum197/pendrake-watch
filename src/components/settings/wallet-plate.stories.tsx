import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, mocked, userEvent, within } from "storybook/test";
import {
  exportUfvk,
  rescanWallet,
  setNotifications,
  setWalletLabel,
  type SyncStatus,
  type WalletState,
  type WalletSummary,
} from "@/lib/ipc";
import { withRouter } from "@/stories/with-router";
import { WalletPlate } from "./wallet-plate";

const FINGERPRINT = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6";

const UFVK = `uview1${"qpzry9x8gf2tvdw0s3jn54khce6mua7l".repeat(8)}`;

const SYNCED: SyncStatus = {
  state: "idle",
  syncedHeight: 2_400_000,
  chainTip: 2_400_000,
  percent: 100,
  lastSyncedAt: 1_700_000_000,
};

const WALLET: WalletSummary = {
  id: FINGERPRINT,
  label: "Cold storage",
  fingerprint: FINGERPRINT,
  network: "mainnet",
  birthdayHeight: 419_200,
  selected: true,
  lastBalance: "897091655",
  sync: SYNCED,
  notificationsEnabled: true,
  indexerUri: "https://zec.rocks:443",
};

const STATE: WalletState = {
  exists: true,
  locked: false,
  sessionHeld: true,
  walletId: FINGERPRINT,
  fingerprint: FINGERPRINT,
  importType: "ufvk",
  viewMode: "full",
  network: "mainnet",
  birthdayHeight: 419_200,
  indexerUri: "https://zec.rocks:443",
  notificationsEnabled: true,
};

const meta = {
  component: WalletPlate,
  decorators: [withRouter],
  args: { wallet: WALLET, onChanged: fn() },
  beforeEach: () => {
    mocked(exportUfvk).mockResolvedValue(UFVK);
    mocked(setWalletLabel).mockResolvedValue(STATE);
    mocked(setNotifications).mockResolvedValue(STATE);
    mocked(rescanWallet).mockResolvedValue(STATE);
  },
} satisfies Meta<typeof WalletPlate>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Selected: Story = {};

export const Other: Story = {
  args: {
    wallet: {
      ...WALLET,
      label: FINGERPRINT.slice(0, 8),
      selected: false,
      sync: { ...SYNCED, state: "syncing", percent: 42 },
    },
  },
};

export const Unavailable: Story = {
  args: {
    wallet: {
      ...WALLET,
      selected: false,
      sync: undefined,
      unavailable: "wallet file could not be read",
    },
  },
};

export const Rename: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: /cold storage/i }),
    );
    const field = await canvas.findByRole("textbox", { name: /wallet name/i });
    await userEvent.clear(field);
    await userEvent.type(field, "Rainy day{enter}");
    await expect(mocked(setWalletLabel)).toHaveBeenCalledWith(
      FINGERPRINT,
      "Rainy day",
    );
  },
};

export const Rescan: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /rescan…/i }));
    const dialog = within(
      await within(document.body).findByRole("alertdialog"),
    );
    await expect(dialog.getByText(/from block 419,200/i)).toBeVisible();
    await userEvent.click(dialog.getByRole("button", { name: /^rescan$/i }));
    await expect(mocked(rescanWallet)).toHaveBeenCalledWith(FINGERPRINT);
    await expect(args.onChanged).toHaveBeenCalled();
  },
};

export const UnlockViewingKey: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /show…/i }));
    await userEvent.type(
      await canvas.findByPlaceholderText("Passphrase"),
      "hunter2{enter}",
    );
    await expect(
      await canvas.findByRole("button", { name: /hide/i }),
    ).toBeVisible();
    await expect(canvas.getByText(/^uview1$/)).toBeVisible();
  },
};

export const WrongPassphrase: Story = {
  beforeEach: () => {
    mocked(exportUfvk).mockRejectedValue(new Error("wrong passphrase"));
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /show…/i }));
    await userEvent.type(
      await canvas.findByPlaceholderText("Passphrase"),
      "nope{enter}",
    );
    await expect(await canvas.findByText(/doesn't match/i)).toBeVisible();
  },
};
