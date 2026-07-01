import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import path from "node:path";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // The About window is its own lightweight HTML entry, so it loads just the card
  // instead of booting the full app a second time.
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        about: path.resolve(__dirname, "about.html"),
      },
    },
  },

  // The pure-function tests need the node environment; the Storybook addon renders
  // stories in a real browser. They can't share one config, so they run as two
  // Vitest projects under a single `pnpm test`.
  test: {
    projects: [
      {
        // Sub-projects don't inherit the root resolve config, so the alias is
        // repeated here for the tests that import through "@/...".
        resolve: {
          alias: { "@": path.resolve(__dirname, "./src") },
        },
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        plugins: [storybookTest({ configDir: ".storybook" })],
        // Inline Vitest projects don't inherit the root resolve config, so the "@"
        // alias has to be repeated here or the stories' "@/..." imports won't resolve.
        resolve: {
          alias: { "@": path.resolve(__dirname, "./src") },
        },
        // Pre-bundle everything the preview and the stories pull in. Discovered
        // lazily, these would re-trigger Vite's dep optimizer mid-run; the chunk
        // hashes then shift under already-loaded modules and their dynamic imports
        // 404 (Vitest's "Vite unexpectedly reloaded a test"). Listing them up front
        // keeps the optimize pass to one shot.
        optimizeDeps: {
          include: [
            "@storybook/react-vite",
            "@storybook/addon-a11y",
            "@storybook/addon-themes",
            "storybook/test",
            "react",
            "react-dom",
            "react-dom/client",
            "react/jsx-runtime",
            "react/jsx-dev-runtime",
            "recharts",
            "react-day-picker",
            "lifehash",
            "date-fns",
            "@tabler/icons-react",
            "@tanstack/react-router",
            "@tanstack/react-virtual",
            "radix-ui",
            "clsx",
            "tailwind-merge",
            "class-variance-authority",
          ],
        },
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            provider: "playwright",
            headless: true,
            instances: [{ browser: "chromium" }],
          },
          setupFiles: [".storybook/vitest.setup.ts"],
        },
      },
    ],
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1430,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1431,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
