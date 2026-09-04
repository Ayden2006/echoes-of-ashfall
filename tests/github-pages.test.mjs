import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
const pkg = await readFile(new URL("../package.json", import.meta.url), "utf8");
const pagesConfig = await readFile(new URL("../vite.pages.config.ts", import.meta.url), "utf8");
const workflow = await readFile(new URL("../.github/workflows/github-pages.yml", import.meta.url), "utf8");
const game = await readFile(new URL("../app/game.tsx", import.meta.url), "utf8");

test("GitHub Pages uses a static Vite build with the repo base path", () => {
  assert.match(pagesConfig, /base:\s*"\/echoes-of-ashfall\/"/);
  assert.match(pagesConfig, /root:\s*path\.join\(rootDir,\s*"pages-static"\)/);
  assert.match(pkg, /"build:pages":/);
  assert.match(workflow, /npm run build:pages/);
  assert.match(workflow, /path: '\.\/dist-pages'/);
  assert.match(workflow, /permissions:[\s\S]*pages:\s*write/);
  assert.match(readme, /https:\/\/ayden2006\.github\.io\/echoes-of-ashfall\//);
  assert.match(readme, /https:\/\/github\.com\/Ayden2006\/echoes-of-ashfall\/archive\/refs\/heads\/main\.zip/);
});

test("game assets use Vite BASE_URL so Pages can host under /echoes-of-ashfall/", () => {
  assert.match(game, /const assetUrl = \(file:string\) => ASSET_BASE \+ file\.replace/);
  assert.match(game, /backdrop\.src=assetUrl\("\/pixel-castle-night\.png"\)/);
  assert.match(game, /knight\.src=assetUrl\("\/knight-sprite-sheet\.png"\)/);
  assert.match(game, /dragonImage\.src=assetUrl\("\/baby-dragon-sprite-sheet\.png"\)/);
});
