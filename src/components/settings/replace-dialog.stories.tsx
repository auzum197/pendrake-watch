import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, mocked, userEvent, within } from "storybook/test";
import { ReplaceDialog } from "./replace-dialog";
import { withRouter } from "@/stories/with-router";
import { removeWallet, verifyPassphrase } from "@/lib/ipc";

const meta = {
  component: ReplaceDialog,
  decorators: [withRouter],
  args: {
    open: true,
    onOpenChange: fn(),
    fingerprint: "a1b2c3d4e5f6",
    network: "mainnet",
  },
  beforeEach: () => {
    mocked(verifyPassphrase).mockResolvedValue(false);
    mocked(removeWallet).mockResolvedValue();
  },
} satisfies Meta<typeof ReplaceDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// The dialog portals to the document body, so its content is queried there rather
// than inside the story canvas.
export const Explain: Story = {};

export const WrongPassphrase: Story = {
  play: async () => {
    const body = within(document.body);
    await userEvent.click(body.getByRole("button", { name: /continue/i }));
    await userEvent.type(
      await body.findByPlaceholderText(/enter your passphrase/i),
      "nope",
    );
    await userEvent.click(body.getByRole("button", { name: /replace wallet/i }));
    await expect(await body.findByText(/doesn't match/i)).toBeVisible();
  },
};
