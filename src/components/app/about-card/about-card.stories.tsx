import type { Meta, StoryObj } from "@storybook/react-vite";
import { AboutCard } from "./about-card";

const meta = {
	component: AboutCard,
} satisfies Meta<typeof AboutCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<div className="mx-auto w-80 rounded-2xl border border-border bg-card py-10">
			<AboutCard />
		</div>
	),
};
