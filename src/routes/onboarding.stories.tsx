import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, mocked, userEvent, waitFor, within } from "storybook/test";
import { withRouter } from "@/stories/with-router";
import {
  getWalletState,
  importUfvk,
  parseUfvk,
  type WalletState,
} from "@/lib/ipc";
import { OnboardingPage } from "./onboarding";

const SAMPLE_KEY =
  "uview1tdhy368u2w3glvytsj8am6fxxr2p5mdr5qgygvrm6mqecz04ta2fc9405hyhgp20gcc0e509qnmrga4xddyfpan2eky7vhv7dqpw4t4pqal2e42pl9y6jc2vu0u77ckcvx55u050f5qt0e48h7dzwmhfa3d3px3g3eh7fy6se83gk6twwdelvetnearnkru57x88rfc6j2tnq3rnmzy4h6fhw260s4h2s5xq6qr9c8slcaw88z8c0h7zzr4jvwcq8kww4f2tvghc0lka2g9nr4v27jskku2r72y3nsvd9tzkjgklyhg55j3j35ma7epqptawh4xzfpud260w7sw6gl3l8quspdwlyr8azvyvkz847yk8qegft2lyzk950ljjk7j7clpk23h3hhj8ctjzvk629drygucg6ax9k46fuw9x79p8a69tmthw8yh39v0fr6zvtx5r8khajznnhw3j8h068vlgrcpqtzz963jqmvlrahdfz8vccw57";

const cold: WalletState = {
  exists: false,
  locked: false,
  sessionHeld: false,
  fingerprint: "",
  importType: "ufvk",
  viewMode: "full",
  network: "mainnet",
  birthdayHeight: 0,
  indexerUri: "",
  notificationsEnabled: true,
};

const meta = {
  title: "App/Onboarding",
  component: OnboardingPage,
  decorators: [withRouter],
  parameters: { layout: "fullscreen" },
  beforeEach: () => {
    mocked(getWalletState).mockResolvedValue(cold);
    mocked(parseUfvk).mockImplementation(async (ufvk) => {
      await new Promise((r) => setTimeout(r, 600));
      const key = ufvk.trim();
      if (key.length < 8) return { kind: "malformed", reason: "too short" };
      if (key.startsWith("uviewtest")) return { kind: "testnet" };
      return {
        kind: "valid",
        network: key.startsWith("uviewregtest") ? "regtest" : "mainnet",
        fingerprint: "b7e2c91a4f03d6e8",
        pools: ["orchard", "sapling", "transparent"],
      };
    });
    mocked(importUfvk).mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 1400));
      throw new Error("Storybook: the import is stubbed here.");
    });
  },
} satisfies Meta<typeof OnboardingPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstRun: Story = {};

export const Folded: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByPlaceholderText("your ufvk..."));
    await userEvent.paste(SAMPLE_KEY);
    await waitFor(
      () =>
        expect(
          canvas.getByRole("button", { name: /uview1tdhy/ }),
        ).toBeVisible(),
      { timeout: 3000 },
    );
  },
};

export const Malformed: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByPlaceholderText("your ufvk..."));
    await userEvent.paste("abc");
    await waitFor(
      () => expect(canvas.getByText(/Not a valid UFVK/)).toBeVisible(),
      { timeout: 3000 },
    );
    await expect(
      canvas.queryByRole("button", { name: /abc/ }),
    ).not.toBeInTheDocument();
  },
};
