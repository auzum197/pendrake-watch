import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { useState } from "react";
import { HoldButton } from "./hold-button";

const meta = {
  component: HoldButton,
  args: { onConfirm: fn(), children: "Hold to confirm" },
} satisfies Meta<typeof HoldButton>;

export default meta;
type Story = StoryObj<typeof meta>;

// Press and hold to confirm. A single click can't fire it; release early and the fill
// resets. The story reports the confirm so the gesture is observable.
export const Default: Story = {
  render: () => {
    const [confirmed, setConfirmed] = useState(0);
    return (
      <div className="flex w-72 flex-col gap-3">
        <HoldButton onConfirm={() => setConfirmed((n) => n + 1)}>
          Hold to remove wallet
        </HoldButton>
        <p className="text-sm text-muted-foreground">
          Confirmed {confirmed} time{confirmed === 1 ? "" : "s"}
        </p>
      </div>
    );
  },
};

// A shorter hold, so the confirm lands quickly under a press.
export const Quick: Story = {
  render: () => (
    <div className="w-72">
      <HoldButton durationMs={600} onConfirm={() => {}}>
        Hold to delete
      </HoldButton>
    </div>
  ),
};
