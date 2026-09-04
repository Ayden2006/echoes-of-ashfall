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

const plantedFloorAt = (plats, width, x, map = 0) => {
  let px = clamp(x, 48, width - 48);
  const hit = (nx) => surfaceAt(plats, nx);
  const clear = (nx) => (hit(nx) != null && !cardBlockedAt(plats, map, nx) ? hit(nx) : null);
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

test("softlock markers: maps 1–6 stay gapless after stones/east scenery, portals planted, pulse→altar walkable", () => {
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);
  assert.match(game, /const MAP6_PULSE_X = 4400/);
  assert.match(game, /const MAP5_EAST_SCENERY_XS = \[5720,5935\] as const/);
  assert.match(game, /const MAP6_EAST_SCENERY_XS = \[6220,6395\] as const/);
  assert.match(game, /if\(pl\.y>WORLD_H\+80\)\{pl\.x=Math\.max\(120,pl\.x-180\);pl\.y=240/);
  assert.match(game, /if\(ally\.y>ally\.groundY\+28\)ally\.y=ally\.groundY/);
  assert.match(game, /if\(creature\.y>ground\+28\)creature\.y=ground/);
  assert.match(game, /if\(creature\.y>ground\)creature\.y=ground/);

  const pulseX = num(/const MAP6_PULSE_X = (\d+)/, "MAP6_PULSE_X");
  const heartX = num(/const MAP6_HEART_X = (\d+)/, "MAP6_HEART_X");
  const altarX = heartX + 40;
  const layouts = [
    { id: 1, w: maps[1].w, plats: maps[1].plats, portals: [7070 + 55], spawns: [230, 6860] },
    { id: 2, w: maps[2].w, plats: maps[2].plats, portals: [105 + 55, 5270 + 55], spawns: [340, 5060] },
    { id: 3, w: maps[3].w, plats: maps[3].plats, portals: [105 + 55, 5670 + 55], spawns: [340, 5460] },
    { id: 4, w: maps[4].w, plats: maps[4].plats, portals: [105 + 55, 5870 + 55], spawns: [340, 5660] },
    { id: 5, w: maps[5].w, plats: maps[5].plats, portals: [105 + 55, 6070 + 55], spawns: [340, 5860] },
    { id: 6, w: maps[6].w, plats: maps[6].plats, portals: [105 + 55, 6470], spawns: [340] },
  ];

  for (const map of layouts) {
    assert.deepEqual(walkableGaps(map.plats, map.w), [], `map ${map.id} should have no walkable void gaps`);
    for (const x of map.portals) {
      assert.notEqual(surfaceAt(map.plats, x), null, `map ${map.id} portal x=${x} needs solid ground`);
    }
    for (const x of map.spawns) {
      const ground = surfaceAt(map.plats, x);
      assert.notEqual(ground, null, `map ${map.id} spawn x=${x} needs solid ground`);
      assert.equal(ground - 92 + 92, ground, `map ${map.id} planted spawn stands on the surface`);
    }
    let prev = surfaceAt(map.plats, PLAYER_EDGE_MARGIN);
    for (let x = PLAYER_EDGE_MARGIN; x <= map.w - PLAYER_EDGE_MARGIN; x += 4) {
      const ground = surfaceAt(map.plats, x);
      assert.notEqual(ground, null, `map ${map.id} road x=${x} must stay walkable`);
      if (prev != null && ground != null) {
        assert.ok(prev - ground <= 106, `map ${map.id} road rise at x=${x} stays inside a jump`);
      }
      if (ground != null) prev = ground;
    }
  }

  for (let x = pulseX; x <= altarX; x += 4) {
    assert.notEqual(surfaceAt(maps[6].plats, x), null, `map 6 pulse→altar x=${x} must stay walkable`);
  }
  for (const x of [5720, 5935]) {
    assert.notEqual(surfaceAt(maps[5].plats, x), null, `map 5 east scenery x=${x} needs road`);
  }
  for (const x of [6220, 6395]) {
    assert.notEqual(surfaceAt(maps[6].plats, x), null, `map 6 east scenery x=${x} needs road`);
  }
});

test("gait blends cover walk↔run↔attack↔sleep without a new animation system", () => {
  assert.match(game, /const MODE_BLEND_MS = 260/);
  assert.match(game, /const gaitBlendAmt = \(blendAt:number, now:number\)=>easeInOut\(clamp\(\(now-blendAt\)\/MODE_BLEND_MS,0,1\)\)/);
  assert.match(game, /const locoCadence = \(mode:DragonMode, walk=180, run=110\)=>mode==="run"\?run:walk/);
  assert.match(game, /const locoPoseMode = \(animal:\{mode:DragonMode;prevMode:DragonMode;modeBlendAt:number\}, now:number\)/);
  assert.match(game, /if\(blend<0\.42&&\(animal\.prevMode==="walk"\|\|animal\.prevMode==="run"\|\|animal\.prevMode==="attack"\)&&\(animal\.mode==="walk"\|\|animal\.mode==="run"\|\|animal\.mode==="attack"\|\|animal\.mode==="idle"\)\) return animal\.prevMode/);
  assert.match(game, /const gaitBlend=gaitBlendAmt\(modeBlendAt,now\)/);
  assert.match(game, /const runCycle=\(loco\/\(locoCadence\(prevMode\)\+\(locoCadence\(mode\)-locoCadence\(prevMode\)\)\*gaitBlend\)\)%1/);
  assert.match(game, /const frontSwing=swingFrom\.front\+\(swingTo\.front-swingFrom\.front\)\*gaitBlend/);
  assert.match(game, /const backSwing=swingFrom\.back\+\(swingTo\.back-swingFrom\.back\)\*gaitBlend/);
  assert.match(game, /const sleepBlend=mode==="sleep"\?easeInOut\(clamp\(elapsed\/MODE_BLEND_MS,0,1\)\):0/);
  assert.match(game, /const sleepPose=sleepPoseAmt\(mode,prevMode,modeBlendAt,now,elapsed\)/);
  assert.match(game, /const flapPhase = \(gait:number\)=>\{/);
  assert.match(game, /const hopArc = \(t:number, height:number\)=>\{/);
  assert.match(game, /else if\(dragon\.mode==="walk"\)index=Math\.floor\(gait\/220\)%frames\.length/);
  assert.match(game, /else if\(dragon\.mode==="run"\)index=Math\.floor\(gait\/95\)%frames\.length/);
  assert.match(game, /else if\(dragon\.mode==="fly"\)index=flapFrame\(gait,frames\.length\)/);
  assert.match(game, /const poseMode=locoPoseMode\(dragon,now\)/);
  assert.match(game, /const poseMode=locoPoseMode\(ally,now\)/);
  assert.match(game, /const hopBlend=hopPrev\+\(hop-hopPrev\)\*easeInOut/);
  assert.doesNotMatch(game, /new AnimationSystem|skeletonRig|spineRuntime|createGaitMachine/);

  const easeInOut = (t) => t * t * (3 - 2 * t);
  const gaitBlendAmt = (blendAt, now) => easeInOut(Math.max(0, Math.min(1, (now - blendAt) / 260)));
  const locoCadence = (mode, walk = 180, run = 110) => (mode === "run" ? run : walk);
  const locoPoseMode = (animal, now) => {
    const blend = gaitBlendAmt(animal.modeBlendAt, now);
    if (animal.mode === "sleep" || animal.prevMode === "sleep") return animal.mode;
    if (blend < 0.5 && (animal.prevMode === "fly" || animal.prevMode === "run") && (animal.mode === "idle" || animal.mode === "walk")) return animal.prevMode;
    if (blend < 0.42 && (animal.prevMode === "walk" || animal.prevMode === "run" || animal.prevMode === "attack") && (animal.mode === "walk" || animal.mode === "run" || animal.mode === "attack" || animal.mode === "idle")) return animal.prevMode;
    return animal.mode;
  };
  assert.equal(locoPoseMode({ mode: "run", prevMode: "walk", modeBlendAt: 0 }, 80), "walk");
  assert.equal(locoPoseMode({ mode: "attack", prevMode: "run", modeBlendAt: 0 }, 60), "run");
  assert.equal(locoPoseMode({ mode: "walk", prevMode: "run", modeBlendAt: 0 }, 80), "run");
  assert.equal(locoPoseMode({ mode: "sleep", prevMode: "walk", modeBlendAt: 0 }, 40), "sleep");
  assert.equal(locoPoseMode({ mode: "run", prevMode: "walk", modeBlendAt: 0 }, 260), "run");
  const mid = locoCadence("walk") + (locoCadence("run") - locoCadence("walk")) * gaitBlendAmt(0, 130);
  assert.ok(mid > 110 && mid < 180, "walk↔run cadence should ease through MODE_BLEND");
});

test("Q deploy after a #28 inventory swap reseats the companion on the road", () => {
  assert.match(game, /const nextUsableLoadout=\(equipped:\(string\|null\)\[\],itemId:string,selected:number\)=>\{/);
  assert.match(game, /const loadout=nextUsableLoadout\(current,itemId,selectedSlotRef\.current\)/);
  assert.match(game, /if\(ally\.active&&ally\.itemId===loadout\.replaced&&ally\.recallStarted===0\)/);
  assert.match(game, /const summonX=creatureEdgeAt\(map,pl\.x\+pl\.facing\*COMPANION_DEPLOY_DISTANCE\)/);
  assert.match(game, /const summonFloor=plantedFloorAt\(map,summonX\)/);
  assert.match(game, /ally\.x=creatureEdgeAt\(map,summonFloor\.x\)/);
  assert.match(game, /keepCreatureOnRoad\(ally,map\)/);
  assert.match(game, /if\(ally\.y>ally\.groundY\)ally\.y=ally\.groundY/);
  assert.match(game, /const keepCreatureOnRoad=\(creature:\{x:number;y:number;groundY:number\},map:MapId\)=>\{/);

  const full = ["baby-dragon-card", "sunset-jackal-card-a", "cinder-fox-card", "pale-stag-card", "ember-lynx-card"];
  const swap = nextUsableLoadout(full, "heart-wyrm-card", 0);
  assert.equal(swap.replaced, "baby-dragon-card");
  assert.equal(swap.equipped[0], "heart-wyrm-card");
  assert.equal(swap.selected, 0);

  const COMPANION_DEPLOY_DISTANCE = 285;
  const cases = [
    { map: 6, playerX: 6480, facing: 1, stale: { x: 8200, y: 880, groundY: 430 } },
    { map: 6, playerX: 80, facing: -1, stale: { x: -120, y: 720, groundY: 400 } },
    { map: 5, playerX: 6100, facing: 1, stale: { x: 9000, y: 760, groundY: 422 } },
    { map: 1, playerX: 230, facing: -1, stale: { x: -80, y: 640, groundY: 500 } },
  ];
  for (const scene of cases) {
    const map = maps[scene.map];
    const summonX = creatureEdgeAt(map.w, scene.playerX + scene.facing * COMPANION_DEPLOY_DISTANCE);
    const summonFloor = plantedFloorAt(map.plats, map.w, summonX, scene.map);
    const ally = { x: scene.stale.x, y: scene.stale.y, groundY: scene.stale.groundY };
    ally.x = creatureEdgeAt(map.w, summonFloor.x);
    ally.groundY = summonFloor.groundY;
    ally.y = summonFloor.groundY;
    keepCreatureOnRoad(ally, map.plats, map.w, scene.map);
    if (ally.y > ally.groundY) ally.y = ally.groundY;
    assert.ok(ally.x >= PLAYER_EDGE_MARGIN && ally.x <= map.w - PLAYER_EDGE_MARGIN, `map ${scene.map} deploy stays on-map`);
    assert.notEqual(surfaceAt(map.plats, ally.x), null, `map ${scene.map} deploy x=${ally.x} needs road`);
    assert.ok(ally.y <= ally.groundY, `map ${scene.map} deploy must not sit underground`);
    assert.equal(ally.groundY, surfaceAt(map.plats, ally.x));
  }
});

test("locks hold: Moon Night, planted helpers, PR #10 numbers, no dating, no maps 7+", () => {
  assert.match(game, /PLAYER_NAME = "Moon Night"/);
  assert.match(campaign, /PLAYER_DISPLAY_NAME = "Moon Night"/);
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);
  assert.match(game, /const keepCreatureOnRoad=\(creature:\{x:number;y:number;groundY:number\},map:MapId\)=>\{/);
  assert.match(game, /const cameraXFor=\(playerX:number,worldW:number,viewW:number\)=>clamp\(playerX-viewW\*\.38,-CAM_EDGE_PAD,Math\.max\(0,worldW-viewW\)\+CAM_EDGE_PAD\)/);
  assert.match(game, /const nextUsableLoadout=\(equipped:\(string\|null\)\[\],itemId:string,selected:number\)=>\{/);
  assert.match(game, /const MAP6_PULSE_X = 4400/);
  assert.match(game, /const COMPANION_HUNT_RANGE = 520/);
  assert.match(game, /const COMPANION_STRIKE_RANGE = 132/);
  assert.match(game, /const COMPANION_STRIKE_DAMAGE = 5/);
  assert.match(game, /const COMPANION_STRIKE_RECOVERY = 840/);
  assert.match(game, /const COMBAT_ONLY_AGGRO_RANGE = 220/);
  assert.match(game, /const EXTRA_CHASE_LEEWAY = 360/);
  assert.doesNotMatch(game, /Moon Knight|bondMeter|dating sim|affectionMeter|romanceChoice|MAP7_/);
  assert.doesNotMatch(game, /radio encounter|tune the radio|drawPixelHouse|drawCastleKeep/i);
  assert.doesNotMatch(game, /map:\s*7|Map 7/);
  assert.equal((game.match(/firstTalk:\[/g) || []).length, 35);
  assert.equal((game.match(/againTalk:\[/g) || []).length, 35);
  assert.equal((game.match(/afterCaptureTalk:\[/g) || []).length, 35);
});
