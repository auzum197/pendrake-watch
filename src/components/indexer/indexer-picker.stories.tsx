import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { useState } from "react";
import { IndexerPicker } from "./indexer-picker";
import { CUSTOM_INDEXER } from "@/lib/indexer";
import { DEFAULT_INDEXER } from "@/lib/ipc";

const meta = {
  component: IndexerPicker,
  args: {
    network: "mainnet",
    selection: DEFAULT_INDEXER,
    customUrl: "",
    onSelect: fn(),
    onCustomChange: fn(),
  },
} satisfies Meta<typeof IndexerPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo({
  network,
  start,
  inputClassName,
}: {
  network: "mainnet" | "regtest";
  start: string;
  inputClassName?: string;
}) {
  const [selection, setSelection] = useState(start);
  const [customUrl, setCustomUrl] = useState("");
  return (
    <div className="w-96 rounded-2xl bg-card p-6">
      <IndexerPicker
        network={network}
        selection={selection}
        customUrl={customUrl}
        inputClassName={inputClassName}
        onSelect={setSelection}
        onCustomChange={setCustomUrl}
      />
    </div>
  );
}

// The mainnet region list, as Settings wears it.
export const Mainnet: Story = {
  render: () => <Demo network="mainnet" start={DEFAULT_INDEXER} />,
};

// Custom picked, revealing the URL field under the list.
export const MainnetCustom: Story = {
  render: () => <Demo network="mainnet" start={CUSTOM_INDEXER} />,
};

// Regtest has no public default, so the field stands alone with no list above it.
export const Regtest: Story = {
  render: () => <Demo network="regtest" start={CUSTOM_INDEXER} />,
};

// The onboarding step's larger field, sized to sit with the wizard's other inputs.
export const Onboarding: Story = {
  render: () => (
    <Demo
      network="mainnet"
      start={CUSTOM_INDEXER}
      inputClassName="h-12 rounded-xl border-ink-line bg-ink-soft px-4 text-sm"
    />
  ),
};
