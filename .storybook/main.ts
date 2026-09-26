import { defineMain } from "@storybook/tanstack-react/node";

export default defineMain({
  stories: ["../src/**/*.stories.tsx"],

  addons: [
    "@storybook/addon-a11y",
    "@storybook/addon-themes",
    "@storybook/addon-vitest",
  ],

  framework: "@storybook/tanstack-react",

  features: {
    experimentalReview: true,
    experimentalDocgenServer: true
  }
});
