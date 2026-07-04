import type { Preview } from "@storybook/react-vite";
import { withThemeByClassName } from "@storybook/addon-themes";
import { sb } from "storybook/test";
import "../src/index.css";

// Components import the IPC bridge from "@/lib/ipc". Auto-spy it so nothing reaches
// across the Tauri boundary inside the workbench: every export is wrapped in a spy a
// story can override with mocked(...), while the real constants (DEFAULT_INDEXER,
// MAINNET_INDEXERS) pass through. The path is relative (Node-resolvable from this
// config dir) rather than the "@" alias, which the mock extractor can't see; the
// redirect still matches imports by absolute path.
sb.mock("../src/lib/ipc.ts", { spy: true });

const preview: Preview = {
  parameters: {
    // The app ships its own dark surface, so the addon's checkered backgrounds
    // would only fight it.
    backgrounds: { disable: true },
    a11y: { test: "todo" },
  },
  decorators: [
    withThemeByClassName({
      // The palette in index.css is dark-only, so the app's real look is the dark
      // class. The light entry stays for the toggle but resolves to the same tokens.
      themes: { dark: "dark", light: "" },
      defaultTheme: "dark",
    }),
    (Story) => {
      // Force the entrance animations off so render and play-function tests are
      // deterministic regardless of the host's reduce-motion setting.
      localStorage.setItem("pendrake.reduceMotion", "on");
      return (
        <div className="min-h-svh bg-background p-8 text-foreground">
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
