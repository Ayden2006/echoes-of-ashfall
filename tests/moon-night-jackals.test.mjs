import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const rootFiles = [
  "app/game.tsx",
  "package.json",
  "scripts/apply-moon-night-companion-animation.mjs",
  ".github/workflows/apply-moon-night-animation.yml",
];

test("the player and patcher are named Moon Night, never Moon Knight", async () => {
  const sources = await Promise.all(rootFiles.map((file) => readFile(file, "utf8")));
  const joined = sources.join("\n");
  assert.match(joined, /const PLAYER_NAME = "Moon Night"/);
  assert.match(joined, /Moon Night companion/);
  assert.doesNotMatch(joined, /Moon Knight/);
  assert.doesNotMatch(joined, /moon-knight/);
});

test("each Sunset Jackal drops its own card with jackal art", async () => {
  const game = await readFile("app/game.tsx", "utf8");
  assert.match(game, /sunset-jackal-card-a/);
  assert.match(game, /sunset-jackal-card-b/);
  assert.match(game, /sunset-jackal-card-c/);
  assert.match(game, /image:"\/sunset-jackal-card\.svg"/);
  const jackalCard = game.match(/const SUNSET_JACKAL_CARD:InventoryItem = \{[\s\S]*?\};/);
  assert.ok(jackalCard);
  assert.match(jackalCard[0], /sunset-jackal-card\.svg/);
  assert.doesNotMatch(jackalCard[0], /baby-dragon-sprite-sheet/);
});

test("Map 2 world-pickup jackal card does not use baby-dragon art", async () => {
  const game = await readFile("app/game.tsx", "utf8");
  const fn = game.match(/const drawJackalCardTransformation=[\s\S]*?const drawJackals=/);
  assert.ok(fn, "drawJackalCardTransformation should exist");
  assert.match(fn[0], /drawMagicalAnimalCard\("Sunset Jackal"/);
  assert.match(fn[0], /jackalCardArt/);
  assert.doesNotMatch(fn[0], /dragonImage/);
  assert.doesNotMatch(fn[0], /baby-dragon-sprite-sheet/);
  assert.match(game, /jackalCardArt\.src="\/sunset-jackal-card\.svg"/);
  assert.match(game, /GROUND_BEAST_CARD_IDS = new Set\(\[SUNSET_JACKAL_CARD\.id/);
});

test("ground jackals leap instead of using DragonMode fly", async () => {
  const game = await readFile("app/game.tsx", "utf8");
  assert.match(game, /const nextMode=!wyrm&&mode==="fly"\?"run":mode/);
  assert.match(game, /startJackalLeap/);
  assert.match(game, /if\(nextMode==="sleep"\|\|nextMode==="attack"\)\{jackal\.leapUntil=0/);
  assert.match(
    game,
    /else if\(jackal\.id\.startsWith\("heart-wyrm"\)&&roll<\.9\)beginJackalTravel\(jackal,"fly"/,
  );
  assert.doesNotMatch(
    game,
    /jackal\.id\.startsWith\("heart-wyrm"\)\|\|roll<\.9\)beginJackalTravel\(jackal,"fly"/,
  );
});
