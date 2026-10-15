import * as a11yAddonAnnotations from "@storybook/addon-a11y/preview";
import { beforeAll } from "vitest";
import { setProjectAnnotations } from "@storybook/tanstack-react";
import preview from "./preview";

const project = setProjectAnnotations([a11yAddonAnnotations, preview]);
beforeAll(() => {
  localStorage.setItem("pendrake.reduceMotion", "on");
  return project.beforeAll();
});
