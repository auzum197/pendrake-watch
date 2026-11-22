import { fileURLToPath } from "node:url";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

const dir = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  site: process.env.SITE_URL,
  base: process.env.BASE_PATH ?? "/",
  integrations: [react({ compiler: true })],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": dir("../src"),
        "~": dir("./src"),
      },
    },
    server: {
      fs: { allow: [dir("..")] },
    },
  },
});
