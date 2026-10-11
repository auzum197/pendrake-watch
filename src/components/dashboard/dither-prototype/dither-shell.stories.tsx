import type { Meta, StoryObj } from "@storybook/react-vite";
import { withRouter } from "@/stories/with-router";
import type { Bloom, DitherVariant } from "../dither/dither-paint";
import { DATASET_NAMES, DATASETS, type DatasetName, USD } from "./fake-data";
import { INK, INK_NAMES, type InkName } from "../dither/palette";
import {
  ClassicShell,
  HeroWashShell,
  type ShellProps,
  SplitShell,
  TerminalShell,
  TopbarShell,
} from "./shells";

type ShellName = "classic" | "heroWash" | "terminal" | "split" | "topbar";

type Args = {
  shell: ShellName;
  dataset: DatasetName | "usd";
  ink: InkName | "default";
  variant: DitherVariant | "default";
  bloom: Bloom | "default";
  cell: number;
};

const SHELLS: Record<ShellName, (p: ShellProps) => React.JSX.Element> = {
  classic: ClassicShell,
  heroWash: HeroWashShell,
  terminal: TerminalShell,
  split: SplitShell,
  topbar: TopbarShell,
};

function Shell({ shell, dataset, ink, variant, bloom, cell }: Args) {
  const Picked = SHELLS[shell];
  const points = dataset === "usd" ? USD : DATASETS[dataset];
  return (
    <Picked
      points={points}
      usd={dataset === "usd"}
      look={{
        ...(ink !== "default" && { ink: INK[ink] }),
        ...(variant !== "default" && { variant }),
        ...(bloom !== "default" && { bloom }),
        ...(cell > 0 && { cell }),
      }}
    />
  );
}

const meta = {
  title: "Prototype/Dither shell",
  component: Shell,
  decorators: [withRouter],
  parameters: { layout: "fullscreen" },
  argTypes: {
    shell: {
      control: "select",
      options: ["classic", "heroWash", "terminal", "split", "topbar"],
    },
    dataset: { control: "select", options: [...DATASET_NAMES, "usd"] },
    ink: { control: "select", options: ["default", ...INK_NAMES] },
    variant: {
      control: "select",
      options: ["default", "gradient", "dotted", "hatched", "solid"],
    },
    bloom: {
      control: "select",
      options: ["default", "off", "low", "high", "aura"],
    },
    cell: {
      control: { type: "range", min: 0, max: 8, step: 1 },
      description: "0 keeps the shell's own cell size",
    },
  },
  args: {
    shell: "classic",
    dataset: "hodl",
    ink: "default",
    variant: "default",
    bloom: "default",
    cell: 0,
  },
} satisfies Meta<typeof Shell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Classic: Story = {
  name: "1 · Classic",
  args: { shell: "classic" },
};

export const HeroWash: Story = {
  name: "2 · Hero wash",
  args: { shell: "heroWash", dataset: "trader" },
};

export const Terminal: Story = {
  name: "3 · Terminal",
  args: { shell: "terminal", dataset: "whale" },
};

export const Split: Story = {
  name: "4 · Split",
  args: { shell: "split", dataset: "trader" },
};

export const Topbar: Story = {
  name: "5 · Topbar bars",
  args: { shell: "topbar", dataset: "dense" },
};

export const ClassicUsd: Story = {
  args: {
    shell: "classic",
    dataset: "usd",
    variant: "gradient",
    bloom: "high",
  },
};
