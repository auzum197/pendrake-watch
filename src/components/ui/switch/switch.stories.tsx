import type { Meta, StoryObj } from "@storybook/react-vite";
import { Switch } from "./switch";
import { Label } from "../label/label";

const meta = {
  component: Switch,
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};
export const On: Story = { args: { defaultChecked: true } };

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Switch id="notifications" defaultChecked />
      <Label htmlFor="notifications">Notifications</Label>
    </div>
  ),
};
