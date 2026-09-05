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

const recoverFromVoid = (plats, width, x, mapId) => {
  const floor = plantedFloorAt(plats, width, Math.max(120, x - 180), mapId);
  return { x: floor.x, y: floor.groundY - PH, groundY: floor.groundY };
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

const hopArc = (t, height) => {
  const u = clamp(t, 0, 1), peak = 0.36;
  const shaped = u < peak ? easeInOut(u / peak) : 1 - easeInOut((u - peak) / (1 - peak));
  return shaped * height;
};
const groundBeastHop = (beast, now) => {
  if (now >= beast.leapUntil || beast.id.startsWith("heart-wyrm") || beast.id.startsWith("ash-roost")) return 0;
  if (beast.mode !== "walk" && beast.mode !== "run" && beast.mode !== "idle") return 0;
  const span = beast.leapUntil - beast.leapStarted;
  const hopT = span > 0 ? clamp((now - beast.leapStarted) / span, 0, 1) : 0;
  return hopArc(hopT, 52);
};

const applyJump = (jumpsLeft) => {
  if (jumpsLeft <= 0) return { jumpsLeft, grounded: false, vy: 0, didJump: false };
  const secondJump = jumpsLeft === 1;
  return { jumpsLeft: jumpsLeft - 1, grounded: false, vy: secondJump ? -465 : -500, didJump: true };
};
const canStartSlide = (grounded, vx) => grounded && Math.abs(vx) > 55;
const roadStepHold = (grounded, oldBottom, ground) =>
  grounded && Number.isFinite(ground) && Math.abs(ground - oldBottom) <= ROAD_STEP_HEIGHT;

const groundAt = (plats, x, bottom, fromGrounded = false) => {
  let best = Infinity;
  const climb = fromGrounded ? ROAD_STEP_HEIGHT : STEP_HEIGHT;
  for (const p of plats) {
    const overlaps = x + PW * 0.5 > p.x && x - PW * 0.5 < p.x + p.w;
    const allow = p.h > 80 ? climb : STEP_HEIGHT;
    const reachable = p.y >= bottom - allow && bottom <= p.y + allow;
    if (overlaps && reachable && p.y < best) best = p.y;
  }
  return best;
};

const walkRoad = (plats, width, startX, dir) => {
  const startGround = surfaceAt(plats, startX);
  let x = startX, y = startGround, grounded = true, stuck = false, airs = 0;
  const goal = dir > 0 ? width - PLAYER_EDGE_MARGIN : PLAYER_EDGE_MARGIN;
  for (let i = 0; i < width + 8; i++) {
    if ((dir > 0 && x >= goal) || (dir < 0 && x <= goal)) break;
    const oldBottom = y;
    const nextX = clamp(x + dir, PLAYER_EDGE_MARGIN, width - PLAYER_EDGE_MARGIN);
    const gNext = groundAt(plats, nextX, oldBottom, grounded);
    if (!grounded || gNext < Infinity) x = nextX;
    else { stuck = true; break; }
    const ground = groundAt(plats, x, oldBottom, grounded);
    const newBottom = y;
    if (ground < Infinity && (oldBottom <= ground + STEP_HEIGHT && newBottom >= ground || roadStepHold(grounded, oldBottom, ground))) {
      y = ground;
      grounded = true;
    } else {
      grounded = false;
      airs += 1;
      if (ground < Infinity) { y = ground; grounded = true; }
      else break;
    }
  }
  return { x, y, grounded, stuck, airs };
};

test("Space jump/double jump + S crouch/slide stay; leftover maps 1/3 road seams no longer stall walk/slide", () => {
  assert.equal(num(/const STEP_HEIGHT = (\d+)/, "STEP_HEIGHT"), 32);
  assert.equal(num(/const ROAD_STEP_HEIGHT = (\d+)/, "ROAD_STEP_HEIGHT"), 56);
  assert.match(game, /const ROAD_STEP_HEIGHT = 56; \/\/ leftover maps 1\/3 road seams still hold walk\/slide; leftover stones keep STEP_HEIGHT/);
  assert.match(game, /const roadStepHold=\(grounded:boolean,oldBottom:number,ground:number\)=>grounded&&Number\.isFinite\(ground\)&&Math\.abs\(ground-oldBottom\)<=ROAD_STEP_HEIGHT/);
  assert.match(game, /const groundAt=\(x:number,bottom:number,fromGrounded=false\)=>\{/);
  assert.match(game, /const climb=fromGrounded\?ROAD_STEP_HEIGHT:STEP_HEIGHT/);
  assert.match(game, /const allow=p\.h>80\?climb:STEP_HEIGHT/);
  assert.match(game, /if \(\(k==="w"\|\|k==="arrowup"\|\|k===" "\)&&!e\.repeat\) jumpQueued\.current=true/);
  assert.match(game, /if \(\(k==="s"\|\|k==="arrowdown"\)&&!e\.repeat\) slideQueued\.current=true/);
  assert.match(game, /<span><b>W \/ Space ×2<\/b> Double jump<\/span><span><b>S<\/b> Crouch \/ slide<\/span>/);
  assert.match(game, /if\(jump&&pl\.jumpsLeft>0\)\{\n {10}const secondJump=pl\.jumpsLeft===1;\n {10}pl\.vy=secondJump\?-465:-500;pl\.grounded=false;pl\.jumpsLeft-=1;pl\.crouched=false;pl\.sliding=false;slideUntil\.current=0;didJump=true; \/\/ Space jump\/double jump leftover still readable after road-seam hold/);
  assert.match(game, /if\(wantsSlide&&pl\.grounded&&Math\.abs\(pl\.vx\)>55\)\{ \/\/ S crouch\/slide leftover still readable after road-seam hold/);
  assert.match(game, /if\(!pl\.grounded\|\|groundAt\(nextX,oldBottom,pl\.grounded\)<Infinity\)pl\.x=nextX/);
  assert.match(game, /if\(pl\.vy>=0&&ground<Infinity&&\(oldBottom<=ground\+STEP_HEIGHT&&newBottom>=ground\|\|roadStepHold\(wasGrounded&&!didJump,oldBottom,ground\)\)\)\{pl\.y=ground-PH;pl\.vy=0;pl\.grounded=true;pl\.jumpsLeft=2;\}else\{pl\.grounded=false;pl\.crouched=false;pl\.sliding=false;slideUntil\.current=0;\} \/\/ leftover maps 1\/3 road seams still hold walk\/slide; Space jump\/double jump \+ S crouch\/slide stay/);
  assert.match(game, /if\(wasGrounded&&!didJump&&!pl\.grounded\)pl\.jumpsLeft=Math\.min\(pl\.jumpsLeft,1\)/);
  assert.doesNotMatch(game, /coyoteTime|ledgeForgiv|tripleJump|jumpsLeft\s*=\s*3/);

  const hops = applyJump(2);
  assert.equal(hops.vy, -500);
  assert.equal(hops.jumpsLeft, 1);
  const second = applyJump(hops.jumpsLeft);
  assert.equal(second.vy, -465);
  assert.equal(second.jumpsLeft, 0);
  assert.equal(applyJump(0).didJump, false, "no third jump after a leftover seam hold");
  assert.equal(canStartSlide(true, 220), true);
  assert.equal(canStartSlide(true, 40), false, "slow walk still crouches instead of sliding");
  assert.equal(canStartSlide(false, 220), false, "airborne S cannot start a slide");

  const climbSeams = [
    { map: 1, from: 610, to: 570, leaveX: 1402 },
    { map: 1, from: 600, to: 550, leaveX: 2562 },
    { map: 1, from: 590, to: 535, leaveX: 3672 },
    { map: 1, from: 590, to: 545, leaveX: 6420 },
    { map: 3, from: 600, to: 548, leaveX: 1470 },
    { map: 3, from: 575, to: 535, leaveX: 2410 },
    { map: 3, from: 575, to: 540, leaveX: 4540 },
  ];
  for (const seam of climbSeams) {
    const plats = maps[seam.map].plats;
    const edge = seam.leaveX + PW * 0.5 + 1;
    assert.equal(groundAt(plats, edge, seam.from, false), Infinity, `map ${seam.map} leftover climb ${seam.from}→${seam.to} still needs ROAD_STEP`);
    assert.equal(groundAt(plats, edge, seam.from, true), seam.to, `map ${seam.map} road-step hold reaches ${seam.to}`);
    assert.equal(roadStepHold(true, seam.from, seam.to), true, `map ${seam.map} slide holds across ${seam.from}→${seam.to}`);
    assert.equal(roadStepHold(false, seam.from, seam.to), false, "airborne jump landing still uses STEP_HEIGHT");
  }

  for (const [id, map] of Object.entries(maps)) {
    assert.deepEqual(walkableGaps(map.plats, map.w), [], `map ${id} stays gapless for leftover jump/slide`);
    const east = walkRoad(map.plats, map.w, 230, 1);
    assert.equal(east.stuck, false, `map ${id} leftover walk east no longer stalls`);
    assert.equal(east.grounded, true, `map ${id} leftover walk east stays on the road`);
    assert.equal(east.airs, 0, `map ${id} leftover walk east keeps slide through road seams`);
    const west = walkRoad(map.plats, map.w, map.w - 80, -1);
    assert.equal(west.stuck, false, `map ${id} leftover walk west no longer stalls`);
    assert.equal(west.grounded, true, `map ${id} leftover walk west stays on the road`);

    for (const stone of map.plats.filter((p) => p.h <= 24)) {
      const mid = stone.x + stone.w / 2;
      const road = surfaceAt(map.plats, mid);
      if (road == null) continue;
      const stepOnto = groundAt(map.plats, mid, road, true);
      assert.notEqual(stepOnto, stone.y, `map ${id} leftover stone at ${stone.x} must not steal a grounded step`);
    }
  }
});

test("fox/stag/lynx/wyrm keepCreatureOnRoad + hop/gait still hold after #61/#66", () => {
  assert.match(game, /const keepCreatureOnRoad=\(creature:\{x:number;y:number;groundY:number\},map:MapId\)=>\{/);
  assert.match(game, /if\(creature\.y>ground\)creature\.y=ground; \/\/ hop\/gait leftover still holds after #61\/#66; do not flatten fox\/stag\/lynx air/);
  assert.match(game, /if\(creature\.y>floor\.groundY\)creature\.y=floor\.groundY; \/\/ hop\/gait leftover still holds after #61\/#66; do not flatten fox\/stag\/lynx air/);
  assert.match(game, /const groundBeastHop = \(beast:\{id:string;mode:DragonMode;leapStarted:number;leapUntil:number\}, now:number\)=>\{/);
  assert.match(game, /return hopArc\(hopT,52\); \/\/ fox\/stag\/lynx hop leftover still holds after #61\/#66; wyrm keeps roost\/fly/);
  assert.match(game, /if\(beast\.mode!=="walk"&&beast\.mode!=="run"&&beast\.mode!=="idle"\)return 0/);
  assert.match(game, /const hop=groundBeastHop\(jackal,now\)/);
  assert.match(game, /keepCreatureOnRoad\(jackal,mapRef\.current\)/);
  assert.match(game, /tickAnimalGait\(jackal,dt\)/);
  assert.match(game, /createBeast\("cinder-fox-a",920,620,1480/);
  assert.match(game, /createBeast\("pale-stag-a",1760,1180,2680/);
  assert.match(game, /createBeast\("ember-lynx-a",1280,980,1680/);
  assert.match(game, /createBeast\("ember-lynx-c",4520,4160,4980/);
  assert.match(game, /createBeast\("heart-wyrm",2480,1880,3180/);
  assert.match(game, /const COMPANION_HUNT_RANGE = 520/);
  assert.match(game, /const COMPANION_STRIKE_RANGE = 132/);
  assert.match(game, /const COMPANION_STRIKE_DAMAGE = 5/);
  assert.match(game, /const COMPANION_STRIKE_RECOVERY = 840/);
  assert.match(game, /const COMBAT_ONLY_AGGRO_RANGE = 220/);
  assert.match(game, /const EXTRA_CHASE_LEEWAY = 360/);

  const packs = [
    { map: 3, id: "cinder-fox-a", x: 920, hops: true },
    { map: 3, id: "cinder-fox-b", x: 2480, hops: true },
    { map: 4, id: "pale-stag-a", x: 1760, hops: true },
    { map: 4, id: "pale-stag-b", x: 5320, hops: true },
    { map: 5, id: "ember-lynx-a", x: 1280, hops: true },
    { map: 5, id: "ember-lynx-c", x: 4520, hops: true },
    { map: 6, id: "heart-wyrm", x: 2480, hops: false },
    { map: 6, id: "heart-wyrm", x: 2860, hops: false },
  ];
  for (const beast of packs) {
    const map = maps[beast.map];
    const hop = groundBeastHop({ id: beast.id, mode: "idle", leapStarted: 0, leapUntil: 560 }, 200);
    if (beast.hops) assert.ok(hop > 20, `${beast.id} hop stays readable through idle`);
    else assert.equal(hop, 0, `${beast.id} uses roost/fly leftover, not a ground hop`);
    const creature = { x: beast.x, y: (surfaceAt(map.plats, beast.x) ?? 590) - hop, groundY: 430 };
    keepCreatureOnRoad(creature, map.plats, map.w, beast.map);
    assert.notEqual(surfaceAt(map.plats, creature.x), null, `${beast.id} x=${beast.x} stays on the road`);
    assert.ok(creature.x >= PLAYER_EDGE_MARGIN && creature.x <= map.w - PLAYER_EDGE_MARGIN, `${beast.id} stays on-map`);
    assert.ok(creature.y <= creature.groundY, `${beast.id} hop/roost must not sit underground`);
    assert.equal(creature.groundY, surfaceAt(map.plats, creature.x));
    if (beast.hops) assert.ok(creature.groundY - creature.y > 8, `${beast.id} leftover hop still reads after keepCreatureOnRoad`);
  }
});

test("heart/altar stay readable from finish stands after #66 6460 vein skip", () => {
  const pad = num(/const CAM_EDGE_PAD = (\d+)/, "CAM_EDGE_PAD");
  const margin = num(/const PLAYER_EDGE_MARGIN = (\d+)/, "PLAYER_EDGE_MARGIN");
  const heartX = num(/const MAP6_HEART_X = (\d+)/, "MAP6_HEART_X");
  const altarX = heartX + 40;
  const range = num(/const ALTAR_INTERACT_RANGE = (\d+)/, "ALTAR_INTERACT_RANGE");
  const map6W = maps[6].w;
  assert.equal(heartX, 6470);
  assert.equal(altarX, 6510);
  assert.equal(range, 200);
  assert.match(art, /so the altar edge stays readable/);
  assert.match(game, /const finishInCameraAt=\(landmarkX:number,playerX:number,worldW:number,viewW:number,inset=36\)=>\{const cam=cameraXFor\(playerX,worldW,viewW\);return landmarkX>=cam\+inset&&landmarkX<=cam\+viewW-inset;\}; \/\/ heart\/altar stay readable from finish stands after #66 6460 vein skip/);
  assert.match(game, /if\(map===6&&Math\.abs\(x-MAP6_HEART_X\)<40\)continue; \/\/ leftover 6460 vein no longer sits on the heart after #64 afterCapture trim/);
  assert.match(game, /const atHeartAltar=\(x:number\)=>Math\.abs\(x-MAP6_HEART_X\)<ALTAR_INTERACT_RANGE/);
  assert.match(game, /else if\(map===6&&atHeartAltar\(pl\.x\)\)action=campaignEndedRef\.current\?"Rest at Ashfall's Heart":"Press E at Ashfall's Heart"/);

  const atHeartAltar = (x) => Math.abs(x - heartX) < range;
  const cameraXFor = (playerX, worldW, viewW) =>
    clamp(playerX - viewW * 0.38, -pad, Math.max(0, worldW - viewW) + pad);
  const finishInCameraAt = (landmarkX, playerX, worldW, viewW, inset = 36) => {
    const cam = cameraXFor(playerX, worldW, viewW);
    return landmarkX >= cam + inset && landmarkX <= cam + viewW - inset;
  };

  const rim = map6W - margin;
  const recoverXs = [6460, 6470, altarX, rim, 8000].map((x) => recoverFromVoid(maps[6].plats, map6W, x, 6).x);
  const stands = [heartX, altarX, rim, ...recoverXs];
  for (const x of stands) {
    assert.equal(atHeartAltar(x), true, `E still reaches the heart from x=${x}`);
    assert.notEqual(surfaceAt(maps[6].plats, x), null, `altar stand x=${x} stays on the road`);
    for (const viewW of [960, 1280, 1440]) {
      assert.equal(finishInCameraAt(heartX, x, map6W, viewW), true, `heart readable at x=${x}, view ${viewW}`);
      assert.equal(finishInCameraAt(altarX, x, map6W, viewW), true, `altar readable at x=${x}, view ${viewW}`);
    }
  }

  const skipNearHeart = (x) => Math.abs(x - heartX) < 40;
  assert.equal(skipNearHeart(6460), true, "shared 6460 vein stays undrawn on the heart");
  assert.equal(skipNearHeart(6395), false, "east-approach rock at 6395 stays west of the heart");
});

test("locks hold: Moon Night, planted helpers, PR #10 numbers, talk tables, no dating, no maps 7+", () => {
  assert.match(game, /PLAYER_NAME = "Moon Night"/);
  assert.match(campaign, /PLAYER_DISPLAY_NAME = "Moon Night"/);
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);
  assert.match(game, /const keepCreatureOnRoad=\(creature:\{x:number;y:number;groundY:number\},map:MapId\)=>\{/);
  assert.match(game, /const companionIdleLeftover = \(ally:\{mode:DragonMode;prevMode:DragonMode;modeBlendAt:number;gait:number;groundY:number;y:number\}, groundAlly:boolean, now:number\) => \{/);
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
  assert.equal((game.match(/firstTalk:\[/g) || []).length, 37);
  assert.equal((game.match(/againTalk:\[/g) || []).length, 37);
  assert.equal((game.match(/afterCaptureTalk:\[/g) || []).length, 37);
});
