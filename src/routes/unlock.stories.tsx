import type { Meta, StoryObj } from "@storybook/react-vite";
import { mocked } from "storybook/test";
import { withRouter } from "@/stories/with-router";
import { unlock } from "@/lib/ipc";
import { UnlockPage } from "./unlock";

const meta = {
  title: "App/Unlock",
  component: UnlockPage,
  decorators: [withRouter],
  parameters: { layout: "fullscreen" },
  beforeEach: () => {
    mocked(unlock).mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 800));
      throw new Error("wrong passphrase");
    });
  },
} satisfies Meta<typeof UnlockPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Locked: Story = {};
