import type { Meta, StoryObj } from "@storybook/react-vite";
import { toast } from "sonner";
import { Button } from "../button/button";
import { Toaster } from "./sonner";

const meta = {
  component: Toaster,
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

// The Toaster mounts once at the app root and listens for toasts. The story mounts it
// alongside triggers so the surfaces (mapped onto the app's popover tokens) are visible.
export const Default: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => toast("Wallet synced")}>Message</Button>
      <Button onClick={() => toast.success("Copied to clipboard")}>
        Success
      </Button>
      <Button onClick={() => toast.error("Indexer unreachable")}>Error</Button>
      <Button
        onClick={() =>
          toast("Notifications enabled", {
            action: { label: "Undo", onClick: () => {} },
          })
        }
      >
        With action
      </Button>
      <Toaster />
    </div>
  ),
};
