import type { Meta, StoryObj } from "@storybook/react-vite";
import original from "@/assets/onboarding-backdrop.jpg";
import { BackdropScene, LAYERS, TreeCanvas } from "./backdrop-scene";

const meta = {
  title: "Prototype/Onboarding backdrop",
  component: BackdropScene,
  parameters: { layout: "fullscreen" },
  args: { wind: 1, trees: true, dither: false, inverted: false, hidden: [] },
  argTypes: {
    wind: { control: { type: "range", min: 0, max: 4, step: 0.1 } },
    hidden: {
      control: "check",
      options: LAYERS.map((l) => l.name),
    },
  },
} satisfies Meta<typeof BackdropScene>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Scene: Story = {};

export const Gusty: Story = { args: { wind: 3 } };

export const Dithered: Story = { args: { dither: true } };

export const Inverted: Story = {
  args: { dither: true, inverted: true },
};

export const Layers: Story = {
  render: ({ wind }) => (
    <div className="grid grid-cols-2 gap-6 xl:grid-cols-3">
      {[
        ...LAYERS.map((l) => (
          <figure key={l.name} className="flex flex-col gap-2">
            <img
              src={l.src}
              alt=""
              className="backdrop-tile w-full rounded-lg"
            />
            <figcaption className="text-sm text-white/60">{l.name}</figcaption>
          </figure>
        )),
        <figure key="trees" className="flex flex-col gap-2">
          <TreeCanvas
            wind={wind ?? 1}
            data-light
            className="backdrop-tile w-full rounded-lg"
          />
          <figcaption className="text-sm text-white/60">
            trees (code)
          </figcaption>
        </figure>,
        <figure key="original" className="flex flex-col gap-2">
          <img
            src={original}
            alt=""
            className="backdrop-tile w-full rounded-lg"
          />
          <figcaption className="text-sm text-white/60">original</figcaption>
        </figure>,
      ]}
    </div>
  ),
};
