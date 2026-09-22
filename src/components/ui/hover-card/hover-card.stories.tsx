import type { Meta, StoryObj } from "@storybook/react-vite";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card";
import { Button } from "../button/button";

const meta = {
  component: HoverCard,
} satisfies Meta<typeof HoverCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <HoverCard openDelay={0}>
      <HoverCardTrigger asChild>
        <Button variant="link">orchard</Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-64 text-sm">
        Shielded pool. Outputs here are private and carry an optional memo.
      </HoverCardContent>
    </HoverCard>
  ),
};
