import { useEffect } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { toast } from "sonner";
import { Button } from "@/components/ui/button/button";
import { Toaster } from "@/components/ui/sonner/sonner";
import { appToast } from "./app-toast";

type Variant = "unreachable" | "wrongChain" | "daemon" | "error"| "wrongChain" | "error" | "success" | "info";

const FIRE: Record<Variant, () => void> = {
  unreachable: () => appToast.unreachable(),
  wrongChain: () => appToast.wrongChain(),
  daemon: () => appToast.daemon("connection to the daemon socket was refused"),
  error: () => appToast.error("Couldn't switch Wallet", "failed to open wallet 33d66daa"),
  success: () => appToast.success("Copied to clipboard"),
  info: () => appToast.info("Notifications enabled"),
};

function Fired({ variant }: { variant: Variant }) {
  useEffect(() => {
    toast.dismiss();
    FIRE[variant]();
    return () => {
      toast.dismiss();
    };
  }, [variant]);
  return <Toaster position="bottom-right" />;
}

const meta = {
  component: Fired,
  args: { variant: "unreachable" },
  argTypes: {
    variant: {
      control: "radio",
      options: ["unreachable", "wrongChain", "daemon", "error", "success", "info"],
    },
  },
  decorators: [
    (Story) => (
      <div className="h-64 w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Fired>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Unreachable: Story = { args: { variant: "unreachable" } };
export const WrongChain: Story = { args: { variant: "wrongChain" } };
export const Daemon: Story = { args: { variant: "daemon" } };
export const ErrorToast: Story = { args: { variant: "error" } };
export const Success: Story = { args: { variant: "success" } };
export const Info: Story = { args: { variant: "info" } };

export const Live: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(FIRE) as Variant[]).map((v) => (
        <Button key={v} onClick={FIRE[v]}>
          {v}
        </Button>
      ))}
      <Toaster position="bottom-right" />
    </div>
  ),
};
