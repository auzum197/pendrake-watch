import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { useState } from "react";
import { Button } from "@/components/ui/button/button";
import { FiatConsentDialog } from "./fiat-consent-dialog";

const meta = {
  component: FiatConsentDialog,
  args: { open: true, onOpenChange: fn(), onAccept: fn() },
} satisfies Meta<typeof FiatConsentDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// The consent modal, driven by a trigger so the open/close and the accept flow are
// exercisable. onAccept resolves after a beat to show the "Enabling…" busy state.
export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Show balances in USD</Button>
        <FiatConsentDialog
          open={open}
          onOpenChange={setOpen}
          onAccept={() =>
            new Promise((resolve) => setTimeout(resolve, 800))
          }
        />
      </>
    );
  },
};

// Opened by default, so the dialog is the first thing on the canvas.
export const Open: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <FiatConsentDialog
        open={open}
        onOpenChange={setOpen}
        onAccept={async () => {}}
      />
    );
  },
};
