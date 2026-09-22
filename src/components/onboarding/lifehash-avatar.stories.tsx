import type { Meta, StoryObj } from "@storybook/react-vite";
import { useArgs } from "storybook/preview-api";
import { LifeHashAvatar } from "./lifehash-avatar";

function randomFingerprint(): string {
  let out = "";
  for (let i = 0; i < 12; i++) out += Math.floor(Math.random() * 16).toString(16);
  return out;
}

const meta = {
  component: LifeHashAvatar,
  args: {
    fingerprint: "a1b2c3d4e5f6",
    ringed: true,
    className: "size-24 rounded-full",
  },
  argTypes: {
    fingerprint: { control: "text" },
    ringed: { control: "boolean" },
    className: { control: "text" },
  },
} satisfies Meta<typeof LifeHashAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => {
    const [, updateArgs] = useArgs();
    return (
      <div className="flex flex-col items-start gap-4">
        <LifeHashAvatar {...args} />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => updateArgs({ fingerprint: randomFingerprint() })}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/80 transition-colors hover:bg-white/10"
          >
            Randomize
          </button>
          <code className="font-mono text-xs text-white/45">{args.fingerprint}</code>
        </div>
      </div>
    );
  },
};
