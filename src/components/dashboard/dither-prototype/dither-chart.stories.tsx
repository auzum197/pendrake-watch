import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  type ChartKind,
  type Curve,
  DitherArea,
  type DitherLook,
} from "../dither/dither-area";
import type { Bloom, DitherVariant } from "../dither/dither-paint";
import { DATASET_NAMES, DATASETS, type DatasetName, USD } from "./fake-data";
import { INK, INK_NAMES, type InkName } from "../dither/palette";

type PlaygroundProps = {
  dataset: DatasetName | "usd";
  ink: InkName;
  variant: DitherVariant;
  kind: ChartKind;
  curve: Curve;
  cell: number;
  bloom: Bloom;
  sparkles: boolean;
  animate: boolean;
  interactive: boolean;
  axes: boolean;
};

function Playground({ dataset, ink, ...rest }: PlaygroundProps) {
  const points = dataset === "usd" ? USD : DATASETS[dataset];
  return (
    <div className="w-225 rounded-2xl border border-border bg-card p-6">
      <DitherArea
        points={points}
        usd={dataset === "usd"}
        ink={INK[ink]}
        className="aspect-900/240 w-full"
        {...rest}
      />
    </div>
  );
}

const meta = {
  title: "Prototype/Dither chart",
  component: Playground,
  argTypes: {
    dataset: { control: "select", options: [...DATASET_NAMES, "usd"] },
    ink: { control: "select", options: INK_NAMES },
    variant: {
      control: "radio",
      options: ["gradient", "dotted", "hatched", "solid"],
    },
    kind: { control: "radio", options: ["area", "line", "bars"] },
    curve: { control: "radio", options: ["step", "linear"] },
    cell: { control: { type: "range", min: 1, max: 8, step: 1 } },
    bloom: { control: "radio", options: ["off", "low", "high", "aura"] },
  },
  args: {
    dataset: "hodl",
    ink: "brand",
    variant: "gradient",
    kind: "area",
    curve: "step",
    cell: 2,
    bloom: "low",
    sparkles: true,
    animate: true,
    interactive: true,
    axes: true,
  },
} satisfies Meta<typeof Playground>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground_: Story = {
  args: {
    curve: "linear",
  },

  name: "Playground",
};

export const GradientBloom: Story = {
  name: "1 · Gradient bloom",
  args: { variant: "gradient", cell: 2, bloom: "low", sparkles: true },
};

export const HatchedBlueprint: Story = {
  name: "2 · Hatched blueprint",
  args: {
    variant: "hatched",
    cell: 2,
    bloom: "off",
    sparkles: false,
    curve: "step",
  },
};

export const DottedHalftone: Story = {
  name: "3 · Dotted halftone",
  args: {
    dataset: "trader",
    ink: "ironwood",
    variant: "dotted",
    cell: 3,
    bloom: "aura",
    sparkles: true,
    curve: "linear",
  },
};

export const ChunkyPixels: Story = {
  name: "4 · Chunky pixels",
  args: {
    dataset: "whale",
    ink: "transparent",
    variant: "gradient",
    cell: 5,
    bloom: "off",
    sparkles: false,
    curve: "step",
  },
};

export const LineAura: Story = {
  name: "5 · Line aura",
  args: {
    dataset: "usd",
    kind: "line",
    cell: 2,
    bloom: "high",
    sparkles: true,
    curve: "linear",
  },
};

export const Bars: Story = {
  args: { dataset: "dense", kind: "bars", bloom: "low", sparkles: false },
};

const GALLERY: {
  title: string;
  look: Partial<DitherLook>;
  data: DatasetName | "usd";
}[] = [
  { title: "1 · Gradient bloom", data: "hodl", look: {} },
  {
    title: "2 · Hatched blueprint",
    data: "hodl",
    look: { variant: "hatched", bloom: "off", sparkles: false },
  },
  {
    title: "3 · Dotted halftone",
    data: "trader",
    look: {
      ink: INK.ironwood,
      variant: "dotted",
      cell: 3,
      bloom: "aura",
      curve: "linear",
    },
  },
  {
    title: "4 · Chunky pixels",
    data: "whale",
    look: { ink: INK.transparent, cell: 5, bloom: "off", sparkles: false },
  },
  {
    title: "5 · Line aura",
    data: "usd",
    look: { kind: "line", bloom: "high", curve: "linear" },
  },
];

export const Gallery: Story = {
  render: () => (
    <div className="grid w-300 grid-cols-2 gap-6">
      {GALLERY.map((g) => (
        <figure
          key={g.title}
          className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5"
        >
          <figcaption className="font-heading text-sm font-semibold">
            {g.title}
          </figcaption>
          <DitherArea
            points={g.data === "usd" ? USD : DATASETS[g.data]}
            usd={g.data === "usd"}
            className="aspect-900/240 w-full"
            {...g.look}
          />
        </figure>
      ))}
    </div>
  ),
};
