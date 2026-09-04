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
  assert.match(game, /We meet again\. Castle rain, then cliff wind/);
  assert.match(game, /We keep meeting at the edge of the light/);
  assert.match(game, /We meet where the ash learned to wait/);
  assert.match(game, /We meet again\. Castle merlon, then kiln road/);
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
  assert.match(game, /id:"cinder-fox-card".*assetUrl\("\/cinder-fox-card\.svg"\)/);
  assert.match(game, /assetUrl\("\/sunset-jackal-card\.svg"\)/);
  assert.doesNotMatch(game, /sunset-jackal-card-d/);
  assert.match(game, /droppedJackalCard&&!jackalCardsCollected\.has\(droppedJackalCard\.id\)/);
});

test("extra E-talk secrets use the existing landmark pattern and keep kiln/vein/altar", () => {
  assert.match(game, /action:"Study the rain-worn plaque"/);
  assert.match(game, /action:"Study the rain-cut groove"/);
  assert.match(game, /action:"Study the dusk-shell"/);
  assert.match(game, /action:"Study the drowned signal-post"/);
  assert.match(game, /action:"Study the foxfire hollow"/);
  assert.match(game, /action:"Study the split cairn"/);
  assert.match(game, /action:"Study the moonwell"/);
  assert.match(game, /action:"Study the cliff notch"/);
  assert.match(game, /action:"Study the quiet kiln"/);
  assert.match(game, /action:"Study the banked coal-bed"/);
  assert.match(game, /action:"Study the quiet bellows"/);
  assert.match(game, /action:"Study the cooled vein"/);
  assert.match(game, /action:"Study the echo-stone"/);
  assert.match(game, /action:"Study the first-step stone"/);
  assert.match(game, /action:"Study the rain-slick merlon"/);
  assert.match(game, /action:"Study the tide-cut step"/);
  assert.match(game, /action:"Study the charred nest"/);
  assert.match(game, /action:"Study the pale lichen"/);
  assert.match(game, /Approach Ashfall's Heart/);
  assert.match(game, /const x=MAP6_HEART_X\+40,groundY=545/);
  assert.match(game, /PLAYER_NAME = "Moon Night"/);
  assert.match(campaign, /PLAYER_DISPLAY_NAME = "Moon Night"/);
  assert.doesNotMatch(game, /Moon Knight/);
});

test("mid-road twist and stronger altar ending stay on E-talk, no new engines", () => {
  assert.match(game, /The signal is not a road\. It is the animals/);
  assert.match(game, /I did not chase a signal east\. I carried it/);
  assert.match(game, /each was a shard of the same fading call/);
  assert.match(campaign, /CAMPAIGN_ENDING/);
  assert.match(campaign, /I did not chase a signal east/);
  assert.doesNotMatch(game, /bondMeter|affectionMeter|romanceChoice|dialogueChoice/);
  assert.doesNotMatch(game, /map:\s*7|Map 7|MAP7_/);
});

test("after-capture lines tie each map animal to the fading signal", () => {
  assert.match(game, /It was the first spark of the signal/);
  assert.match(game, /That's the dusk of the signal walking with you/);
  assert.match(game, /That's foxfire — the echo shedding heat/);
  assert.match(game, /The moonwell poured the signal into that stag/);
  assert.match(game, /That lynx was the last heat the echo could keep without going out/);
  assert.match(game, /The wyrm is the last pulse/);
});

test("combat-only extras never flash a second card", () => {
  assert.match(game, /COMBAT_ONLY_BEAST_IDS = new Set\(\["sunset-jackal-scout","ash-roost","cinder-fox-c","pale-stag-b","ember-lynx-d"\]\)/);
  assert.match(game, /!isCombatOnlyBeast\(beast\.id\)/);
  assert.match(game, /droppedJackalCard&&!jackalCardsCollected\.has\(droppedJackalCard\.id\)/);
  assert.doesNotMatch(game, /sunset-jackal-card-d/);
});

test("maps 1–6 are wider with two-way portals still on the existing road", () => {
  assert.match(campaign, /width: 7200/);
  assert.match(campaign, /width: 5400/);
  assert.match(campaign, /width: 5800/);
  assert.match(campaign, /width: 6000/);
  assert.match(campaign, /width: 6200/);
  assert.match(campaign, /width: 6600/);
  assert.match(game, /const MAP1_W = 7200/);
  assert.match(game, /const MAP1_PORTAL_X = 7070/);
  assert.match(game, /const MAP2_EXIT_X = 5270/);
  assert.match(game, /const MAP3_EXIT_X = 5670/);
  assert.match(game, /const MAP4_EXIT_X = 5870/);
  assert.match(game, /const MAP5_EXIT_X = 6070/);
  assert.match(game, /const MAP6_HEART_X = 6470/);
  assert.match(game, /if\(map===1\) return \{x:6860,y:483,facing:-1/);
  assert.doesNotMatch(game, /map:\s*7|MAP7_/);
});

test("high secrets have a stepping-stone ledge so a single jump can reach them", () => {
  assert.match(game, /\{x:1418,y:498,w:160,h:18\}/);
  assert.match(game, /\{x:1515,y:430,w:155,h:18\}/);
  assert.match(game, /\{x:1400,y:488,w:150,h:18\}/);
  assert.match(game, /\{x:1510,y:418,w:200,h:18\}/);
  assert.match(game, /\{x:1360,y:508,w:140,h:18\}/);
  assert.match(game, /\{x:1480,y:440,w:170,h:18\}/);
  assert.match(game, /\{x:5780,y:490,w:150,h:18\}/);
  assert.match(game, /\{x:5920,y:430,w:180,h:18\}/);
  assert.match(game, /\{x:6380,y:500,w:150,h:18\}/);
  assert.match(game, /\{x:6520,y:430,w:170,h:18\}/);
  assert.match(game, /\{x:5080,y:500,w:140,h:18\}/);
  assert.match(game, /\{x:5180,y:432,w:160,h:18\}/);
  assert.match(game, /\{x:4380,y:500,w:140,h:18\}/);
  assert.match(game, /\{x:4500,y:430,w:160,h:18\}/);
  assert.match(game, /\{x:2460,y:508,w:140,h:18\}/);
  assert.match(game, /\{x:2580,y:440,w:170,h:18\}/);
  assert.match(game, /\{x:5640,y:488,w:150,h:18\}/);
  assert.match(game, /\{x:5780,y:422,w:160,h:18\}/);
  assert.match(game, /\{x:6160,y:490,w:150,h:18\}/);
  assert.match(game, /\{x:6300,y:430,w:160,h:18\}/);
});

test("prebuild still uses the Moon Night companion script, not moon-knight", () => {
  assert.match(pkg, /apply-moon-night-companion-animation\.mjs/);
  assert.doesNotMatch(pkg, /moon-knight/);
  assert.doesNotMatch(game, /Moon Knight|dating sim|bondMeter/);
});
