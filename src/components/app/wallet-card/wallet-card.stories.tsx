import type { Meta, StoryObj } from "@storybook/tanstack-react";
import { expect, mocked, screen, userEvent, waitFor, within } from "storybook/test";
import { WalletCard } from "./wallet-card";
import { withRouter } from "@/stories/with-router";
import { listWallets, setWalletLabel } from "@/lib/ipc";
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
    notificationsEnabled: true,
    indexerUri: "https://zec.rocks:443",
  },
  {
    id: "w2",
    label: "Spending",
    fingerprint: "0099aabbccdd",
    network: "mainnet",
    birthdayHeight: 2_390_000,
    selected: false,
    lastBalance: "89709165",
    notificationsEnabled: true,
    indexerUri: "https://zec.rocks:443",
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
    notificationsEnabled: true,
    indexerUri: "https://zec.rocks:443",
  },
  {
    id: "w4",
    label: "Imported",
    fingerprint: "5c17fe902bd1",
    network: "regtest",
    birthdayHeight: 0,
    selected: false,
    lastBalance: "320400000",
    notificationsEnabled: true,
    indexerUri: "https://zec.rocks:443",
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
    mocked(setWalletLabel).mockResolvedValue(wallet);
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

async function unfold(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  await userEvent.click(canvas.getByRole("button", { name: "Switch wallet" }));
  await waitFor(() => expect(canvas.getByText("Spending")).toBeVisible());
  return canvas;
}

// The ⋯ on a row's LifeHash opens the menu beside the mark.
export const RowMenu: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await unfold(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Spending actions" }));
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: "Rename…" })).toBeVisible(),
    );
    await expect(screen.getByRole("menuitem", { name: "Use" })).toBeEnabled();
  },
};

// The head's menu offers the same items minus Use: the wallet in use has
// nothing to switch to.
export const HeadMenu: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Cold storage actions" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: "Rename…" })).toBeVisible(),
    );
    expect(screen.queryByRole("menuitem", { name: "Use" })).toBeNull();
  },
};

// Rename… turns the row's name into a field in place, and the field takes
// focus once the menu has gone.
export const RenamingRow: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await unfold(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Spending actions" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Rename…" }));
    const field = await canvas.findByRole("textbox", { name: "Wallet name" });
    await expect(field).toHaveValue("Spending");
    await waitFor(() => expect(field).toHaveFocus());
  },
};

// Right-click on a row opens the same menu, and Rename… focuses the field.
export const RenamingRowFromContextMenu: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await unfold(canvasElement);
    await userEvent.pointer({ keys: "[MouseRight]", target: canvas.getByText("Spending") });
    await userEvent.click(await screen.findByRole("menuitem", { name: "Rename…" }));
    const field = await canvas.findByRole("textbox", { name: "Wallet name" });
    await expect(field).toHaveValue("Spending");
    await waitFor(() => expect(field).toHaveFocus());
  },
};

// Right-click on the head renames the wallet in use, in place.
export const RenamingHeadFromContextMenu: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.pointer({
      keys: "[MouseRight]",
      target: canvas.getByRole("button", { name: "Switch wallet" }),
    });
    await userEvent.click(await screen.findByRole("menuitem", { name: "Rename…" }));
    const field = await canvas.findByRole("textbox", { name: "Wallet name" });
    await expect(field).toHaveValue("Cold storage");
    await waitFor(() => expect(field).toHaveFocus());
  },
};

export const RenameCommits: Story = {
  play: async ({ canvasElement }) => {
    const canvas = await unfold(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Spending actions" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Rename…" }));
    const field = await canvas.findByRole("textbox", { name: "Wallet name" });
    await userEvent.clear(field);
    await userEvent.type(field, "Everyday{Enter}");
    await waitFor(() =>
      expect(mocked(setWalletLabel)).toHaveBeenCalledWith("w2", "Everyday"),
    );
  },
};
