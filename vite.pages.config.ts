import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

// Static GitHub Pages build. Local `npm run dev` / `npm run build` stay on vinext.
export default defineConfig({
  root: path.join(rootDir, "pages-static"),
  base: "/echoes-of-ashfall/",
  publicDir: path.join(rootDir, "public"),
  plugins: [react()],
  resolve: {
    alias: { "@": rootDir },
  },
  css: {
    postcss: path.join(rootDir, "postcss.config.mjs"),
  },
  build: {
    outDir: path.join(rootDir, "dist-pages"),
    emptyOutDir: true,
  },
});
