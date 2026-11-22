import type { Decorator, Preview } from "@storybook/react-vite";
import { useLayoutEffect } from "react";
import "../src/styles/theme.css";
import "../src/styles/home.css";

const withMotion: Decorator = (Story, context) => {
  const on: boolean =
    context.parameters.motion ?? context.globals.motion === "on";
  useLayoutEffect(() => {
    document.documentElement.classList.toggle("motion", on);
  }, [on]);
  return <Story key={String(on)} />;
};

const withSurface: Decorator = (Story, context) =>
  context.parameters.layout === "fullscreen" ? (
    <Story />
  ) : (
    <div className="grid min-h-svh place-items-center bg-background p-8 text-foreground">
      <Story />
    </div>
  );

const preview: Preview = {
  parameters: {
    backgrounds: { disabled: true },
    a11y: { test: "todo" },
  },
  globalTypes: {
    motion: {
      description: "Run animations, or show the reduced motion state",
      toolbar: {
        title: "Motion",
        icon: "play",
        items: ["on", "off"],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { motion: "on" },
  decorators: [withSurface, withMotion],
};

export default preview;
