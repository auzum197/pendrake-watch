import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [solid(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../src"),
      "~": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 1440,
    fs: { allow: [path.resolve(__dirname, "..")] },
  },
});
