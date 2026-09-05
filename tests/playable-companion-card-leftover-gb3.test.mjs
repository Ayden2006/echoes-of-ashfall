import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const game = await readFile(new URL("../app/game.tsx", import.meta.url), "utf8");
const campaign = await readFile(new URL("../lib/campaign.ts", import.meta.url), "utf8");
const art = await readFile(new URL("../ART_DIRECTION.md", import.meta.url), "utf8");

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
const easeInOut = (t) => t * t * (3 - 2 * t);
const PH = 92;
const PW = 46;
const STEP_HEIGHT = 32;
const ROAD_STEP_HEIGHT = 56;
const PLAYER_EDGE_MARGIN = 28;
const CARD_FLOOR_INSET = 22;
const CARD_WALL_CLEAR = 28;
const COMPANION_DEPLOY_DISTANCE = 285;
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

const gaitBlendAmt = (blendAt, now) => easeInOut(clamp((now - blendAt) / 260, 0, 1));
const flyLandAmt = (animal, now) =>
  animal.prevMode === "fly" && (animal.mode === "idle" || animal.mode === "walk" || animal.mode === "run")
    ? (1 - gaitBlendAmt(animal.modeBlendAt, now)) * 28
    : 0;
const companionIdleLeftover = (ally, groundAlly, now) => {
  const land = flyLandAmt(ally, now);
  if (!groundAlly) return land;
  const leftoverAir = Math.max(0, ally.groundY - ally.y);
  const hopPrev = (ally.prevMode === "run" || ally.mode === "run")
    ? Math.min(leftoverAir, Math.abs(Math.sin((ally.gait || 0) * 0.008)) * 38)
    : 0;
  return hopPrev * (1 - gaitBlendAmt(ally.modeBlendAt, now));
};

const followHoldAt = (plats, width, playerX, facing, mapId) => {
  const followX = creatureEdgeAt(width, playerX - facing * 104);
  const followHold = plantedFloorAt(plats, width, followX, mapId);
  const ally = { x: creatureEdgeAt(width, followHold.x), groundY: followHold.groundY, y: followHold.groundY };
  keepCreatureOnRoad(ally, plats, width, mapId);
  if (ally.y > ally.groundY) ally.y = ally.groundY;
  return ally;
};

const idleSeatAt = (plats, width, x, mapId) => {
  const idleSeat = plantedFloorAt(plats, width, x, mapId);
  const ally = { x: creatureEdgeAt(width, idleSeat.x), groundY: idleSeat.groundY, y: idleSeat.groundY };
  keepCreatureOnRoad(ally, plats, width, mapId);
  if (ally.y > ally.groundY) ally.y = ally.groundY;
  return ally;
};

const qDuringRecall = (plats, width, playerX, facing, mapId) => {
  const ally = { x: playerX - 900, y: 880, groundY: 430, recallStarted: 400 };
  ally.recallStarted = 0;
  const summonX = creatureEdgeAt(width, playerX + facing * COMPANION_DEPLOY_DISTANCE);
  const summonFloor = plantedFloorAt(plats, width, summonX, mapId);
  ally.x = creatureEdgeAt(width, summonFloor.x);
  ally.groundY = summonFloor.groundY;
  ally.y = summonFloor.groundY;
  keepCreatureOnRoad(ally, plats, width, mapId);
  if (ally.y > ally.groundY) ally.y = ally.groundY;
  return ally;
};

const recoverFromVoid = (plats, width, x, mapId) => {
  const floor = plantedFloorAt(plats, width, Math.max(120, x - 180), mapId);
  return { x: floor.x, y: floor.groundY - PH, groundY: floor.groundY };
};

const portalEnter = (plats, width, playerX, facing, mapId) => {
  const player = plantedFloorAt(plats, width, playerX, mapId);
  const seat = plantedFloorAt(plats, width, player.x - facing * 96, mapId);
  return {
    player,
    ally: { x: creatureEdgeAt(width, seat.x), groundY: seat.groundY, y: seat.groundY },
    heal: true,
    flashMs: 430,
  };
};

const assertPlanted = (mapId, body, label) => {
  const map = maps[mapId];
  assert.ok(body.x >= PLAYER_EDGE_MARGIN && body.x <= map.w - PLAYER_EDGE_MARGIN, `${label} stays on-map`);
  assert.notEqual(surfaceAt(map.plats, body.x), null, `${label} needs road`);
  assert.equal(standingInsideStone(map.plats, body.x, body.groundY), false, `${label} is not inside a stone`);
  assert.equal(cardBlockedAt(map.plats, mapId, body.x), false, `${label} stays off walls`);
  assert.ok(body.groundY >= 535, `${label} sits on the road, not a perch`);
  assert.ok(body.y <= body.groundY, `${label} must not sit underground`);
};

const closeStones = [
  { map: 2, x: 1680, y: 498, w: 150, road: 538, gap: 40, label: "shore 1680" },
  { map: 4, x: 5200, y: 500, w: 140, road: 545, gap: 45, label: "cliff 5200" },
  { map: 4, x: 5460, y: 500, w: 140, road: 555, gap: 55, label: "cliff 5460" },
  { map: 6, x: 5780, y: 490, w: 150, road: 545, gap: 55, label: "heart 5780" },
  { map: 6, x: 6080, y: 490, w: 150, road: 545, gap: 55, label: "heart 6080" },
  { map: 6, x: 6160, y: 490, w: 150, road: 545, gap: 55, label: "heart 6160" },
];

test("companionIdleLeftover + idleSeat + followHold still plant after #72 road-step; close leftover stones stay off allies", () => {
  assert.equal(num(/const STEP_HEIGHT = (\d+)/, "STEP_HEIGHT"), 32);
  assert.equal(num(/const ROAD_STEP_HEIGHT = (\d+)/, "ROAD_STEP_HEIGHT"), 56);
  assert.match(game, /const ROAD_STEP_HEIGHT = 56; \/\/ leftover maps 1\/3 road seams still hold walk\/slide; leftover stones keep STEP_HEIGHT; leftover maps 2\/4\/5\/6 walk\/slide still hold after #70 road-step/);
  assert.match(game, /const companionIdleLeftover = \(ally:\{mode:DragonMode;prevMode:DragonMode;modeBlendAt:number;gait:number;groundY:number;y:number\}, groundAlly:boolean, now:number\) => \{/);
  assert.match(game, /const leftover=companionIdleLeftover\(ally,groundAlly,now\)/);
  assert.match(game, /ally\.y\+=\(ally\.groundY-leftover-ally\.y\)\*\(1-Math\.exp\(-12\*dt\)\); \/\/ hop\/roost leftover still eases through idle after sleep→wake and portal reseat; leftover still plants after #72 road-step/);
  assert.match(game, /const idleSeat=!hunting\?plantedFloorAt\(map,ally\.x\):null; \/\/ leftover idle still plants after #72 road-step; close leftover stones stay STEP-only/);
  assert.match(game, /if\(idleSeat\)\{ally\.x=creatureEdgeAt\(map,idleSeat\.x\);ally\.groundY=idleSeat\.groundY;\}/);
  assert.match(game, /const followX=creatureEdgeAt\(map,pl\.x-pl\.facing\*104\)/);
  assert.match(game, /const followHold=!hunting\?plantedFloorAt\(map,followX\):null; \/\/ leftover follow still plants after #72 road-step; close leftover stones stay off allies/);
  assert.match(game, /const holdFollowX=followHold\?creatureEdgeAt\(map,followHold\.x\):followX/);
  assert.match(game, /const targetX=hunting\?hunted!\.x:holdFollowX/);
  assert.match(game, /const seat=!hunting\?plantedFloorAt\(map,followX\):null/);
  assert.match(game, /keepCreatureOnRoad\(ally,map\)/);
  assert.match(art, /Keep the heat local to coals, kiln mouths, and lynx-eye accents/);
  assert.match(art, /Keep the heart's glow local; do not wash the whole chamber in magenta/);

  const hops = companionIdleLeftover({
    mode: "idle", prevMode: "run", modeBlendAt: 0, gait: 200, groundY: 590, y: 552,
  }, true, 80);
  assert.ok(hops > 8, "run→idle still keeps leftover hop air after #72 road-step");
  assert.equal(companionIdleLeftover({
    mode: "idle", prevMode: "run", modeBlendAt: 0, gait: 200, groundY: 590, y: 590,
  }, true, 40), 0, "planted idle on the road does not invent hop air");

  for (const stone of closeStones) {
    const map = maps[stone.map];
    const mid = stone.x + stone.w / 2;
    assert.equal(surfaceAt(map.plats, mid), stone.road, `${stone.label} still sits over leftover road ${stone.road}`);
    assert.ok(stone.gap > STEP_HEIGHT && stone.gap <= ROAD_STEP_HEIGHT, `${stone.label} stays STEP-only leftover`);

    const idle = idleSeatAt(map.plats, map.w, mid, stone.map);
    assertPlanted(stone.map, idle, `${stone.label} idleSeat`);
    const leftover = companionIdleLeftover({
      mode: "idle", prevMode: "run", modeBlendAt: 0, gait: 180, groundY: idle.groundY, y: idle.y,
    }, true, 40);
    assert.equal(leftover, 0, `${stone.label} idle leftover stays planted`);

    for (const facing of [1, -1]) {
      const hold = followHoldAt(map.plats, map.w, mid, facing, stone.map);
      assertPlanted(stone.map, hold, `${stone.label} followHold facing ${facing}`);
      const rawFollow = creatureEdgeAt(map.w, mid - facing * 104);
      if (standingInsideStone(map.plats, rawFollow, surfaceAt(map.plats, rawFollow))) {
        assert.notEqual(hold.x, rawFollow, `${stone.label} followHold slides off the overlapping leftover stone`);
      }
    }
  }
});

test("card plant / Q/1–5 leftover still clears close leftover stones after #72 road-step", () => {
  assert.match(game, /if\(startedRef\.current&&\/\^\[1-5\]\$\/\.test\(k\)&&!e\.repeat\)\{selectUsableSlot\(Number\(k\)-1\);return;\} \/\/ leftover 1–5 still selects during recall after #63/);
  assert.match(game, /if\(!worldMapOpenRef\.current\)deployQueued\.current=true/);
  assert.match(game, /const summonFloor=plantedFloorAt\(map,summonX\); \/\/ Tab\/1–5\/Q deploy still plants off leftover stones after portal reseat; Q-during-recall leftover after #63 still clears thin stones; leftover still clears close leftover stones after #72 road-step/);
  assert.match(game, /const summonFloor=plantedFloorAt\(map,summonX\); \/\/ Tab\/1–5\/Q deploy still plants off leftover stones after portal reseat; leftover 1–5\/Q after #63 still clears thin stones; leftover still clears close leftover stones after #72 road-step/);
  assert.equal((game.match(/const summonFloor=plantedFloorAt\(map,summonX\); \/\/ Tab\/1–5\/Q deploy still plants off leftover stones after portal reseat/g) || []).length, 2);
  assert.match(game, /keepCreatureOnRoad\(ally,map\)/);
  assert.match(game, /if\(ally\.y>ally\.groundY\)ally\.y=ally\.groundY/);
  assert.match(game, /if\(platformsFor\(map\)\.some\(p=>p\.h<=24&&nx\+PW\*\.5>p\.x&&nx-PW\*\.5<p\.x\+p\.w&&p\.y<g-2&&p\.y\+p\.h>head\+2\)\)return null/);
  assert.match(game, /if\(!dragonCardCollected\)\{const floor=plantedFloorAt\(1,dragon\.x\);drawMagicalAnimalCard/);
  assert.match(game, /if\(droppedJackalCard&&!jackalCardsCollected\.has\(droppedJackalCard\.id\)\)\{const floor=plantedFloorAt\(2,jackal\.x\);drawMagicalAnimalCard/);
  assert.match(game, /if\(showCard&&!isCombatOnlyBeast\(beast\.id\)&&!otherWildCollected\.has\(card\.id\)\)\{const floor=plantedFloorAt\(mapRef\.current,beast\.x\);drawMagicalAnimalCard/);

  for (const stone of closeStones) {
    const map = maps[stone.map];
    const mid = stone.x + stone.w / 2;
    const card = plantedFloorAt(map.plats, map.w, mid, stone.map);
    assertPlanted(stone.map, { x: card.x, y: card.groundY, groundY: card.groundY }, `${stone.label} card plant`);
    assert.notEqual(card.x, mid, `${stone.label} card plant slides off the leftover stone`);

    for (const facing of [1, -1]) {
      const ally = qDuringRecall(map.plats, map.w, mid, facing, stone.map);
      assert.equal(ally.recallStarted, 0, `${stone.label} Q-during-recall facing ${facing} clears recall`);
      assertPlanted(stone.map, ally, `${stone.label} Q-during-recall facing ${facing}`);
    }
  }
});

test("campaign-loop leftover after #72 road-step: maps 1–6 void recover, portal heal/flash, altar E still fire", () => {
  assert.match(game, /if\(pl\.y>WORLD_H\+80\)\{const floor=plantedFloorAt\(map,Math\.max\(120,pl\.x-180\)\);pl\.x=floor\.x;pl\.y=plantedYAt\(map,floor\.x\);pl\.vy=0;pl\.grounded=true;pl\.jumpsLeft=2;pl\.crouched=false;pl\.sliding=false;slideUntil\.current=0;\} \/\/ void recover still plants after #60\/#61 companionIdleLeftover; maps 1–6 leftover still fire after #66 6460 vein skip; leftover still fires after #72 road-step/);
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);
  assert.doesNotMatch(game, /if\(pl\.y>WORLD_H\+80\)\{pl\.x=Math\.max\(120,pl\.x-180\);pl\.y=240/);
  assert.match(game, /if\(map===6&&Math\.abs\(x-MAP6_HEART_X\)<40\)continue; \/\/ leftover 6460 vein no longer sits on the heart after #64 afterCapture trim/);
  assert.match(game, /else if\(map===6&&atHeartAltar\(x\)\)\{ \/\/ altar E still wins after #56 Dell\/Rowan walk-out and #64 afterCapture trim; no nearby talk radius covers this window; leftover still fires after #66 scenery vein move/);
  assert.match(game, /else if\(map===6&&atHeartAltar\(pl\.x\)\)action=campaignEndedRef\.current\?"Rest at Ashfall's Heart":"Press E at Ashfall's Heart"; \/\/ altar prompt still wins after #56 Dell\/Rowan walk-out and #64 afterCapture trim; leftover still fires after #66 scenery vein move/);

  const enterMap = game.match(/const enterMap = useCallback\(\(map:MapId, from:MapId\|null=mapRef\.current\) => \{[\s\S]*?\},\[showDialogue,tone\]\);/);
  assert.ok(enterMap, "enterMap callback should stay intact after #72 road-step");
  assert.doesNotMatch(enterMap[0], /groundAt\(/);
  assert.match(enterMap[0], /pl\.health=pl\.maxHealth;staminaRef\.current=MAX_STAMINA/);
  assert.match(enterMap[0], /setHealth\(pl\.maxHealth\);setStamina\(MAX_STAMINA\); \/\/ portal heal still fires after companion reseat; leftover still fires after #70 groundAt signature; leftover still fires after #72 road-step/);
  assert.match(enterMap[0], /const arrivalGround=seat\.groundY; \/\/ companion portal reseat still plants after #38 floors; leftover still plants after #70 groundAt signature; leftover still plants after #72 road-step/);
  assert.match(enterMap[0], /portalFlashUntil\.current=performance\.now\(\)\+430; \/\/ portal flash still fires after companion reseat; leftover still fires after #70 groundAt signature; leftover still fires after #72 road-step/);
  assert.match(enterMap[0], /tone\(610,\.25,\.028\);window\.setTimeout\(\(\)=>tone\(360,\.2,\.02\),100\); \/\/ portal enter tone still fires after companion reseat; leftover still fires after #70 groundAt signature; leftover still fires after #72 road-step/);
  assert.match(enterMap[0], /const seat=plantedFloorAt\(map,pl\.x-pl\.facing\*96\)/);
  const healIdx = enterMap[0].indexOf("pl.health=pl.maxHealth");
  const reseatIdx = enterMap[0].indexOf("const seat=plantedFloorAt(map,pl.x-pl.facing*96)");
  const flashIdx = enterMap[0].indexOf("portalFlashUntil.current=performance.now()+430");
  assert.ok(healIdx >= 0 && reseatIdx > healIdx && flashIdx > reseatIdx, "heal, planted reseat, then flash still run in that order after #72 road-step");

  const heartX = num(/const MAP6_HEART_X = (\d+)/, "MAP6_HEART_X");
  const range = num(/const ALTAR_INTERACT_RANGE = (\d+)/, "ALTAR_INTERACT_RANGE");
  const veinX = num(/const MAP6_VEIN_X = (\d+)/, "MAP6_VEIN_X");
  assert.equal(heartX, 6470);
  assert.equal(range, 200);
  assert.equal(veinX, 5620);
  const atHeartAltar = (x) => Math.abs(x - heartX) < range;
  const skipNearHeart = (x) => Math.abs(x - heartX) < 40;
  assert.equal(skipNearHeart(6460), true, "shared 6460 vein sits on the heart and must stay undrawn");
  assert.ok(Math.abs(6460 - heartX) < CARD_WALL_CLEAR, "6460 is the leftover vein that sat on the heart");
  assert.ok(veinX + 140 < heartX - range, "studyable vein stays west of altar E after the scenery skip");

  const layouts = [
    { id: 1, voids: [2680, 6520, 7200] },
    { id: 2, voids: [1515, 1680, 5180, 5400] },
    { id: 3, voids: [1510, 4500, 5800] },
    { id: 4, voids: [2580, 5200, 5460, 6000] },
    { id: 5, voids: [1660, 5960, 6200] },
    { id: 6, voids: [2860, 5780, 6080, 6160, 6470, 6460, 8000] },
  ];
  for (const layout of layouts) {
    const map = maps[layout.id];
    assert.deepEqual(walkableGaps(map.plats, map.w), [], `map ${layout.id} stays gapless for leftover void recover after #72 road-step`);
    for (const x of layout.voids) {
      const recovered = recoverFromVoid(map.plats, map.w, x, layout.id);
      assertPlanted(layout.id, recovered, `map ${layout.id} void recover x=${x}`);
      assert.equal(recovered.y + PH, recovered.groundY, `map ${layout.id} void recover x=${x} stands on the planted floor`);
    }
  }

  const arrivals = [
    { map: 1, playerX: 230, facing: 1, label: "rain start" },
    { map: 2, playerX: 340, facing: 1, label: "shore west arrive" },
    { map: 2, playerX: maps[2].w - 340, facing: -1, label: "shore east return" },
    { map: 3, playerX: 340, facing: 1, label: "hollow west arrive" },
    { map: 4, playerX: 340, facing: 1, label: "cliff west arrive" },
    { map: 4, playerX: maps[4].w - 340, facing: -1, label: "cliff east return" },
    { map: 5, playerX: 340, facing: 1, label: "kiln west arrive" },
    { map: 5, playerX: maps[5].w - 340, facing: -1, label: "kiln east return" },
    { map: 6, playerX: 340, facing: 1, label: "heart west arrive" },
    { map: 6, playerX: maps[6].w - 340, facing: -1, label: "heart east return" },
  ];
  for (const scene of arrivals) {
    const map = maps[scene.map];
    const entered = portalEnter(map.plats, map.w, scene.playerX, scene.facing, scene.map);
    assert.equal(entered.heal, true, `map ${scene.map} ${scene.label} still heals`);
    assert.equal(entered.flashMs, 430, `map ${scene.map} ${scene.label} still flashes`);
    assertPlanted(scene.map, { x: entered.player.x, y: entered.player.groundY, groundY: entered.player.groundY }, `map ${scene.map} ${scene.label} player seat`);
    assertPlanted(scene.map, entered.ally, `map ${scene.map} ${scene.label} companion reseat`);
  }

  const altarX = heartX + 40;
  const rim = maps[6].w - PLAYER_EDGE_MARGIN;
  const recoverXs = [6470, 6460, altarX, rim, 8000].map((x) => recoverFromVoid(maps[6].plats, maps[6].w, x, 6).x);
  for (const x of [heartX, altarX, rim, ...recoverXs]) {
    assert.equal(atHeartAltar(x), true, `E still reaches the heart from x=${x} after #72 road-step`);
    assert.notEqual(surfaceAt(maps[6].plats, x), null, `altar stand x=${x} stays on the road`);
  }
});

test("locks hold: Moon Night, #19–#72 helpers, PR #10 numbers, talk tables, no dating, no maps 7+", () => {
  assert.match(game, /PLAYER_NAME = "Moon Night"/);
  assert.match(campaign, /PLAYER_DISPLAY_NAME = "Moon Night"/);
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);
  assert.match(game, /const keepCreatureOnRoad=\(creature:\{x:number;y:number;groundY:number\},map:MapId\)=>\{/);
  assert.match(game, /const companionIdleLeftover = \(ally:\{mode:DragonMode;prevMode:DragonMode;modeBlendAt:number;gait:number;groundY:number;y:number\}, groundAlly:boolean, now:number\) => \{/);
  assert.match(game, /const idleSeat=!hunting\?plantedFloorAt\(map,ally\.x\):null/);
  assert.match(game, /const followHold=!hunting\?plantedFloorAt\(map,followX\):null/);
  assert.match(game, /const ROAD_STEP_HEIGHT = 56/);
  assert.match(game, /const roadStepHold=\(grounded:boolean,oldBottom:number,ground:number\)=>/);
  assert.match(game, /const MAP6_PULSE_X = 4400/);
  assert.match(game, /const MAP6_VEIN_X = 5620/);
  assert.match(game, /const lateMapContactShade = \(map:MapId\) => map===5/);
  assert.match(game, /const COMPANION_HUNT_RANGE = 520/);
  assert.match(game, /const COMPANION_STRIKE_RANGE = 132/);
  assert.match(game, /const COMPANION_STRIKE_DAMAGE = 5/);
  assert.match(game, /const COMPANION_STRIKE_RECOVERY = 840/);
  assert.match(game, /const COMBAT_ONLY_AGGRO_RANGE = 220/);
  assert.match(game, /const EXTRA_CHASE_LEEWAY = 360/);
  assert.match(game, /const SWORD_DAMAGE = 15/);
  assert.doesNotMatch(game, /Moon Knight|bondMeter|dating sim|affectionMeter|romanceChoice|MAP7_/);
  assert.doesNotMatch(game, /radio encounter|tune the radio|drawPixelHouse|drawCastleKeep/i);
  assert.doesNotMatch(game, /map:\s*7|Map 7/);
  assert.equal((game.match(/firstTalk:\[/g) || []).length, 37);
  assert.equal((game.match(/againTalk:\[/g) || []).length, 37);
  assert.equal((game.match(/afterCaptureTalk:\[/g) || []).length, 37);
});
