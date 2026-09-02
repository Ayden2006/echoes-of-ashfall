import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const game = await readFile(new URL("../app/game.tsx", import.meta.url), "utf8");
const campaign = await readFile(new URL("../lib/campaign.ts", import.meta.url), "utf8");
const pkg = await readFile(new URL("../package.json", import.meta.url), "utf8");

test("Map 1 HUD title is the intended castle chapter, not leftover radio copy", () => {
  assert.match(game, /1:\{name:"The Signal in the Rain"/);
  assert.match(campaign, /name: "The Signal in the Rain"/);
  assert.match(game, /Return to The Signal in the Rain/);
  assert.doesNotMatch(game, /radio encounter|The radio |tune the radio|listen to the radio/i);
  assert.doesNotMatch(campaign, /radio encounter|tune the radio/i);
});

test("later-map traveler talk is keyed per map so first/again/afterCapture all play", () => {
  assert.match(game, /npcTalkKey=\(npc:\{id:string;map:MapId\}\)=>npc\.id\+":"\+npc\.map/);
  assert.match(game, /const talkKey=npcTalkKey\(npc\)/);
  assert.match(game, /I left the castle rain for this watch/);
  assert.match(game, /We keep crossing roads/);
  assert.match(game, /We meet at the last echo/);
});

test("existing unique animals stay on the card + E/Q pattern, with extra on-map fights", () => {
  assert.match(game, /createJackal\("sunset-jackal-a"/);
  assert.match(game, /createJackal\("sunset-jackal-b"/);
  assert.match(game, /createJackal\("sunset-jackal-c"/);
  assert.match(game, /createJackal\("sunset-jackal-scout"/);
  assert.match(game, /createBeast\("ash-roost"/);
  assert.match(game, /createBeast\("cinder-fox-c"/);
  assert.match(game, /createBeast\("pale-stag-b"/);
  assert.match(game, /createBeast\("ember-lynx-d"/);
  assert.match(game, /id:"baby-dragon-card"/);
  assert.match(game, /id:"cinder-fox-card".*image:"\/cinder-fox-card\.svg"/);
  assert.match(game, /image:"\/sunset-jackal-card\.svg"/);
  assert.doesNotMatch(game, /sunset-jackal-card-d/);
  assert.match(game, /droppedJackalCard&&!jackalCardsCollected\.has\(droppedJackalCard\.id\)/);
});

test("extra E-talk secrets use the existing landmark pattern and keep kiln/vein/altar", () => {
  assert.match(game, /action:"Study the rain-worn plaque"/);
  assert.match(game, /action:"Study the dusk-shell"/);
  assert.match(game, /action:"Study the foxfire hollow"/);
  assert.match(game, /action:"Study the moonwell"/);
  assert.match(game, /action:"Study the quiet kiln"/);
  assert.match(game, /action:"Study the banked coal-bed"/);
  assert.match(game, /action:"Study the cooled vein"/);
  assert.match(game, /action:"Study the echo-stone"/);
  assert.match(game, /Approach Ashfall's Heart/);
  assert.match(game, /const x=MAP6_HEART_X\+40,groundY=545/);
  assert.match(game, /PLAYER_NAME = "Moon Night"/);
  assert.match(campaign, /PLAYER_DISPLAY_NAME = "Moon Night"/);
  assert.doesNotMatch(game, /Moon Knight/);
});

test("high secrets have a stepping-stone ledge so a single jump can reach them", () => {
  assert.match(game, /\{x:1418,y:498,w:160,h:18\}/);
  assert.match(game, /\{x:1515,y:430,w:155,h:18\}/);
  assert.match(game, /\{x:1400,y:488,w:150,h:18\}/);
  assert.match(game, /\{x:1510,y:418,w:200,h:18\}/);
  assert.match(game, /\{x:1360,y:508,w:140,h:18\}/);
  assert.match(game, /\{x:1480,y:440,w:170,h:18\}/);
  assert.match(game, /\{x:3980,y:490,w:150,h:18\}/);
  assert.match(game, /\{x:4120,y:430,w:180,h:18\}/);
});

test("prebuild still uses the Moon Night companion script, not moon-knight", () => {
  assert.match(pkg, /apply-moon-night-companion-animation\.mjs/);
  assert.doesNotMatch(pkg, /moon-knight/);
  assert.doesNotMatch(game, /Moon Knight|dating sim|bondMeter/);
});
