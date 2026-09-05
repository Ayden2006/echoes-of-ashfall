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
const PH = 92;
const PW = 46;
const STEP_HEIGHT = 32;
const ROAD_STEP_HEIGHT = 56;
const PLAYER_EDGE_MARGIN = 28;
const CARD_FLOOR_INSET = 22;
const CARD_WALL_CLEAR = 28;
const COMPANION_TELEPORT_DISTANCE = 720;
const COMPANION_HUNT_RANGE = 520;
const COMPANION_STRIKE_RANGE = 132;
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

const plantedHuntHoldAt = (plats, width, rawHoldX, huntedX, map = 0) => {
  const hit = (nx) => surfaceAt(plats, nx);
  const clear = (nx) => {
    const g = hit(nx);
    if (g == null || cardBlockedAt(plats, map, nx)) return null;
    if (standingInsideStone(plats, nx, g)) return null;
    return g;
  };
  const first = clear(clamp(rawHoldX, 48, width - 48));
  if (first != null) return { x: clamp(rawHoldX, 48, width - 48), groundY: first };
  let best = null, bestDist = Infinity, bestInRange = null, bestInRangeDist = Infinity;
  const consider = (nx) => {
    if (nx < 48 || nx > width - 48) return;
    const g = clear(nx);
    if (g == null) return;
    const dist = Math.abs(nx - rawHoldX), huntDist = Math.abs(nx - huntedX);
    if (dist < bestDist) { best = { x: nx, groundY: g }; bestDist = dist; }
    if (huntDist < COMPANION_STRIKE_RANGE && dist < bestInRangeDist) { bestInRange = { x: nx, groundY: g }; bestInRangeDist = dist; }
  };
  for (let d = 8; d <= 420; d += 8) { consider(rawHoldX - d); consider(rawHoldX + d); }
  return bestInRange ?? best ?? plantedFloorAt(plats, width, rawHoldX, map);
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
    if (ground < Infinity && (oldBottom <= ground + STEP_HEIGHT && y >= ground || roadStepHold(grounded, oldBottom, ground))) {
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

const followHoldAt = (plats, width, playerX, facing, mapId) => {
  const followX = creatureEdgeAt(width, playerX - facing * 104);
  const followHold = plantedFloorAt(plats, width, followX, mapId);
  const ally = { x: creatureEdgeAt(width, followHold.x), groundY: followHold.groundY, y: followHold.groundY };
  keepCreatureOnRoad(ally, plats, width, mapId);
  if (ally.y > ally.groundY) ally.y = ally.groundY;
  return { ally, followX, holdFollowX: ally.x };
};

const huntTeleportAt = (plats, width, playerX, facing, huntedX, mapId) => {
  const followX = creatureEdgeAt(width, playerX - facing * 104);
  const followHold = null;
  const seat = followHold ?? plantedFloorAt(plats, width, followX, mapId);
  const ally = { x: creatureEdgeAt(width, seat.x), groundY: seat.groundY, y: seat.groundY };
  keepCreatureOnRoad(ally, plats, width, mapId);
  if (ally.y > ally.groundY) ally.y = ally.groundY;
  return { ally, followX, holdFollowX: followX, targetX: huntedX };
};

const huntHoldAt = (plats, width, allyX, huntedX, mapId) => {
  const targetX = huntedX;
  const rawHoldX = targetX - (targetX >= allyX ? 1 : -1) * 96;
  const huntHold = plantedHuntHoldAt(plats, width, rawHoldX, targetX, mapId);
  const ally = { x: creatureEdgeAt(width, huntHold.x), groundY: huntHold.groundY, y: huntHold.groundY };
  keepCreatureOnRoad(ally, plats, width, mapId);
  if (ally.y > ally.groundY) ally.y = ally.groundY;
  return { ally, rawHoldX, targetX, holdX: ally.x };
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

const canStrike = (allyX, huntedX) => Math.abs(huntedX - allyX) < COMPANION_STRIKE_RANGE;

const closeStones = [
  { map: 2, x: 1680, y: 498, w: 150, road: 538, gap: 40, label: "shore 1680" },
  { map: 4, x: 5200, y: 500, w: 140, road: 545, gap: 45, label: "cliff 5200" },
  { map: 4, x: 5460, y: 500, w: 140, road: 555, gap: 55, label: "cliff 5460" },
  { map: 6, x: 5780, y: 490, w: 150, road: 545, gap: 55, label: "heart 5780" },
  { map: 6, x: 6080, y: 490, w: 150, road: 545, gap: 55, label: "heart 6080" },
  { map: 6, x: 6160, y: 490, w: 150, road: 545, gap: 55, label: "heart 6160" },
];

const huntPacks = [
  { map: 3, id: "cinder-fox-a", xs: [920, 620, 1480] },
  { map: 3, id: "cinder-fox-c", xs: [1780, 1600, 1960] },
  { map: 3, id: "cinder-fox-b", xs: [2480, 2100, 3300] },
  { map: 4, id: "pale-stag-a", xs: [1760, 1180, 2680] },
  { map: 4, id: "pale-stag-b", xs: [5320, 5080, 5640] },
  { map: 5, id: "ember-lynx-a", xs: [1280, 980, 1680] },
  { map: 5, id: "ember-lynx-d", xs: [2620, 2520, 2720] },
  { map: 5, id: "ember-lynx-b", xs: [2140, 1960, 2480] },
  { map: 5, id: "ember-lynx-c", xs: [4520, 4160, 4980] },
  { map: 6, id: "heart-wyrm", xs: [2480, 1880, 3180] },
];

test("huntHold leftover smoke: hunt stand still plants after hunt teleport; strike range still holds", () => {
  assert.match(game, /const plantedHuntHoldAt=\(map:MapId,rawHoldX:number,huntedX:number\)=>\{/);
  assert.match(game, /return bestInRange\?\?best\?\?plantedFloorAt\(map,rawHoldX\); \/\/ leftover hunt hold still plants after hunt teleport; strike range still holds; leftover stones stay STEP-only/);
  assert.match(game, /const huntHold=hunting\?plantedHuntHoldAt\(map,rawHoldX,targetX\):null; \/\/ leftover hunt hold still plants after hunt teleport; strike range still holds; leftover stones stay STEP-only/);
  assert.match(game, /const rawHoldX=hunting\?targetX-\(targetX>=ally\.x\?1:-1\)\*96:targetX/);
  assert.match(game, /const holdX=huntHold\?creatureEdgeAt\(map,huntHold\.x\):rawHoldX/);
  assert.match(game, /const targetX=hunting\?hunted!\.x:holdFollowX; \/\/ hunt path still uses hunted\.x; leftover follow uses holdFollowX/);
  assert.match(game, /const followHold=!hunting\?plantedFloorAt\(map,followX\):null; \/\/ leftover follow still plants after #72 road-step; close leftover stones stay off allies; leftover still plants after followHold; hunt path still uses hunted\.x; leftover still plants after hunt teleport/);
  assert.match(game, /const seat=followHold\?\?plantedFloorAt\(map,followX\); \/\/ leftover teleport still plants after followHold; hunt path still uses hunted\.x; leftover still plants after hunt teleport/);
  assert.match(game, /const idleSeat=!hunting\?plantedFloorAt\(map,ally\.x\):null/);
  assert.match(game, /if\(hunting&&hunted\)\{ally\.targetX=hunted\.x;ally\.attackUntil=now\+1600;\}/);
  assert.doesNotMatch(game, /const targetX=hunting\?holdFollowX/);
  assert.doesNotMatch(game, /const stayForHunt=hunted&&Math\.abs\(pl\.x-holdFollowX\)/);
  assert.doesNotMatch(game, /const holdX=hunting\?targetX-\(targetX>=ally\.x\?1:-1\)\*96:targetX;/);
  assert.match(art, /Keep the heat local to coals, kiln mouths, and lynx-eye accents/);
  assert.match(art, /Keep the heart's glow local; do not wash the whole chamber in magenta/);

  for (const hunt of huntPacks) {
    const map = maps[hunt.map];
    for (const huntedX of hunt.xs) {
      assert.notEqual(surfaceAt(map.plats, huntedX), null, `${hunt.id} x=${huntedX} still stands on the road`);
      for (const fromLeft of [true, false]) {
        const allyX = huntedX + (fromLeft ? -400 : 400);
        const hold = huntHoldAt(map.plats, map.w, allyX, huntedX, hunt.map);
        assert.equal(hold.targetX, huntedX, `${hunt.id} hunt path still uses hunted.x`);
        assertPlanted(hunt.map, hold.ally, `${hunt.id} huntHold from ${fromLeft ? "left" : "right"} at ${huntedX}`);
        assert.equal(canStrike(hold.holdX, huntedX), true, `${hunt.id} huntHold at ${huntedX} stays in strike range`);
        if (standingInsideStone(map.plats, hold.rawHoldX, surfaceAt(map.plats, hold.rawHoldX) ?? 590)) {
          assert.notEqual(hold.holdX, hold.rawHoldX, `${hunt.id} leftover hunt hold still plants off the leftover stone`);
        }
      }
    }
  }

  for (const stone of closeStones) {
    const map = maps[stone.map];
    const mid = stone.x + stone.w / 2;
    assert.equal(surfaceAt(map.plats, mid), stone.road, `${stone.label} still sits over leftover road ${stone.road}`);
    assert.ok(stone.gap > STEP_HEIGHT && stone.gap <= ROAD_STEP_HEIGHT, `${stone.label} stays STEP-only leftover`);
    assert.equal(standingInsideStone(map.plats, mid, stone.road), true, `${stone.label} mid overlaps the leftover stone`);

    for (const facing of [1, -1]) {
      const hold = followHoldAt(map.plats, map.w, mid, facing, stone.map);
      assertPlanted(stone.map, hold.ally, `${stone.label} followHold facing ${facing}`);

      const playerX = mid + facing * 104;
      const hunt = huntTeleportAt(map.plats, map.w, playerX, facing, mid, stone.map);
      assert.equal(hunt.targetX, mid, `${stone.label} hunt teleport path still uses hunted.x`);
      assertPlanted(stone.map, hunt.ally, `${stone.label} hunt teleport facing ${facing}`);
      assert.notEqual(hunt.ally.x, hunt.followX, `${stone.label} hunt teleport still plants off the leftover stone`);
    }

    for (const fromLeft of [true, false]) {
      const hold = huntHoldAt(map.plats, map.w, mid + (fromLeft ? -400 : 400), mid, stone.map);
      assertPlanted(stone.map, hold.ally, `${stone.label} huntHold from ${fromLeft ? "left" : "right"}`);
    }
  }
});

test("softlock leftover after hunt teleport: void recover + portal heal/flash + altar E + followHold/teleport still fire on maps 1–6", () => {
  assert.match(game, /if\(pl\.y>WORLD_H\+80\)\{const floor=plantedFloorAt\(map,Math\.max\(120,pl\.x-180\)\);pl\.x=floor\.x;pl\.y=plantedYAt\(map,floor\.x\);pl\.vy=0;pl\.grounded=true;pl\.jumpsLeft=2;pl\.crouched=false;pl\.sliding=false;slideUntil\.current=0;\} \/\/ void recover still plants after #60\/#61 companionIdleLeftover; maps 1–6 leftover still fire after #66 6460 vein skip; leftover still fires after #72 road-step; leftover still fires after hunt teleport/);
  assert.match(game, /else if\(map===6&&atHeartAltar\(x\)\)\{ \/\/ altar E still wins after #56 Dell\/Rowan walk-out and #64 afterCapture trim; no nearby talk radius covers this window; leftover still fires after #66 scenery vein move; leftover still fires after hunt teleport/);
  assert.match(game, /else if\(map===6&&atHeartAltar\(pl\.x\)\)action=campaignEndedRef\.current\?"Rest at Ashfall's Heart":"Press E at Ashfall's Heart"; \/\/ altar prompt still wins after #56 Dell\/Rowan walk-out and #64 afterCapture trim; leftover still fires after #66 scenery vein move; leftover still fires after hunt teleport/);
  assert.match(game, /const followHold=!hunting\?plantedFloorAt\(map,followX\):null/);
  assert.match(game, /const seat=followHold\?\?plantedFloorAt\(map,followX\)/);
  assert.match(game, /const stayForHunt=hunted&&Math\.abs\(pl\.x-hunted\.x\)<COMPANION_HUNT_RANGE\+140&&Math\.abs\(ally\.x-hunted\.x\)<COMPANION_TELEPORT_DISTANCE/);

  const enterMap = game.match(/const enterMap = useCallback\(\(map:MapId, from:MapId\|null=mapRef\.current\) => \{[\s\S]*?\},\[showDialogue,tone\]\);/);
  assert.ok(enterMap, "enterMap callback should stay intact after hunt teleport");
  assert.match(enterMap[0], /pl\.health=pl\.maxHealth;staminaRef\.current=MAX_STAMINA/);
  assert.match(enterMap[0], /setHealth\(pl\.maxHealth\);setStamina\(MAX_STAMINA\); \/\/ portal heal still fires after companion reseat; leftover still fires after #70 groundAt signature; leftover still fires after #72 road-step; leftover still fires after hunt teleport/);
  assert.match(enterMap[0], /const arrivalGround=seat\.groundY; \/\/ companion portal reseat still plants after #38 floors; leftover still plants after #70 groundAt signature; leftover still plants after #72 road-step; leftover still plants after hunt teleport/);
  assert.match(enterMap[0], /portalFlashUntil\.current=performance\.now\(\)\+430; \/\/ portal flash still fires after companion reseat; leftover still fires after #70 groundAt signature; leftover still fires after #72 road-step; leftover still fires after hunt teleport/);
  assert.match(enterMap[0], /tone\(610,\.25,\.028\);window\.setTimeout\(\(\)=>tone\(360,\.2,\.02\),100\); \/\/ portal enter tone still fires after companion reseat; leftover still fires after #70 groundAt signature; leftover still fires after #72 road-step; leftover still fires after hunt teleport/);
  assert.match(enterMap[0], /const seat=plantedFloorAt\(map,pl\.x-pl\.facing\*96\)/);
  assert.doesNotMatch(enterMap[0], /groundAt\(/);
  const healIdx = enterMap[0].indexOf("pl.health=pl.maxHealth");
  const reseatIdx = enterMap[0].indexOf("const seat=plantedFloorAt(map,pl.x-pl.facing*96)");
  const flashIdx = enterMap[0].indexOf("portalFlashUntil.current=performance.now()+430");
  assert.ok(healIdx >= 0 && reseatIdx > healIdx && flashIdx > reseatIdx, "heal, planted reseat, then flash still run in that order after hunt teleport");

  const heartX = num(/const MAP6_HEART_X = (\d+)/, "MAP6_HEART_X");
  const range = num(/const ALTAR_INTERACT_RANGE = (\d+)/, "ALTAR_INTERACT_RANGE");
  const veinX = num(/const MAP6_VEIN_X = (\d+)/, "MAP6_VEIN_X");
  assert.equal(heartX, 6470);
  assert.equal(range, 200);
  assert.equal(veinX, 5620);
  const atHeartAltar = (x) => Math.abs(x - heartX) < range;

  const stayForHunt = (plX, allyX, huntedX) =>
    Math.abs(plX - huntedX) < COMPANION_HUNT_RANGE + 140 && Math.abs(allyX - huntedX) < COMPANION_TELEPORT_DISTANCE;
  const shouldTeleport = (plX, allyX, huntedX) =>
    Math.abs(plX - allyX) > COMPANION_TELEPORT_DISTANCE && !stayForHunt(plX, allyX, huntedX);

  const layouts = [
    { id: 1, voids: [2680, 6520, 7200], from: [null, 2], portal: { x: 340, facing: 1 } },
    { id: 2, voids: [1515, 5180, 5400], from: [1, 3], portal: { x: 340, facing: 1 } },
    { id: 3, voids: [1510, 4500, 5800], from: [2, 4], portal: { x: 340, facing: 1 } },
    { id: 4, voids: [2580, 5320, 6000], from: [3, 5], portal: { x: 340, facing: 1 } },
    { id: 5, voids: [1660, 5960, 6200], from: [4, 6], portal: { x: 340, facing: 1 } },
    { id: 6, voids: [2860, 6100, 6470, 6460, 8000], from: [5], portal: { x: 340, facing: 1 } },
  ];
  for (const layout of layouts) {
    const map = maps[layout.id];
    assert.deepEqual(walkableGaps(map.plats, map.w), [], `map ${layout.id} stays gapless for leftover void recover after hunt teleport`);
    for (const x of layout.voids) {
      const recovered = recoverFromVoid(map.plats, map.w, x, layout.id);
      assertPlanted(layout.id, { x: recovered.x, y: recovered.groundY, groundY: recovered.groundY }, `map ${layout.id} void recover x=${x}`);
      assert.equal(recovered.y + PH, recovered.groundY, `map ${layout.id} void recover x=${x} stands on the planted floor`);

      const follow = followHoldAt(map.plats, map.w, recovered.x, 1, layout.id);
      assertPlanted(layout.id, follow.ally, `map ${layout.id} followHold after void recover x=${x}`);

      const teleport = huntTeleportAt(map.plats, map.w, recovered.x, 1, recovered.x + 80, layout.id);
      assertPlanted(layout.id, teleport.ally, `map ${layout.id} hunt teleport after void recover x=${x}`);
    }

    const enter = portalEnter(map.plats, map.w, layout.portal.x, layout.portal.facing, layout.id);
    assert.equal(enter.heal, true);
    assert.equal(enter.flashMs, 430);
    assertPlanted(layout.id, { x: enter.player.x, y: enter.player.groundY, groundY: enter.player.groundY }, `map ${layout.id} portal enter plant`);
    assertPlanted(layout.id, enter.ally, `map ${layout.id} portal companion reseat`);
  }

  assert.equal(shouldTeleport(2680, 2680 - 800, 2680), true, "ally stuck west of a perch still teleports into the hunt");
  assert.equal(shouldTeleport(2680, 2600, 2680), false, "ally already on the hunt leash does not teleport");
  assert.equal(shouldTeleport(400, 1300, 1800), true, "far follow without a nearby hunt still teleports");
  assert.equal(shouldTeleport(2140, 2140 - 900, 4520), true, "map 5 kiln-road ally stuck off the lynx still teleports");
  assert.equal(shouldTeleport(2480, 2480 - 860, 4400), true, "map 6 heart-road ally stuck off the pulse still teleports");

  const altarX = heartX + 40;
  const rim = maps[6].w - PLAYER_EDGE_MARGIN;
  const recoverXs = [6470, 6460, altarX, rim, 8000].map((x) => recoverFromVoid(maps[6].plats, maps[6].w, x, 6).x);
  for (const x of [heartX, altarX, rim, ...recoverXs]) {
    assert.equal(atHeartAltar(x), true, `E still reaches the heart from x=${x} after hunt teleport`);
    assert.notEqual(surfaceAt(maps[6].plats, x), null, `altar stand x=${x} stays on the road`);
  }
  assert.ok(veinX + 140 < heartX - range, "studyable vein stays west of altar E after hunt teleport");
});

test("jump/slide + ROAD_STEP leftover still hold after hunt teleport; thin stones stay STEP-only", () => {
  assert.equal(num(/const STEP_HEIGHT = (\d+)/, "STEP_HEIGHT"), 32);
  assert.equal(num(/const ROAD_STEP_HEIGHT = (\d+)/, "ROAD_STEP_HEIGHT"), 56);
  assert.match(game, /const ROAD_STEP_HEIGHT = 56; \/\/ leftover maps 1\/3 road seams still hold walk\/slide; leftover stones keep STEP_HEIGHT; leftover maps 2\/4\/5\/6 walk\/slide still hold after #70 road-step; leftover still holds after hunt teleport/);
  assert.match(game, /const roadStepHold=\(grounded:boolean,oldBottom:number,ground:number\)=>grounded&&Number\.isFinite\(ground\)&&Math\.abs\(ground-oldBottom\)<=ROAD_STEP_HEIGHT/);
  assert.match(game, /const climb=fromGrounded\?ROAD_STEP_HEIGHT:STEP_HEIGHT/);
  assert.match(game, /const allow=p\.h>80\?climb:STEP_HEIGHT/);
  assert.match(game, /if\(jump&&pl\.jumpsLeft>0\)\{\n {10}const secondJump=pl\.jumpsLeft===1;\n {10}pl\.vy=secondJump\?-465:-500;pl\.grounded=false;pl\.jumpsLeft-=1;pl\.crouched=false;pl\.sliding=false;slideUntil\.current=0;didJump=true; \/\/ Space jump\/double jump leftover still readable after road-seam hold/);
  assert.match(game, /if\(wantsSlide&&pl\.grounded&&Math\.abs\(pl\.vx\)>55\)\{ \/\/ S crouch\/slide leftover still readable after road-seam hold/);
  assert.match(game, /if\(pl\.vy>=0&&ground<Infinity&&\(oldBottom<=ground\+STEP_HEIGHT&&newBottom>=ground\|\|roadStepHold\(wasGrounded&&!didJump,oldBottom,ground\)\)\)\{pl\.y=ground-PH;pl\.vy=0;pl\.grounded=true;pl\.jumpsLeft=2;\}else\{pl\.grounded=false;pl\.crouched=false;pl\.sliding=false;slideUntil\.current=0;\} \/\/ leftover maps 1\/3 road seams still hold walk\/slide; Space jump\/double jump \+ S crouch\/slide stay; leftover maps 2\/4\/5\/6 walk\/slide still hold after #70 road-step; leftover still holds after hunt teleport/);
  assert.doesNotMatch(game, /coyoteTime|ledgeForgiv|tripleJump|jumpsLeft\s*=\s*3/);

  const leftoverClimb = [
    { map: 1, from: 610, to: 570, leaveX: 1402 },
    { map: 3, from: 600, to: 548, leaveX: 1470 },
  ];
  for (const seam of leftoverClimb) {
    const plats = maps[seam.map].plats;
    const edge = seam.leaveX + PW * 0.5 + 1;
    assert.equal(groundAt(plats, edge, seam.from, false), Infinity, `map ${seam.map} leftover climb ${seam.from}→${seam.to} still needs ROAD_STEP`);
    assert.equal(groundAt(plats, edge, seam.from, true), seam.to, `map ${seam.map} leftover road-step hold is not undone`);
    assert.equal(roadStepHold(true, seam.from, seam.to), true);
  }

  for (const id of [1, 2, 3, 4, 5, 6]) {
    const map = maps[id];
    assert.deepEqual(walkableGaps(map.plats, map.w), [], `map ${id} leftover stays gapless after hunt teleport`);
    const east = walkRoad(map.plats, map.w, 230, 1);
    assert.equal(east.stuck, false, `map ${id} leftover walk east still holds after hunt teleport`);
    assert.equal(east.grounded, true, `map ${id} leftover walk east stays on the road`);
    assert.equal(east.airs, 0, `map ${id} leftover walk east keeps slide through road seams`);
    const west = walkRoad(map.plats, map.w, map.w - 80, -1);
    assert.equal(west.stuck, false, `map ${id} leftover walk west still holds after hunt teleport`);
    assert.equal(west.grounded, true, `map ${id} leftover walk west stays on the road`);
    assert.equal(west.airs, 0, `map ${id} leftover walk west keeps slide through road seams`);

    for (const stone of map.plats.filter((p) => p.h <= 24)) {
      const mid = stone.x + stone.w / 2;
      const road = surfaceAt(map.plats, mid);
      if (road == null) continue;
      const stepOnto = groundAt(map.plats, mid, road, true);
      assert.notEqual(stepOnto, stone.y, `map ${id} leftover stone at ${stone.x} must not steal a grounded step`);
      assert.ok(road - stone.y > STEP_HEIGHT, `map ${id} leftover stone at ${stone.x} stays above STEP_HEIGHT`);
    }
  }
});

test("sword/combat leftover readability still holds after hunt teleport; PR #10 numbers stay", () => {
  assert.match(game, /ctx\.imageSmoothingEnabled=false;ctx\.shadowColor=late\?"rgba\(255,246,210,\.88\)":"rgba\(135,62,198,\.3\)";ctx\.shadowBlur=late\?12:7; \/\/ LMB sword rim stays readable on maps 5–6 after #48\/#50 late stroke; leftover still readable after #70 road-step; leftover still readable after hunt teleport/);
  assert.match(game, /ctx\.lineWidth=late\?4:3;ctx\.strokeStyle=late\?"rgba\(6,2,4,\.96\)":"rgba\(4,10,6,\.9\)";ctx\.strokeText\("HUNT",0,-10\); \/\/ leftover HUNT still readable after #70 road-step; leftover still readable after followHold; leftover still readable after hunt teleport/);
  assert.match(game, /ctx\.fillText\(`ALLY · \$\{companionName\}\$\{huntTag\}  \$\{Math\.ceil\(ally\.health\)\} \/ \$\{ally\.maxHealth\}`,ally\.x,barY-5\); \/\/ ALLY · HUNT leftover still keeps #58 late stroke with sword rim \/ lynx \/ wyrm health; leftover still readable after #70 road-step; leftover still readable after followHold; leftover still readable after hunt teleport/);
  assert.match(game, /ctx\.lineWidth=late\?4:3;ctx\.strokeStyle=late\?"rgba\(6,2,4,\.96\)":"rgba\(10,2,10,\.9\)";ctx\.strokeText\(healthLabel,wyrm\.x\+recoilX,barY-3\); \/\/ heart wyrm health keeps late stroke with HUNT; leftover still readable after #70 road-step; leftover still readable after followHold; leftover still readable after hunt teleport/);
  assert.match(game, /ctx\.lineWidth=late\?4:3;ctx\.strokeStyle=late\?"rgba\(6,2,4,\.96\)":"rgba\(20,8,4,\.9\)";ctx\.strokeText\(healthLabel,beast\.x\+recoilX,barY-3\); \/\/ kiln lynx health keeps late stroke with HUNT; leftover still readable after #70 road-step; leftover still readable after followHold; leftover still readable after hunt teleport/);
  assert.match(game, /drawHuntMark\(wyrm\.x\+recoilX,barY-28,now,currentHuntTarget\(\)===wyrm\)/);
  assert.match(game, /drawHuntMark\(beast\.x\+recoilX,barY-26,now,currentHuntTarget\(\)===beast\); \/\/ fox\/stag\/lynx keep HUNT \+ stroked hurt/);
  assert.equal(num(/const SWORD_DAMAGE = (\d+)/, "SWORD_DAMAGE"), 15);
  assert.equal(num(/const COMPANION_HUNT_RANGE = (\d+)/, "COMPANION_HUNT_RANGE"), 520);
  assert.equal(num(/const COMPANION_STRIKE_RANGE = (\d+)/, "COMPANION_STRIKE_RANGE"), 132);
  assert.equal(num(/const COMPANION_STRIKE_DAMAGE = (\d+)/, "COMPANION_STRIKE_DAMAGE"), 5);
  assert.equal(num(/const COMPANION_STRIKE_RECOVERY = (\d+)/, "COMPANION_STRIKE_RECOVERY"), 840);
  assert.equal(num(/const COMBAT_ONLY_AGGRO_RANGE = (\d+)/, "COMBAT_ONLY_AGGRO_RANGE"), 220);
  assert.equal(num(/const EXTRA_CHASE_LEEWAY = (\d+)/, "EXTRA_CHASE_LEEWAY"), 360);
  assert.equal(canStrike(200, 200 + 120), true);
  assert.equal(canStrike(200, 200 + 140), false);

  const lateStroke = (late) => ({
    width: late ? 4 : 3,
    hunt: late ? "rgba(6,2,4,.96)" : "rgba(4,10,6,.9)",
    swordBlur: late ? 12 : 7,
    sword: late ? "rgba(255,246,210,.88)" : "rgba(135,62,198,.3)",
  });
  assert.deepEqual(lateStroke(true), { width: 4, hunt: "rgba(6,2,4,.96)", swordBlur: 12, sword: "rgba(255,246,210,.88)" });
  assert.deepEqual(lateStroke(false), { width: 3, hunt: "rgba(4,10,6,.9)", swordBlur: 7, sword: "rgba(135,62,198,.3)" });
});

test("locks hold: Moon Night, #19–#74 helpers, PR #10 numbers, talk tables, no dating, no maps 7+", () => {
  assert.match(game, /PLAYER_NAME = "Moon Night"/);
  assert.match(campaign, /PLAYER_DISPLAY_NAME = "Moon Night"/);
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);
  assert.match(game, /const plantedHuntHoldAt=\(map:MapId,rawHoldX:number,huntedX:number\)=>\{/);
  assert.match(game, /const keepCreatureOnRoad=\(creature:\{x:number;y:number;groundY:number\},map:MapId\)=>\{/);
  assert.match(game, /const companionIdleLeftover = \(ally:\{mode:DragonMode;prevMode:DragonMode;modeBlendAt:number;gait:number;groundY:number;y:number\}, groundAlly:boolean, now:number\) => \{/);
  assert.match(game, /const idleSeat=!hunting\?plantedFloorAt\(map,ally\.x\):null/);
  assert.match(game, /const followHold=!hunting\?plantedFloorAt\(map,followX\):null/);
  assert.match(game, /const holdFollowX=followHold\?creatureEdgeAt\(map,followHold\.x\):followX/);
  assert.match(game, /const seat=followHold\?\?plantedFloorAt\(map,followX\)/);
  assert.match(game, /const huntHold=hunting\?plantedHuntHoldAt\(map,rawHoldX,targetX\):null/);
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
