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

const walkableGaps = (plats, width) => {
  const gaps = [];
  let gapStart = null;
  for (let x = 0; x <= width; x += 4) {
    const ground = surfaceAt(plats, x);
    if (ground == null) {
      if (gapStart == null) gapStart = x;
    } else if (gapStart != null) {
      gaps.push([gapStart, x - 4]);
      gapStart = null;
    }
  }
  if (gapStart != null) gaps.push([gapStart, width]);
  return gaps;
};

const num = (pattern, label) => {
  const match = game.match(pattern);
  assert.ok(match, label);
  return Number(match[1]);
};

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const PH = 92;
const PW = 46;
const PLAYER_EDGE_MARGIN = 28;
const CARD_FLOOR_INSET = 22;
const CARD_WALL_CLEAR = 28;
const SCENERY_PROP_XS = [380,760,1110,1490,1810,2190,2570,2940,3310,3710,4100,4510,4780,4980,5150,5420,5580,5860,6040,6280,6460,6640,6820,6980];
const maps = {
  1: { w: 7200, plats: extractPlatforms("map1Platforms") },
  2: { w: 5400, plats: extractPlatforms("map2Platforms") },
  3: { w: 5800, plats: extractPlatforms("map3Platforms") },
  4: { w: 6000, plats: extractPlatforms("map4Platforms") },
  5: { w: 6200, plats: extractPlatforms("map5Platforms") },
  6: { w: 6600, plats: extractPlatforms("map6Platforms") },
};

const cardBlockedAt = (plats, map, x) => {
  if (SCENERY_PROP_XS.some((px) => Math.abs(px - x) < CARD_WALL_CLEAR)) return true;
  if (map === 6) {
    for (let i = 0; i < 17; i++) {
      if (Math.abs((240 + i * 430) - x) < 26) return true;
    }
  }
  const plat = plats.filter((p) => p.h > 80 && x >= p.x && x <= p.x + p.w).sort((a, b) => Math.abs(a.y - 590) - Math.abs(b.y - 590))[0];
  if (!plat) return true;
  return x < plat.x + CARD_FLOOR_INSET || x > plat.x + plat.w - CARD_FLOOR_INSET;
};

const standingInsideStone = (plats, x, ground) => {
  const head = ground - PH;
  return plats.some((p) => p.h <= 24 && x + PW * 0.5 > p.x && x - PW * 0.5 < p.x + p.w && p.y < ground - 2 && p.y + p.h > head + 2);
};

const plantedFloorAt = (plats, width, x, map = 0) => {
  let px = clamp(x, 48, width - 48);
  const hit = (nx) => surfaceAt(plats, nx);
  const clear = (nx) => {
    const g = hit(nx);
    if (g == null || cardBlockedAt(plats, map, nx)) return null;
    if (standingInsideStone(plats, nx, g)) return null;
    return g;
  };
  if (clear(px) != null) return { x: px, groundY: clear(px) };
  for (let d = 8; d <= 420; d += 8) {
    const left = px - d, right = px + d;
    if (left >= 48 && clear(left) != null) return { x: left, groundY: clear(left) };
    if (right <= width - 48 && clear(right) != null) return { x: right, groundY: clear(right) };
  }
  return { x: px, groundY: hit(px) ?? 590 };
};

const creatureEdgeAt = (width, x) => clamp(x, PLAYER_EDGE_MARGIN, width - PLAYER_EDGE_MARGIN);
const keepCreatureOnRoad = (creature, plats, width, map = 0) => {
  creature.x = creatureEdgeAt(width, creature.x);
  const ground = surfaceAt(plats, creature.x);
  if (ground != null) {
    creature.groundY = ground;
    if (creature.y > ground + 28) creature.y = ground;
    if (creature.y > ground) creature.y = ground;
    return ground;
  }
  const floor = plantedFloorAt(plats, width, creature.x, map);
  creature.x = creatureEdgeAt(width, floor.x);
  creature.groundY = floor.groundY;
  if (creature.y > floor.groundY + 28) creature.y = floor.groundY;
  if (creature.y > floor.groundY) creature.y = floor.groundY;
  return floor.groundY;
};

const nextUsableLoadout = (equipped, itemId, selected) => {
  const next = equipped.slice();
  const already = next.indexOf(itemId);
  if (already >= 0) return { equipped: next, selected: already, replaced: null };
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

const spawnFor = (mapId, from) => {
  const map = maps[mapId];
  const plant = (rawX) => {
    const floor = plantedFloorAt(map.plats, map.w, rawX, mapId);
    return { x: floor.x, y: floor.groundY - PH, groundY: floor.groundY };
  };
  if (from === null) return plant(230);
  if (mapId === 1) return plant(6860);
  const arrivingFromPrev = (mapId === 2 && from === 1) || (mapId === 3 && from === 2) || (mapId === 4 && from === 3) || (mapId === 5 && from === 4) || (mapId === 6 && from === 5);
  if (arrivingFromPrev) return plant(340);
  return plant(Math.max(240, map.w - 340));
};

const recoverFromVoid = (plats, width, x, mapId) => {
  const floor = plantedFloorAt(plats, width, Math.max(120, x - 180), mapId);
  return { x: floor.x, y: floor.groundY - PH, groundY: floor.groundY };
};

const assertPlanted = (mapId, point, label) => {
  const map = maps[mapId];
  assert.ok(point.x >= 48 && point.x <= map.w - 48, `${label} stays on-map`);
  assert.notEqual(surfaceAt(map.plats, point.x), null, `${label} needs road`);
  assert.equal(point.y + PH, point.groundY, `${label} stands on the planted floor`);
  assert.equal(standingInsideStone(map.plats, point.x, point.groundY), false, `${label} is not inside a stone`);
  assert.equal(cardBlockedAt(map.plats, mapId, point.x), false, `${label} stays off walls`);
};

test("maps 1–6 stay gapless with planted spawn, respawn, void recover, and portal heal+flash", () => {
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);
  assert.match(game, /if\(from===null\)\{const floor=plantedFloorAt\(1,230\);return \{x:floor\.x,y:plantedYAt\(1,floor\.x\),facing:1/);
  assert.match(game, /const floor=plantedFloorAt\(mapRef\.current,respawnXFor\(mapRef\.current\)\);pl\.x=floor\.x;pl\.y=plantedYAt\(mapRef\.current,pl\.x\)/);
  assert.match(game, /if\(pl\.y>WORLD_H\+80\)\{const floor=plantedFloorAt\(map,Math\.max\(120,pl\.x-180\)\);pl\.x=floor\.x;pl\.y=plantedYAt\(map,floor\.x\);pl\.vy=0;pl\.grounded=true/);

  const enterMap = game.match(/const enterMap = useCallback\(\(map:MapId, from:MapId\|null=mapRef\.current\) => \{[\s\S]*?\},\[showDialogue,tone\]\);/);
  assert.ok(enterMap, "enterMap callback should stay intact");
  assert.match(enterMap[0], /pl\.health=pl\.maxHealth;staminaRef\.current=MAX_STAMINA/);
  assert.match(enterMap[0], /setHealth\(pl\.maxHealth\);setStamina\(MAX_STAMINA\); \/\/ portal heal still fires after companion reseat/);
  assert.match(enterMap[0], /portalFlashUntil\.current=performance\.now\(\)\+430; \/\/ portal flash still fires after companion reseat/);
  const healIdx = enterMap[0].indexOf("pl.health=pl.maxHealth");
  const reseatIdx = enterMap[0].indexOf("const seat=plantedFloorAt(map,pl.x-pl.facing*96)");
  const flashIdx = enterMap[0].indexOf("portalFlashUntil.current=performance.now()+430");
  assert.ok(healIdx >= 0 && reseatIdx > healIdx && flashIdx > reseatIdx, "heal, planted reseat, then flash still run in that order");

  const layouts = [
    { id: 1, portals: [7070 + 55], from: [null, 2], respawn: 230, voids: [2680, 6520, 7200] },
    { id: 2, portals: [105 + 55, 5270 + 55], from: [1, 3], respawn: 340, voids: [1515, 5180, 5400] },
    { id: 3, portals: [105 + 55, 5670 + 55], from: [2, 4], respawn: 340, voids: [1510, 4500, 5800] },
    { id: 4, portals: [105 + 55, 5870 + 55], from: [3, 5], respawn: 340, voids: [2580, 5320, 6000] },
    { id: 5, portals: [105 + 55, 6070 + 55], from: [4, 6], respawn: 340, voids: [1660, 5960, 6200] },
    { id: 6, portals: [105 + 55, 6470], from: [5], respawn: 340, voids: [2860, 6100, 6470, 8000] },
  ];

  for (const layout of layouts) {
    const map = maps[layout.id];
    assert.deepEqual(walkableGaps(map.plats, map.w), [], `map ${layout.id} should have no walkable void gaps`);
    for (const x of layout.portals) {
      assert.notEqual(surfaceAt(map.plats, x), null, `map ${layout.id} portal x=${x} needs solid ground`);
    }
    for (const from of layout.from) {
      const spawn = spawnFor(layout.id, from);
      assertPlanted(layout.id, spawn, `map ${layout.id} spawn from ${from}`);
      assert.ok(spawn.x >= PLAYER_EDGE_MARGIN && spawn.x <= map.w - PLAYER_EDGE_MARGIN, `map ${layout.id} spawn stays on-map`);
    }
    const respawn = plantedFloorAt(map.plats, map.w, layout.respawn, layout.id);
    assertPlanted(layout.id, { x: respawn.x, y: respawn.groundY - PH, groundY: respawn.groundY }, `map ${layout.id} respawn`);
    for (const x of layout.voids) {
      const recovered = recoverFromVoid(map.plats, map.w, x, layout.id);
      assertPlanted(layout.id, recovered, `map ${layout.id} void recover x=${x}`);
    }
  }
});

test("heart altar stays E-reachable in camera after planted void recover, and no NPC/landmark steals E", () => {
  const pad = num(/const CAM_EDGE_PAD = (\d+)/, "CAM_EDGE_PAD");
  const margin = num(/const PLAYER_EDGE_MARGIN = (\d+)/, "PLAYER_EDGE_MARGIN");
  const heartX = num(/const MAP6_HEART_X = (\d+)/, "MAP6_HEART_X");
  const altarX = heartX + 40;
  const pulseX = num(/const MAP6_PULSE_X = (\d+)/, "MAP6_PULSE_X");
  const range = num(/const ALTAR_INTERACT_RANGE = (\d+)/, "ALTAR_INTERACT_RANGE");
  const map6W = maps[6].w;
  assert.equal(pulseX, 4400);
  assert.match(game, /const atHeartAltar=\(x:number\)=>Math\.abs\(x-MAP6_HEART_X\)<ALTAR_INTERACT_RANGE/);
  assert.match(game, /else if\(map===6&&atHeartAltar\(x\)\)\{/);
  assert.match(game, /else if\(map===6&&atHeartAltar\(pl\.x\)\)action=campaignEndedRef\.current\?"Rest at Ashfall's Heart":"Press E at Ashfall's Heart"/);

  const atHeartAltar = (x) => Math.abs(x - heartX) < range;
  const cameraXFor = (playerX, worldW, viewW) =>
    clamp(playerX - viewW * 0.38, -pad, Math.max(0, worldW - viewW) + pad);
  const finishInCameraAt = (landmarkX, playerX, worldW, viewW, inset = 36) => {
    const cam = cameraXFor(playerX, worldW, viewW);
    return landmarkX >= cam + inset && landmarkX <= cam + viewW - inset;
  };

  const rim = map6W - margin;
  const recoverXs = [6470, altarX, rim, 8000].map((x) => recoverFromVoid(maps[6].plats, map6W, x, 6).x);
  const stands = [heartX, altarX, rim, ...recoverXs];
  for (const x of stands) {
    assert.equal(atHeartAltar(x), true, `E still reaches the heart from x=${x}`);
    assert.notEqual(surfaceAt(maps[6].plats, x), null, `altar stand x=${x} stays on the road`);
    for (const viewW of [960, 1280, 1440]) {
      assert.equal(finishInCameraAt(heartX, x, map6W, viewW), true, `heart readable at x=${x}, view ${viewW}`);
      assert.equal(finishInCameraAt(altarX, x, map6W, viewW), true, `altar readable at x=${x}, view ${viewW}`);
    }
  }

  const edan = 4900, echo = 5920, vein = 5620;
  assert.ok(edan + 150 < heartX - range, "Edan talk does not cover the altar E window");
  assert.ok(echo + 120 < heartX - range, "echo-stone study does not cover the altar E window");
  assert.ok(vein + 140 < heartX - range, "cooled vein study does not cover the altar E window");
  assert.match(game, /\{id:"edan",name:"Edan",map:6,x:4900,talkRadius:150/);
  assert.match(game, /\{map:6,x:MAP6_ECHO_X,groundY:430,radius:120/);
  assert.match(game, /\{map:6,x:MAP6_VEIN_X,groundY:545,radius:140/);
});

test("companion pickup E → Tab/1–5 → Q deploy → hunt → recall → Q-during-recall reseat still plants", () => {
  assert.match(game, /if \(k==="e"&&!e\.repeat\)\{pickupQueued\.current=true;interact\(\);\}/);
  assert.match(game, /if\(startedRef\.current&&\/\^\[1-5\]\$\/\.test\(k\)&&!e\.repeat\)\{selectUsableSlot\(Number\(k\)-1\);return;\}/);
  assert.match(game, /if\(startedRef\.current&&k==="q"&&!e\.repeat\)\{/);
  assert.match(game, /if\(!worldMapOpenRef\.current\)deployQueued\.current=true/);
  assert.match(game, /const nextUsableLoadout=\(equipped:\(string\|null\)\[\],itemId:string,selected:number\)=>\{/);
  assert.match(game, /if\(nearDragonCard&&collectInventoryItem\(BABY_DRAGON_CARD\)\)\{\n {10}dragonCardCollected=true;toggleEquippedItem\(BABY_DRAGON_CARD\.id\)/);
  assert.match(game, /else if\(readyOtherWild&&otherWildCard&&collectInventoryItem\(otherWildCard\)\)\{\n {10}otherWildCollected\.add\(otherWildCard\.id\);toggleEquippedItem\(otherWildCard\.id\)/);
  assert.match(game, /const summonX=creatureEdgeAt\(map,pl\.x\+pl\.facing\*COMPANION_DEPLOY_DISTANCE\)/);
  assert.match(game, /const summonFloor=plantedFloorAt\(map,summonX\)/);
  assert.match(game, /if\(ally\.recallStarted===0\)\{const direction:1\|-1=ally\.x>=pl\.x\?1:-1;ally\.recallStarted=now/);
  assert.match(game, /ally\.recallStarted=0;\n {14}const summonX=creatureEdgeAt\(map,pl\.x\+pl\.facing\*COMPANION_DEPLOY_DISTANCE\)/);
  assert.match(game, /keepCreatureOnRoad\(ally,map\)/);
  assert.match(game, /if\(hunting&&hunted\)\{ally\.targetX=hunted\.x;ally\.attackUntil=now\+1600;\}/);
  assert.match(game, /if\(Math\.abs\(pl\.x-ally\.x\)>COMPANION_TELEPORT_DISTANCE&&!stayForHunt\)/);
  assert.match(game, /if\(now-ally\.recallStarted>=COMPANION_RECALL_DURATION\)\{ally\.active=false;ally\.itemId=null;ally\.recallStarted=0;setDeployedItemId\(null\);\}/);

  const empty = [null, null, null, null, null];
  const afterPickup = nextUsableLoadout(empty, "baby-dragon-card", 0);
  assert.equal(afterPickup.equipped[0], "baby-dragon-card");
  assert.equal(afterPickup.selected, 0);

  const afterSelect = nextUsableLoadout(afterPickup.equipped, "baby-dragon-card", 3);
  assert.equal(afterSelect.selected, 0, "Tab/1–5 on an already-held card focuses that slot for Q");

  const COMPANION_DEPLOY_DISTANCE = 285;
  const COMPANION_TELEPORT_DISTANCE = 720;
  const COMPANION_HUNT_RANGE = 520;
  const COMPANION_STRIKE_RANGE = 132;
  const stayForHunt = (plX, allyX, huntedX) =>
    Math.abs(plX - huntedX) < COMPANION_HUNT_RANGE + 140 && Math.abs(allyX - huntedX) < COMPANION_TELEPORT_DISTANCE;
  const shouldTeleport = (plX, allyX, huntedX) => Math.abs(plX - allyX) > COMPANION_TELEPORT_DISTANCE && !stayForHunt(plX, allyX, huntedX);

  const scenes = [
    { map: 1, playerX: 1710, facing: 1, huntedX: 1710 },
    { map: 5, playerX: 2140, facing: 1, huntedX: 4520 },
    { map: 6, playerX: 2480, facing: 1, huntedX: 4400 },
  ];
  for (const scene of scenes) {
    const map = maps[scene.map];
    const summonX = creatureEdgeAt(map.w, scene.playerX + scene.facing * COMPANION_DEPLOY_DISTANCE);
    const summonFloor = plantedFloorAt(map.plats, map.w, summonX, scene.map);
    const ally = { x: scene.playerX - 900, y: 880, groundY: 430, recallStarted: 400 };
    ally.recallStarted = 0;
    ally.x = creatureEdgeAt(map.w, summonFloor.x);
    ally.groundY = summonFloor.groundY;
    ally.y = summonFloor.groundY;
    keepCreatureOnRoad(ally, map.plats, map.w, scene.map);
    if (ally.y > ally.groundY) ally.y = ally.groundY;
    assert.equal(ally.recallStarted, 0, `map ${scene.map} Q-during-recall clears recall`);
    assertPlanted(scene.map, { x: ally.x, y: ally.groundY - PH, groundY: ally.groundY }, `map ${scene.map} Q-during-recall reseat`);
    assert.ok(ally.y <= ally.groundY, `map ${scene.map} reseat must not sit underground`);
    assert.equal(shouldTeleport(scene.playerX, scene.playerX - 900, scene.huntedX), true, `map ${scene.map} stuck ally still teleports into the hunt`);
    assert.equal(Math.abs(scene.huntedX - ally.x) < COMPANION_STRIKE_RANGE || Math.abs(scene.playerX - ally.x) < COMPANION_DEPLOY_DISTANCE + 80, true);
  }

  assert.equal(shouldTeleport(2680, 2680 - 800, 2680), true);
  assert.equal(Math.abs(200 + 120 - 200) < COMPANION_STRIKE_RANGE, true);
  assert.equal(COMPANION_HUNT_RANGE, 520);
  assert.equal(COMPANION_STRIKE_RANGE, 132);
});

test("late-map HUNT, ALLY · HUNT, hurt, and portal tags keep the #48 late stroke", () => {
  assert.match(game, /const lateMapContactShade = \(map:MapId\) => map===5/);
  assert.match(game, /const huntTag=currentHuntTarget\(\)\?" · HUNT":""/);
  assert.match(game, /const late=lateMapContactShade\(mapRef\.current\)/);
  assert.match(game, /ctx\.lineWidth=late\?4:3;ctx\.strokeStyle=late\?"rgba\(6,2,4,\.96\)":"rgba\(2,6,8,\.92\)";ctx\.strokeText\(`ALLY · \$\{companionName\}\$\{huntTag\}  \$\{Math\.ceil\(ally\.health\)\} \/ \$\{ally\.maxHealth\}`/);
  assert.match(game, /ctx\.lineWidth=late\?4:3;ctx\.strokeStyle=late\?"rgba\(6,2,4,\.96\)":"rgba\(4,10,6,\.9\)";ctx\.strokeText\("HUNT",0,-10\)/);
  assert.match(game, /ctx\.lineWidth=late\?5:4;ctx\.strokeStyle=late\?"rgba\(4,2,6,\.96\)":"rgba\(8,4,8,\.92\)";ctx\.strokeText\("-"\+dmg,x,y\)/);
  assert.match(game, /ctx\.lineWidth=late\?5:4;ctx\.strokeStyle=late\?"rgba\(6,2,4,\.96\)":"rgba\(6,8,10,\.88\)";ctx\.strokeText\(label,cx,groundY-188\)/);
  assert.match(game, /ctx\.strokeText\("PRESS E",cx,groundY-174\)/);
  assert.match(game, /ctx\.fillStyle=near\|\|late\?"#fff6d2":"rgba\("\+portalColor\+","\+\(\.55\+tagPulse\*\.25\)\+"\)"/);
  assert.match(game, /drawHuntMark\(wyrm\.x\+recoilX,barY-28,now,currentHuntTarget\(\)===wyrm\)/);
  assert.match(game, /drawHuntMark\(beast\.x\+recoilX,barY-26,now,currentHuntTarget\(\)===beast\); \/\/ fox\/stag\/lynx keep HUNT \+ stroked hurt/);
  assert.doesNotMatch(game, /ctx\.lineWidth=3;ctx\.strokeStyle="rgba\(2,6,8,\.92\)";ctx\.strokeText\(`ALLY · \$\{companionName\}/);
});

test("locks hold: Moon Night, planted helpers, PR #10 numbers, Hale / talk tables, no dating, no maps 7+", () => {
  assert.match(game, /PLAYER_NAME = "Moon Night"/);
  assert.match(campaign, /PLAYER_DISPLAY_NAME = "Moon Night"/);
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);
  assert.match(game, /const keepCreatureOnRoad=\(creature:\{x:number;y:number;groundY:number\},map:MapId\)=>\{/);
  assert.match(game, /const idleSeat=!hunting\?plantedFloorAt\(map,ally\.x\):null/);
  assert.match(game, /const huntSeat=hunting&&hunted&&"groundY" in hunted\?\(hunted as \{groundY:number\}\)\.groundY:playerGround/);
  assert.match(game, /const MAP6_PULSE_X = 4400/);
  assert.match(game, /\{id:"hale",name:"Hale",map:5,x:4040/);
  assert.match(game, /const COMPANION_HUNT_RANGE = 520/);
  assert.match(game, /const COMPANION_STRIKE_RANGE = 132/);
  assert.match(game, /const COMPANION_STRIKE_DAMAGE = 5/);
  assert.match(game, /const COMPANION_STRIKE_RECOVERY = 840/);
  assert.match(game, /const COMBAT_ONLY_AGGRO_RANGE = 220/);
  assert.match(game, /const EXTRA_CHASE_LEEWAY = 360/);
  assert.doesNotMatch(game, /Moon Knight|bondMeter|dating sim|affectionMeter|romanceChoice|MAP7_/);
  assert.doesNotMatch(game, /radio encounter|tune the radio|drawPixelHouse|drawCastleKeep/i);
  assert.doesNotMatch(game, /map:\s*7|Map 7/);
  assert.equal((game.match(/firstTalk:\[/g) || []).length, 37);
  assert.equal((game.match(/againTalk:\[/g) || []).length, 37);
  assert.equal((game.match(/afterCaptureTalk:\[/g) || []).length, 37);
});
