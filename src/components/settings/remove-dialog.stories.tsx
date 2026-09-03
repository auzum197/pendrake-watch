import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, mocked, userEvent, within } from "storybook/test";
import { RemoveDialog } from "./remove-dialog";
import { withRouter } from "@/stories/with-router";
import { listWallets, removeWallet, verifyPassphrase } from "@/lib/ipc";

const meta = {
  component: RemoveDialog,
  decorators: [withRouter],
  args: {
    open: true,
    onOpenChange: fn(),
    walletId: "a1b2c3d4e5f6",
    fingerprint: "a1b2c3d4e5f6",
    network: "mainnet",
  },
  beforeEach: () => {
    mocked(verifyPassphrase).mockResolvedValue(false);
    mocked(listWallets).mockResolvedValue([]);
    mocked(removeWallet).mockResolvedValue({
      exists: false,
      locked: false,
      sessionHeld: true,
      fingerprint: null,
      importType: "ufvk",
      viewMode: "full",
      network: "mainnet",
      birthdayHeight: 0,
      indexerUri: "",
      notificationsEnabled: true,
    });
  },
} satisfies Meta<typeof RemoveDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Explain: Story = {};

export const WrongPassphrase: Story = {
  play: async () => {
    const body = within(document.body);
    await userEvent.click(body.getByRole("button", { name: /continue/i }));
    await userEvent.type(
      await body.findByPlaceholderText(/enter your passphrase/i),
      "nope",
    );
    await userEvent.click(body.getByRole("button", { name: /remove wallet/i }));
    await expect(await body.findByText(/doesn't match/i)).toBeVisible();
  },
};
