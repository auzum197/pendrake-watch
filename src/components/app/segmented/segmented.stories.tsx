import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { useState } from "react";
import { Segmented } from "./segmented";

const meta = {
  component: Segmented,
  args: {
    value: "month",
    onChange: fn(),
    options: [
      { value: "week", label: "Week" },
      { value: "month", label: "Month" },
      { value: "year", label: "Year" },
    ],
  },
} satisfies Meta<typeof Segmented>;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo({ tone }: { tone: "brand" | "neutral" }) {
  const [value, setValue] = useState("month");
  return (
    <div className="w-80 rounded-2xl bg-ink p-6">
      <Segmented
        value={value}
        onChange={setValue}
        tone={tone}
        options={[
          { value: "week", label: "Week" },
          { value: "month", label: "Month" },
          { value: "year", label: "Year" },
        ]}
      />
    </div>
  );
}

// The brand fill, as onboarding's sync-mode switch wears it.
export const Brand: Story = { render: () => <Demo tone="brand" /> };

// The neutral fill, as the dashboard's chart range controls wear it.
export const Neutral: Story = { render: () => <Demo tone="neutral" /> };

export const TwoOptions: Story = {
  render: () => {
    const [value, setValue] = useState("full");
    return (
      <div className="w-64 rounded-2xl bg-ink p-6">
        <Segmented
          value={value}
          onChange={setValue}
          options={[
            { value: "full", label: "Full node" },
            { value: "light", label: "Lightwallet" },
          ]}
        />
      </div>
    );
  },
};
