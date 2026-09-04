import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const game = await readFile(new URL("../app/game.tsx", import.meta.url), "utf8");
const campaign = await readFile(new URL("../lib/campaign.ts", import.meta.url), "utf8");

const extractPlatforms = (name) => {
  const block = game.match(new RegExp(`const ${name}: Platform\\[\\] = \\[([\\s\\S]*?)\\];`));
  assert.ok(block, `${name} should exist`);
  return [...block[1].matchAll(/\{x:(-?\d+),y:(-?\d+),w:(\d+),h:(\d+)\}/g)].map((m) => ({
    x: Number(m[1]), y: Number(m[2]), w: Number(m[3]), h: Number(m[4]),
  }));
};

const surfaceAt = (plats, x) => {
  const hits = plats.filter((p) => p.h > 80 && x >= p.x && x <= p.x + p.w);
  return hits.length ? Math.min(...hits.map((p) => p.y)) : null;
};

const num = (pattern, label) => {
  const match = game.match(pattern);
  assert.ok(match, label);
  return Number(match[1]);
};

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const nextUsableLoadout = (equipped, itemId, selected) => {
  const next = equipped.slice();
  const already = next.indexOf(itemId);
  if (already >= 0) return { equipped: next, selected, replaced: null };
  const open = next.indexOf(null);
  if (open >= 0) {
    next[open] = itemId;
    return { equipped: next, selected: open, replaced: null };
  }
  const slot = clamp(selected, 0, 4);
  const replaced = next[slot];
  next[slot] = itemId;
  return { equipped: next, selected: slot, replaced };
};

test("Tab inventory + 1–5 + Q still bind after a planted late-map pickup when slots are full", () => {
  assert.match(game, /const nextUsableLoadout=\(equipped:\(string\|null\)\[\],itemId:string,selected:number\)=>\{/);
  assert.match(game, /const loadout=nextUsableLoadout\(current,itemId,selectedSlotRef\.current\)/);
  assert.match(game, /selectedSlotRef\.current=loadout\.selected;setSelectedSlot\(loadout\.selected\)/);
  assert.match(game, /if\(nearDragonCard&&collectInventoryItem\(BABY_DRAGON_CARD\)\)\{\n {10}dragonCardCollected=true;toggleEquippedItem\(BABY_DRAGON_CARD\.id\)/);
  assert.match(game, /if\(jackalCard&&collectInventoryItem\(jackalCard\)\)\{\n {12}jackalCardsCollected\.add\(jackalCard\.id\);toggleEquippedItem\(jackalCard\.id\)/);
  assert.match(game, /else if\(readyOtherWild&&otherWildCard&&collectInventoryItem\(otherWildCard\)\)\{\n {10}otherWildCollected\.add\(otherWildCard\.id\);toggleEquippedItem\(otherWildCard\.id\)/);
  assert.match(game, /const dragonFloor=plantedFloorAt\(1,dragon\.x\)/);
  assert.match(game, /const floor=plantedFloorAt\(2,jackal\.x\)/);
  assert.match(game, /const floor=plantedFloorAt\(map,beast\.x\)/);
  assert.match(game, /if\(startedRef\.current&&\/\^\[1-5\]\$\/\.test\(k\)&&!e\.repeat\)\{selectUsableSlot\(Number\(k\)-1\);return;\}/);
  assert.match(game, /if\(inventoryOpenRef\.current\)\{inventoryOpenRef\.current=false;setInventoryOpen\(false\);\}/);
  assert.match(game, /if\(!worldMapOpenRef\.current\)deployQueued\.current=true/);
  assert.match(game, /const itemId=equippedRef\.current\[selectedSlotRef\.current\]/);
  assert.match(game, /const summonX=creatureEdgeAt\(map,pl\.x\+pl\.facing\*COMPANION_DEPLOY_DISTANCE\)/);
  assert.match(game, /keepCreatureOnRoad\(ally,map\)/);
  assert.match(game, /A late bind swaps onto the selected slot if all five are full/);

  const lateBinds = ["baby-dragon-card", "sunset-jackal-card-a", "cinder-fox-card", "pale-stag-card", "ember-lynx-card"];
  const full = lateBinds.slice();
  const afterLynx = nextUsableLoadout(full, "ember-lynx-card", 0);
  assert.deepEqual(afterLynx.equipped, full);
  assert.equal(afterLynx.replaced, null);

  const afterWyrm = nextUsableLoadout(full, "heart-wyrm-card", 0);
  assert.equal(afterWyrm.equipped[0], "heart-wyrm-card");
  assert.deepEqual(afterWyrm.equipped.slice(1), lateBinds.slice(1));
  assert.equal(afterWyrm.selected, 0);
  assert.equal(afterWyrm.replaced, "baby-dragon-card");

  const afterSelect = nextUsableLoadout(full, "heart-wyrm-card", 4);
  assert.equal(afterSelect.equipped[4], "heart-wyrm-card");
  assert.equal(afterSelect.selected, 4);
  assert.equal(afterSelect.replaced, "ember-lynx-card");

  const empty = [null, null, null, null, null];
  const firstBind = nextUsableLoadout(empty, "cinder-fox-card", 3);
  assert.equal(firstBind.equipped[0], "cinder-fox-card");
  assert.equal(firstBind.selected, 0);
  assert.equal(firstBind.replaced, null);
});

test("HUNT mark and stroked hurt still fire for fox, stag, and lynx", () => {
  assert.match(game, /const wildPackFor=\(map:MapId\)=>map===1\?roosts:map===2\?jackals:map===3\?foxes:map===4\?stags:map===5\?lynxes:map===6\?wyrmPack:null/);
  assert.match(game, /if\(map===1\)\{drawRoosts\(now\);return;\}/);
  assert.match(game, /if\(map===6\)\{for\(const wyrm of wyrmPack\)drawWyrm\(wyrm,now\);return;\}/);
  assert.match(game, /const pack=wildPackFor\(map\),card=wildCardFor\(map\)/);
  assert.match(game, /if\(!pack\|\|!card\|\|map===2\)return/);
  assert.match(game, /card\.id===CINDER_FOX_CARD\.id\?FOX_RENDER_SIZE:card\.id===PALE_STAG_CARD\.id\?STAG_RENDER_SIZE:card\.id===EMBER_LYNX_CARD\.id\?LYNX_RENDER_SIZE/);
  assert.match(game, /drawHurtNumber\(beast\.x\+recoilX,barY-16-hurtProgress\*18,beast\.lastDamage,hurtProgress,"#ffe7a8"\)/);
  assert.match(game, /drawHuntMark\(beast\.x\+recoilX,barY-26,now,currentHuntTarget\(\)===beast\); \/\/ fox\/stag\/lynx keep HUNT \+ stroked hurt/);
  assert.match(game, /ctx\.strokeText\("HUNT",0,-10\)/);
  assert.match(game, /ctx\.strokeText\("-"\+dmg,x,y\)/);
  assert.match(game, /createBeast\("cinder-fox-a",920,620,1480/);
  assert.match(game, /createBeast\("pale-stag-a",1760,1180,2680/);
  assert.match(game, /createBeast\("ember-lynx-a",1280,980,1680/);
  assert.match(game, /const COMPANION_STRIKE_DAMAGE = 5/);
  assert.match(game, /const SWORD_DAMAGE = 15/);
});

test("altar and map 5 east portal stay in camera when the player is on the rim", () => {
  const pad = num(/const CAM_EDGE_PAD = (\d+)/, "CAM_EDGE_PAD");
  const margin = num(/const PLAYER_EDGE_MARGIN = (\d+)/, "PLAYER_EDGE_MARGIN");
  const altarX = num(/const MAP6_HEART_X = (\d+)/, "MAP6_HEART_X") + 40;
  const heartX = num(/const MAP6_HEART_X = (\d+)/, "MAP6_HEART_X");
  const map5Exit = num(/const MAP5_EXIT_X = (\d+)/, "MAP5_EXIT_X");
  const map5W = num(/const MAP5_W = (\d+)/, "MAP5_W");
  const map6W = num(/const MAP6_W = (\d+)/, "MAP6_W");
  assert.equal(pad, 180);
  assert.equal(margin, 28);
  assert.match(game, /const cameraXFor=\(playerX:number,worldW:number,viewW:number\)=>clamp\(playerX-viewW\*\.38,-CAM_EDGE_PAD,Math\.max\(0,worldW-viewW\)\+CAM_EDGE_PAD\)/);
  assert.match(game, /const finishInCameraAt=\(landmarkX:number,playerX:number,worldW:number,viewW:number,inset=36\)=>\{const cam=cameraXFor\(playerX,worldW,viewW\);return landmarkX>=cam\+inset&&landmarkX<=cam\+viewW-inset;\}/);
  assert.match(game, /const cameraTarget=cameraXFor\(pl\.x,activeWorldW,viewW\)/);
  assert.match(game, /const PLAYER_EDGE_MARGIN = 28/);
  assert.match(game, /const keepCreatureOnRoad=\(creature:\{x:number;y:number;groundY:number\},map:MapId\)=>\{/);
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);

  const cameraXFor = (playerX, worldW, viewW) =>
    clamp(playerX - viewW * 0.38, -pad, Math.max(0, worldW - viewW) + pad);
  const finishInCameraAt = (landmarkX, playerX, worldW, viewW, inset = 36) => {
    const cam = cameraXFor(playerX, worldW, viewW);
    return landmarkX >= cam + inset && landmarkX <= cam + viewW - inset;
  };

  const viewWs = [960, 1280, 1440];
  for (const viewW of viewWs) {
    const map6Rim = map6W - margin;
    assert.equal(finishInCameraAt(altarX, map6Rim, map6W, viewW), true, `altar readable at map 6 rim, view ${viewW}`);
    assert.equal(finishInCameraAt(heartX, map6Rim, map6W, viewW), true, `heart readable at map 6 rim, view ${viewW}`);
    const map5Rim = map5W - margin;
    assert.equal(finishInCameraAt(map5Exit + 55, map5Rim, map5W, viewW), true, `map 5 east portal readable at rim, view ${viewW}`);
    assert.equal(finishInCameraAt(map5Exit, map5Rim, map5W, viewW), true, `map 5 east gate readable at rim, view ${viewW}`);
  }

  const map5 = extractPlatforms("map5Platforms");
  const map6 = extractPlatforms("map6Platforms");
  assert.notEqual(surfaceAt(map6, altarX), null, "altar stays on the road");
  assert.notEqual(surfaceAt(map5, map5Exit + 55), null, "map 5 east portal stays on the road");
});

test("maps 5–6 keep light east-approach scenery without new systems", () => {
  assert.match(game, /const MAP5_EAST_SCENERY_XS = \[5720,5935\] as const/);
  assert.match(game, /const MAP6_EAST_SCENERY_XS = \[6220,6395\] as const/);
  assert.match(game, /const eastProps=map===5\?MAP5_EAST_SCENERY_XS:map===6\?MAP6_EAST_SCENERY_XS:null/);
  assert.match(game, /const SCENERY_PROP_XS = \[380,760,1110,1490,1810,2190,2570,2940,3310,3710,4100,4510,4780,4980,5150,5420,5580,5860,6040,6280,6460,6640,6820,6980\] as const/);

  const map5 = extractPlatforms("map5Platforms");
  const map6 = extractPlatforms("map6Platforms");
  const map5Exit = num(/const MAP5_EXIT_X = (\d+)/, "MAP5_EXIT_X");
  const heartX = num(/const MAP6_HEART_X = (\d+)/, "MAP6_HEART_X");
  for (const x of [5720, 5935]) {
    assert.notEqual(surfaceAt(map5, x), null, `map 5 east scenery x=${x} needs road`);
    assert.ok(x < map5Exit, `map 5 east scenery x=${x} stays west of the portal`);
  }
  for (const x of [6220, 6395]) {
    assert.notEqual(surfaceAt(map6, x), null, `map 6 east scenery x=${x} needs road`);
    assert.ok(x < heartX, `map 6 east scenery x=${x} stays west of the heart`);
  }
});

test("locks hold: Moon Night, planted helpers, PR #10 numbers, no dating, no maps 7+", () => {
  assert.match(game, /PLAYER_NAME = "Moon Night"/);
  assert.match(campaign, /PLAYER_DISPLAY_NAME = "Moon Night"/);
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);
  assert.match(game, /const keepCreatureOnRoad=\(creature:\{x:number;y:number;groundY:number\},map:MapId\)=>\{/);
  assert.match(game, /const creatureEdgeAt=\(map:MapId,x:number\)=>clamp\(x,PLAYER_EDGE_MARGIN,worldWidthFor\(map\)-PLAYER_EDGE_MARGIN\)/);
  assert.match(game, /const MAP6_PULSE_X = 4400/);
  assert.match(game, /const nearPortalAt = \(x:number, portalX:number\) => Math\.abs\(x-\(portalX\+55\)\)<PORTAL_PROMPT_RANGE/);
  assert.match(game, /const beastCanStrikePlayer = \(beast:\{x:number;y:number\}, pl:\{x:number;y:number\}, range=JACKAL_ATTACK_RANGE, vertical=BEAST_ATTACK_VERTICAL\) => Math\.abs\(pl\.x-beast\.x\)<=range && Math\.abs\(\(pl\.y\+42\)-beast\.y\)<vertical/);
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
