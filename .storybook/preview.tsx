import type { Preview } from "@storybook/react-vite";
import { withThemeByClassName } from "@storybook/addon-themes";
import { sb } from "storybook/test";
import "../src/index.css";

sb.mock("../src/lib/ipc.ts", { spy: true });

const preview: Preview = {
  parameters: {
    backgrounds: { disable: true },
    a11y: { test: "todo" },
  },
  decorators: [
    withThemeByClassName({
      themes: { dark: "dark", light: "" },
      defaultTheme: "dark",
    }),
    (Story) => (
      <div className="min-h-svh bg-background p-8 text-foreground">
        <Story />
      </div>
    ),
  ],
};

export default preview;
