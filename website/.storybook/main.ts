import { fileURLToPath } from "node:url";
import { defineMain } from "@storybook/react-vite/node";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { mergeConfig } from "vite";

const dir = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineMain({
  stories: ["../src/**/*.stories.tsx"],
  addons: ["@storybook/addon-a11y"],
  framework: "@storybook/react-vite",
  staticDirs: ["../public"],
  core: { disableTelemetry: true },
  viteFinal: (config) =>
    mergeConfig(config, {
      plugins: [react({ compiler: true }), tailwindcss()],
      resolve: {
        alias: {
          "@": dir("../../src"),
          "~": dir("../src"),
        },
      },
      server: {
        fs: { allow: [dir("../..")] },
      },
    }),
});
