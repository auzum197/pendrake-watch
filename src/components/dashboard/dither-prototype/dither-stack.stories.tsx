import type { Meta, StoryObj } from "@storybook/tanstack-react";
import type { Curve } from "../dither/dither-area";
import type { Bloom, DitherVariant } from "../dither/dither-paint";
import {
  DitherStack,
  type DitherStackProps,
  type StackMode,
} from "../dither/dither-stack";
import { POOL_SERIES } from "./fake-data";

type PlaygroundProps = {
  mode: StackMode;
  variant: DitherVariant;
  curve: Curve;
  cell: number;
  bloom: Bloom;
  axes: boolean;
};

function Playground(props: PlaygroundProps) {
  return (
    <div className="w-225 rounded-2xl border border-border bg-card p-6">
      <DitherStack series={POOL_SERIES} className="h-72 w-full" {...props} />
    </div>
  );
}

const meta = {
  title: "Prototype/Dither stack",
  component: Playground,
  argTypes: {
    mode: { control: "radio", options: ["stacked", "share", "layered"] },
    variant: {
      control: "radio",
      options: ["gradient", "dotted", "hatched", "solid"],
    },
    curve: { control: "radio", options: ["step", "linear"] },
    cell: { control: { type: "range", min: 1, max: 8, step: 1 } },
    bloom: { control: "radio", options: ["off", "low", "high", "aura"] },
  },
  args: {
    mode: "stacked",
    variant: "gradient",
    curve: "step",
    cell: 2,
    bloom: "low",
    axes: true,
  },
} satisfies Meta<typeof Playground>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground_: Story = { name: "Playground" };

export const Stacked: Story = {
  name: "1 · Stacked",
  args: { mode: "stacked" },
};

export const Share: Story = {
  name: "2 · Share (cohort)",
  args: { mode: "share" },
};

export const Layered: Story = {
  name: "3 · Layered",
  args: { mode: "layered", bloom: "high" },
};

export const Hatched: Story = {
  name: "4 · Hatched stack",
  args: { mode: "stacked", variant: "hatched", bloom: "off", curve: "step" },
};

export const Chunky: Story = {
  name: "5 · Chunky share",
  args: { mode: "share", cell: 5, bloom: "off", curve: "step" },
};

const GALLERY: { title: string; look: Partial<DitherStackProps> }[] = [
  { title: "1 · Stacked", look: {} },
  { title: "2 · Share (cohort)", look: { mode: "share" } },
  { title: "3 · Layered", look: { mode: "layered", bloom: "high" } },
  {
    title: "4 · Hatched stack",
    look: { variant: "hatched", bloom: "off", curve: "step" },
  },
  {
    title: "5 · Chunky share",
    look: { mode: "share", cell: 5, bloom: "off", curve: "step" },
  },
  {
    title: "6 · Dotted layered",
    look: { mode: "layered", variant: "dotted", bloom: "aura" },
  },
];

export const Gallery: Story = {
  render: () => (
    <div className="grid w-300 grid-cols-2 gap-6">
      {GALLERY.map((entry) => (
        <figure
          key={entry.title}
          className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5"
        >
          <figcaption className="font-heading text-sm font-semibold">
            {entry.title}
          </figcaption>
          <DitherStack
            series={POOL_SERIES}
            className="h-60 w-full"
            {...entry.look}
          />
        </figure>
      ))}
    </div>
  ),
};
