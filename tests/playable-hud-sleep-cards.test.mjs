import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const game = await readFile(new URL("../app/game.tsx", import.meta.url), "utf8");
const campaign = await readFile(new URL("../lib/campaign.ts", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

const easeInOut = (t) => t * t * (3 - 2 * t);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const SLEEP_SETTLE_MS = 420;
const WAKE_BLEND_MS = 340;
const sleepPoseAmt = (mode, prevMode, blendAt, now, elapsed) => {
  if (mode === "sleep") return easeInOut(clamp(elapsed / SLEEP_SETTLE_MS, 0, 1));
  if (prevMode === "sleep") return 1 - easeInOut(clamp((now - blendAt) / WAKE_BLEND_MS, 0, 1));
  return 0;
};
const curledSleep = (mode, sleepPose) => mode === "sleep" && sleepPose >= 0.72;
const lateObjectiveFor = (map, held, ended) => {
  if (ended) return "The echo is still. Ashfall keeps its heart.";
  if (map === 6 && held.includes("heart-wyrm-card")) return "Press E at the heart altar to end the campaign.";
  if (map === 5 && held.includes("ember-lynx-card")) return "Take the healing east gate to Ashfall's Heart.";
  if (map === 4 && held.includes("pale-stag-card")) return "Take the far gate into The Quiet Ember.";
  if (map === 3 && held.includes("cinder-fox-card")) return "Reach the moonwell gate.";
  if (map === 2 && held.some((id) => id.startsWith("sunset-jackal-card"))) return "Take the eastern portal to Ash Hollow.";
  if (map === 1 && held.includes("baby-dragon-card")) return "Take the far-right portal to Sunset Shore.";
  const fallback = {
    1: "Find the baby dragon in the rain, then take the far-right portal.",
    5: "Talk to Reed, bind an Ember Lynx, then take the healing east gate to the heart altar.",
    6: "Speak with Kest, bind the Heart Wyrm, then press E at the altar to end the campaign.",
  };
  return fallback[map];
};
const MAP_STORY = {
  1: { name: "The Signal in the Rain" },
  2: { name: "Sunset Shore" },
  3: { name: "Ash Hollow" },
  4: { name: "Moonwell Cliffs" },
  5: { name: "The Quiet Ember" },
  6: { name: "Ashfall's Heart" },
};
const hudLockFor = (map, held, ended) => ({ name: MAP_STORY[map].name, objective: lateObjectiveFor(map, held, ended) });

test("HUD lock keeps the current map name and bind-aware objective after late binds", () => {
  assert.match(game, /const lateObjectiveFor=\(map:MapId,held:string\[\],ended:boolean\)=>\{/);
  assert.match(game, /const hudLockFor=\(map:MapId,held:string\[\],ended:boolean\)=>\(\{name:MAP_STORY\[map\]\.name,objective:lateObjectiveFor\(map,held,ended\)\}\)/);
  assert.match(game, /<p className="chapter-name">\{MAP_STORY\[mapNumber\]\.name\}<\/p>/);
  assert.match(game, /<p className="objective-copy">\{objective\}<\/p>/);
  assert.match(game, /Map \{mapNumber\} · \{MAP_STORY\[mapNumber\]\.name\} · \{objective\} · \{mapProgress\}% across/);
  assert.match(game, /if\(map!==lastHudMap\)\{const hud=hudLockFor\(map,inventoryRef\.current\.map\(item=>item\.id\),campaignEndedRef\.current\);setMapNumber\(map\);setObjective\(hud\.objective\);\}/);
  assert.match(game, /setObjective\(hudLockFor\(map,inventoryRef\.current\.map\(item=>item\.id\),campaignEndedRef\.current\)\.objective\)/);
  assert.match(game, /setObjective\(hudLockFor\(6,inventoryRef\.current\.map\(item=>item\.id\),true\)\.objective\)/);
  assert.doesNotMatch(game, /mapNumber===1\s*\?\s*"The Signal in the Rain"\s*:\s*"Sunset Shore"/);
  assert.doesNotMatch(game, /chapter-name">\{mapNumber===1/);
  assert.match(css, /text-shadow:0 1px 10px rgba\(0,0,0,\.72\)/);
  assert.match(css, /\.objective \{ max-width:min\(52vw,440px\)/);
  assert.match(css, /\.world-map-footer strong\{[^}]*overflow-wrap:anywhere/);

  const lynx = hudLockFor(5, ["ember-lynx-card"], false);
  assert.equal(lynx.name, "The Quiet Ember");
  assert.equal(lynx.objective, "Take the healing east gate to Ashfall's Heart.");
  const wyrm = hudLockFor(6, ["heart-wyrm-card"], false);
  assert.equal(wyrm.name, "Ashfall's Heart");
  assert.equal(wyrm.objective, "Press E at the heart altar to end the campaign.");
  const ended = hudLockFor(6, ["heart-wyrm-card"], true);
  assert.equal(ended.name, "Ashfall's Heart");
  assert.equal(ended.objective, "The echo is still. Ashfall keeps its heart.");
  const stillHunting = hudLockFor(6, ["ember-lynx-card"], false);
  assert.equal(stillHunting.name, "Ashfall's Heart");
  assert.match(stillHunting.objective, /Heart Wyrm/);
  const afterDragon = hudLockFor(1, ["baby-dragon-card"], false);
  assert.equal(afterDragon.name, "The Signal in the Rain");
  assert.equal(afterDragon.objective, "Take the far-right portal to Sunset Shore.");
  assert.notEqual(afterDragon.objective, MAP_STORY[1].name);
  const onEmber = hudLockFor(5, [], false);
  assert.notEqual(onEmber.name, "The Signal in the Rain");
  assert.equal(onEmber.name, "The Quiet Ember");
});

test("sleep→wake blend markers stand jackals/fox/stag/lynx up without a frozen curl frame", () => {
  assert.match(game, /const SLEEP_SETTLE_MS = 420/);
  assert.match(game, /const WAKE_BLEND_MS = 340/);
  assert.match(game, /const sleepPoseAmt = \(mode:DragonMode, prevMode:DragonMode, blendAt:number, now:number, elapsed:number\) => \{/);
  assert.match(game, /if\(prevMode==="sleep"\) return 1-easeInOut\(clamp\(\(now-blendAt\)\/WAKE_BLEND_MS,0,1\)\)/);
  assert.match(game, /const sleepPose=sleepPoseAmt\(mode,prevMode,modeBlendAt,now,elapsed\)/);
  assert.match(game, /const waking=prevMode==="sleep"&&mode!=="sleep"/);
  assert.match(game, /const sleep=mode==="sleep"&&sleepPose>=0\.72; \/\/ curl only while asleep; sleep→wake uses sleepPoseAmt stand-up, no frozen curl frame/);
  assert.match(game, /const wakeStretch=waking\?hopArc\(1-sleepPose,0\.07\):0/);
  assert.match(game, /prevMode:jackal\.prevMode,modeBlendAt:jackal\.modeBlendAt/);
  assert.match(game, /prevMode:beast\.prevMode,modeBlendAt:beast\.modeBlendAt/);
  assert.match(game, /kind=beastKindFor\(card\.id\)/);
  assert.match(game, /card\.id===PALE_STAG_CARD\.id\?STAG_RENDER_SIZE:card\.id===EMBER_LYNX_CARD\.id\?LYNX_RENDER_SIZE/);
  assert.doesNotMatch(game, /const sleep=sleepPose>=0\.62/);

  assert.equal(sleepPoseAmt("sleep", "idle", 0, 420, 420), 1);
  assert.equal(sleepPoseAmt("idle", "walk", 0, 200, 200), 0);
  const midWake = sleepPoseAmt("idle", "sleep", 0, 170, 170);
  assert.ok(midWake > 0 && midWake < 1, "wake should ease through WAKE_BLEND_MS");
  assert.equal(curledSleep("idle", midWake), false, "waking idle must leave the curl path");
  assert.equal(curledSleep("idle", 0.9), false, "any idle pose skips the frozen curl");
  assert.equal(curledSleep("sleep", 0.9), true);
  assert.equal(curledSleep("sleep", 0.5), false);
  assert.equal(sleepPoseAmt("idle", "sleep", 0, 340, 340), 0);
});

test("card PRESS E canvas prompt still fires for dragon and every wild card after plant", () => {
  assert.match(game, /const drawCardPressE=\(x:number,y:number\)=>\{/);
  assert.match(game, /ctx\.strokeText\("PRESS E",x,y\)/);
  assert.match(game, /drawCardPressE\(x,riseY\+cardH\/2\*scale\+6\)/);
  assert.match(game, /const floor=plantedFloorAt\(1,dragon\.x\);drawMagicalAnimalCard\("Baby Dragon",floor\.x,floor\.groundY/);
  assert.match(game, /const floor=plantedFloorAt\(2,jackal\.x\);drawMagicalAnimalCard\("Sunset Jackal",floor\.x,floor\.groundY/);
  assert.match(game, /const floor=plantedFloorAt\(6,wyrm\.x\);drawMagicalAnimalCard\("Heart Wyrm",floor\.x,floor\.groundY/);
  assert.match(game, /const floor=plantedFloorAt\(mapRef\.current,beast\.x\);drawMagicalAnimalCard\(card\.name,floor\.x,floor\.groundY/);
  assert.match(game, /promptAt=\{x:dragonFloor\.x,y:dragonFloor\.groundY\}/);
  assert.match(game, /readyJackal\)\{action=inventoryRef\.current\.length>=INVENTORY_CAPACITY\?"Inventory full":"Pick up Sunset Jackal card";const floor=plantedFloorAt\(2,readyJackal\.x\);promptAt=\{x:floor\.x,y:floor\.groundY\}/);
  assert.match(game, /readyOtherWild&&otherWildCard\)\{action=inventoryRef\.current\.length>=INVENTORY_CAPACITY\?"Inventory full":"Pick up "\+otherWildCard\.name\+" card";const floor=plantedFloorAt\(map,readyOtherWild\.x\);promptAt=\{x:floor\.x,y:floor\.groundY\}/);
  assert.match(game, /className=\{"interaction"\+\(promptAnchor\?" near-card":""\)\}/);
  assert.match(game, /const wildCardFor=\(map:MapId\)=>map===2\?SUNSET_JACKAL_CARD:map===3\?CINDER_FOX_CARD:map===4\?PALE_STAG_CARD:map===5\?EMBER_LYNX_CARD:map===6\?HEART_WYRM_CARD:null/);
  assert.match(game, /const otherWildCard=map>=3&&map<=6\?wildCardFor\(map\):null/);
  assert.equal((game.match(/drawMagicalAnimalCard\(/g) || []).length, 4);
});

test("locks hold: Moon Night, planted helpers, gait blends, PR #10 numbers, no dating, no maps 7+", () => {
  assert.match(game, /PLAYER_NAME = "Moon Night"/);
  assert.match(campaign, /PLAYER_DISPLAY_NAME = "Moon Night"/);
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);
  assert.match(game, /const keepCreatureOnRoad=\(creature:\{x:number;y:number;groundY:number\},map:MapId\)=>\{/);
  assert.match(game, /const gaitBlendAmt = \(blendAt:number, now:number\)=>easeInOut\(clamp\(\(now-blendAt\)\/MODE_BLEND_MS,0,1\)\)/);
  assert.match(game, /const lateMapContactShade = \(map:MapId\) => map===5/);
  assert.match(game, /const COMPANION_HUNT_RANGE = 520/);
  assert.match(game, /const COMPANION_STRIKE_RANGE = 132/);
  assert.match(game, /const COMPANION_STRIKE_DAMAGE = 5/);
  assert.match(game, /const COMPANION_STRIKE_RECOVERY = 840/);
  assert.match(game, /const COMBAT_ONLY_AGGRO_RANGE = 220/);
  assert.match(game, /const EXTRA_CHASE_LEEWAY = 360/);
  assert.doesNotMatch(game, /Moon Knight|bondMeter|dating sim|affectionMeter|romanceChoice|MAP7_/);
  assert.doesNotMatch(game, /radio encounter|tune the radio|drawPixelHouse|drawCastleKeep/i);
  assert.doesNotMatch(game, /map:\s*7|Map 7/);
  assert.equal((game.match(/firstTalk:\[/g) || []).length, 36);
  assert.equal((game.match(/againTalk:\[/g) || []).length, 36);
  assert.equal((game.match(/afterCaptureTalk:\[/g) || []).length, 36);
});
