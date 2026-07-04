import { beforeAll } from "vitest";
import { setProjectAnnotations } from "@storybook/react-vite";
import preview from "./preview";

const project = setProjectAnnotations([preview]);
beforeAll(project.beforeAll);
