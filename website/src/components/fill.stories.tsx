import type { Meta, StoryObj } from "@storybook/react-vite";
import { useCallback, useEffect, useState } from "react";
import { asset } from "../lib/asset";
import { gsap } from "../lib/motion";
import { DitherFill, type FillPainter, type FillState } from "./fill";

function Frame({ onReady }: { onReady: (paint: FillPainter) => void }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-border bg-background"
      style={{ width: 496, height: 378 }}
    >
      <DitherFill
        className="home-fill"
        src={asset("sky-still.png")}
        cell={3}
        onReady={onReady}
      />
    </div>
  );
}

function Fill({ level, fade }: FillState) {
  const [painter, setPainter] = useState<FillPainter | null>(null);
  const keep = useCallback((paint: FillPainter) => setPainter(() => paint), []);
  useEffect(() => {
    painter?.({ level, fade });
  }, [painter, level, fade]);
  return <Frame onReady={keep} />;
}

function Loop() {
  const [painter, setPainter] = useState<FillPainter | null>(null);
  const keep = useCallback((paint: FillPainter) => setPainter(() => paint), []);
  useEffect(() => {
    if (!painter) return;
    const state: FillState = { level: 0, fade: 0 };
    const draw = () => painter(state);
    const loop = gsap
      .timeline({ repeat: -1, repeatDelay: 0.6 })
      .set(state, { level: 0, fade: 0, onComplete: draw })
      .to(state, {
        level: 1,
        duration: 1.5,
        ease: "power2.inOut",
        onUpdate: draw,
      })
      .to(
        state,
        { fade: 1, duration: 0.7, ease: "power2.out", onUpdate: draw },
        "+=0.4",
      );
    return () => {
      loop.kill();
    };
  }, [painter]);
  return <Frame onReady={keep} />;
}

const meta = {
  title: "components/DitherFill",
  component: Fill,
  args: { level: 1, fade: 0 },
  argTypes: {
    level: { control: { type: "range", min: 0, max: 1, step: 0.01 } },
    fade: { control: { type: "range", min: 0, max: 1, step: 0.01 } },
  },
} satisfies Meta<typeof Fill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Full: Story = {};

export const Rising: Story = { args: { level: 0.45 } };

export const Dissolving: Story = { args: { fade: 0.5 } };

export const Empty: Story = { args: { level: 0 } };

export const Animated: Story = { render: () => <Loop /> };
