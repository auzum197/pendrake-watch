import type { Meta, StoryObj } from "@storybook/react-vite";
import { AboutCard } from "./about-card";

const meta = {
  component: AboutCard,
} satisfies Meta<typeof AboutCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// The card floats in its own frameless window in the app, so the story sits it on a
// card surface at roughly that window's width.
export const Default: Story = {
  render: () => (
    <div className="mx-auto w-80 rounded-2xl border border-border bg-card py-10">
      <AboutCard />
    </div>
  ),
};
