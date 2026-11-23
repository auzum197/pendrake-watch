import type { Meta, StoryObj } from "@storybook/react-vite";
import { NavItem } from "./window";

const meta = {
  component: NavItem,
  args: { icon: "home", label: "Home" },
  decorators: [
    (Story) => (
      <div className="frame-nav bg-ink p-3 text-white" style={{ width: 258 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NavItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Inactive: Story = {};

export const Active: Story = { args: { active: true } };

export const Sidebar: Story = {
  render: () => (
    <>
      <NavItem icon="home" label="Home" active />
      <NavItem icon="activity" label="Activity" />
      <NavItem icon="notes" label="Notes" />
      <NavItem icon="settings" label="Settings" />
      <NavItem icon="help" label="About" />
      <NavItem icon="lock" label="Sign Out" />
    </>
  ),
};
