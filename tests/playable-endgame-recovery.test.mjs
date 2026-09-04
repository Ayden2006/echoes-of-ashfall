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
  let px = Math.max(48, Math.min(width - 48, x));
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

const firstAirDropLanding = (plats, x, startFeetY = 240 + PH) => {
  const hits = plats.filter((p) => x >= p.x && x <= p.x + p.w && p.y >= startFeetY - 8);
  if (!hits.length) return null;
  return hits.reduce((best, p) => (p.y < best.y ? p : best));
};

const portalReseat = (plats, width, playerX, facing, mapId) => {
  const seat = plantedFloorAt(plats, width, playerX - facing * 96, mapId);
  const x = Math.max(PLAYER_EDGE_MARGIN, Math.min(width - PLAYER_EDGE_MARGIN, seat.x));
  return { x, groundY: seat.groundY };
};

test("maps 5–6 void recovery still fires on WORLD_H+80 and plants off leftover stones", () => {
  assert.match(game, /if\(pl\.y>WORLD_H\+80\)\{const floor=plantedFloorAt\(map,Math\.max\(120,pl\.x-180\)\);pl\.x=floor\.x;pl\.y=plantedYAt\(map,floor\.x\);pl\.vy=0;pl\.grounded=true/);
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);
  assert.doesNotMatch(game, /if\(pl\.y>WORLD_H\+80\)\{pl\.x=Math\.max\(120,pl\.x-180\);pl\.y=240/);

  const falls = [
    { map: 5, x: 1660, label: "coal ledge" },
    { map: 5, x: 1800, label: "coal east stone" },
    { map: 5, x: 5960, label: "east gate perch" },
    { map: 5, x: 6100, label: "map 5 east gate stone" },
    { map: 6, x: 2860, label: "wyrm perch" },
    { map: 6, x: 6100, label: "echo stone" },
    { map: 6, x: 6470, label: "heart altar" },
    { map: 6, x: 8000, label: "past-east void" },
  ];
  for (const fall of falls) {
    const map = maps[fall.map];
    const recovered = recoverFromVoid(map.plats, map.w, fall.x, fall.map);
    assert.ok(recovered.x >= 48 && recovered.x <= map.w - 48, `map ${fall.map} ${fall.label} recover stays on-map`);
    assert.notEqual(surfaceAt(map.plats, recovered.x), null, `map ${fall.map} ${fall.label} recover needs road`);
    assert.equal(recovered.y + PH, recovered.groundY, `map ${fall.map} ${fall.label} recover stands on the planted floor`);
    assert.equal(standingInsideStone(map.plats, recovered.x, recovered.groundY), false, `map ${fall.map} ${fall.label} recover is not inside a stone`);
    assert.equal(cardBlockedAt(map.plats, fall.map, recovered.x), false, `map ${fall.map} ${fall.label} recover stays off walls`);
  }

  const coalAir = firstAirDropLanding(maps[5].plats, Math.max(120, 1660 - 180));
  assert.ok(coalAir && coalAir.h <= 24, "pre-plant air-drop at the coal stretch still hits a leftover stone");
  const coalPlant = recoverFromVoid(maps[5].plats, maps[5].w, 1660, 5);
  assert.ok(coalPlant.groundY > 80, "planted void recover sits on the kiln road, not the coal perch");
  assert.ok(coalPlant.groundY >= 550, "planted void recover uses the walkable kiln floor");

  const echoAir = firstAirDropLanding(maps[6].plats, Math.max(120, 6100 - 180));
  assert.ok(echoAir && echoAir.h <= 24, "pre-plant air-drop at the echo stretch still hits a leftover stone");
  const echoPlant = recoverFromVoid(maps[6].plats, maps[6].w, 6100, 6);
  assert.ok(echoPlant.groundY >= 545, "planted void recover sits on the heart road, not the echo perch");
});

test("portal heal flash and companion portal reseat still fire on maps 5–6 after planted floors", () => {
  const enterMap = game.match(/const enterMap = useCallback\(\(map:MapId, from:MapId\|null=mapRef\.current\) => \{[\s\S]*?\},\[showDialogue,tone\]\);/);
  assert.ok(enterMap, "enterMap callback should stay intact");
  assert.match(enterMap[0], /pl\.health=pl\.maxHealth;staminaRef\.current=MAX_STAMINA/);
  assert.match(enterMap[0], /setHealth\(pl\.maxHealth\);setStamina\(MAX_STAMINA\); \/\/ portal heal still fires after companion reseat/);
  assert.match(enterMap[0], /if\(ally\.active&&ally\.itemId\)\{/);
  assert.match(enterMap[0], /const seat=plantedFloorAt\(map,pl\.x-pl\.facing\*96\)/);
  assert.match(enterMap[0], /ally\.x=creatureEdgeAt\(map,seat\.x\)/);
  assert.match(enterMap[0], /const arrivalGround=seat\.groundY; \/\/ companion portal reseat still plants after #38 floors/);
  assert.match(enterMap[0], /keepCreatureOnRoad\(ally,map\)/);
  assert.match(enterMap[0], /portalFlashUntil\.current=performance\.now\(\)\+430; \/\/ portal flash still fires after companion reseat/);
  assert.match(game, /const reseatGround=seat\.groundY; \/\/ companion portal reseat still plants after #38 floors/);
  assert.match(game, /if\(portalFlashUntil\.current>now\)\{ctx\.fillStyle="rgba\(255,244,214,"\+\(\(portalFlashUntil\.current-now\)\/430\*\.18\)\+"\)";ctx\.fillRect\(cameraX,0,viewW,WORLD_H\);\}/);
  assert.match(game, /else if\(map===5&&nearPortalAt\(x,MAP5_EXIT_X\)\) enterMap\(6,5\)/);
  assert.match(game, /else if\(map===6&&nearPortalAt\(x,MAP6_ENTRY_X\)\) enterMap\(5,6\)/);

  const healIdx = enterMap[0].indexOf("pl.health=pl.maxHealth");
  const reseatIdx = enterMap[0].indexOf("const seat=plantedFloorAt(map,pl.x-pl.facing*96)");
  const flashIdx = enterMap[0].indexOf("portalFlashUntil.current=performance.now()+430");
  assert.ok(healIdx >= 0 && reseatIdx > healIdx && flashIdx > reseatIdx, "heal, planted reseat, then flash still run in that order");

  const arrivals = [
    { map: 5, playerX: 340, facing: 1, label: "kiln west arrive" },
    { map: 5, playerX: 5860, facing: -1, label: "kiln east return" },
    { map: 6, playerX: 340, facing: 1, label: "heart west arrive" },
    { map: 6, playerX: 6260, facing: -1, label: "heart unused east plant" },
  ];
  for (const scene of arrivals) {
    const map = maps[scene.map];
    const playerFloor = plantedFloorAt(map.plats, map.w, scene.playerX, scene.map);
    const ally = portalReseat(map.plats, map.w, playerFloor.x, scene.facing, scene.map);
    assert.ok(ally.x >= PLAYER_EDGE_MARGIN && ally.x <= map.w - PLAYER_EDGE_MARGIN, `map ${scene.map} ${scene.label} ally stays on-map`);
    assert.notEqual(surfaceAt(map.plats, ally.x), null, `map ${scene.map} ${scene.label} ally needs road`);
    assert.equal(standingInsideStone(map.plats, ally.x, ally.groundY), false, `map ${scene.map} ${scene.label} ally is not inside a stone`);
    assert.ok(ally.groundY >= 545, `map ${scene.map} ${scene.label} ally sits on the road, not a perch`);
  }
});

test("beastCanStrikePlayer and late HUNT marks stay fair after lateMapContactShade", () => {
  assert.match(game, /const BEAST_ATTACK_VERTICAL = 110/);
  assert.match(game, /const JACKAL_ATTACK_RANGE = 118/);
  assert.match(game, /const beastCanStrikePlayer = \(beast:\{x:number;y:number\}, pl:\{x:number;y:number\}, range=JACKAL_ATTACK_RANGE, vertical=BEAST_ATTACK_VERTICAL\) => Math\.abs\(pl\.x-beast\.x\)<=range && Math\.abs\(\(pl\.y\+42\)-beast\.y\)<vertical/);
  assert.match(game, /if\(beastCanStrikePlayer\(jackal,pl\)\)\{jackalCounterAttack\(jackal,now\);continue;\}/);
  assert.match(game, /if\(beastCanStrikePlayer\(jackal,pl,JACKAL_ATTACK_RANGE\+12,BEAST_ATTACK_VERTICAL\+12\)\)jackalCounterAttack\(jackal,now\)/);
  assert.match(game, /const lateMapContactShade = \(map:MapId\) => map===5/);
  assert.match(game, /const late=lateMapContactShade\(mapRef\.current\)/);
  assert.match(game, /ctx\.lineWidth=late\?4:3;ctx\.strokeStyle=late\?"rgba\(6,2,4,\.96\)":"rgba\(4,10,6,\.9\)";ctx\.strokeText\("HUNT",0,-10\)/);
  assert.match(game, /ctx\.fillStyle=\(late\?"rgba\(220,255,140,":"rgba\(185,255,99,"\)\+pulse\+"\)"/);
  assert.match(game, /drawHuntMark\(wyrm\.x\+recoilX,barY-28,now,currentHuntTarget\(\)===wyrm\)/);
  assert.match(game, /drawHuntMark\(beast\.x\+recoilX,barY-26,now,currentHuntTarget\(\)===beast\); \/\/ fox\/stag\/lynx keep HUNT \+ stroked hurt/);
  assert.match(game, /const COMPANION_HUNT_RANGE = 520/);
  assert.match(game, /const COMPANION_STRIKE_RANGE = 132/);
  assert.match(game, /const COMPANION_STRIKE_DAMAGE = 5/);
  assert.match(game, /const COMPANION_STRIKE_RECOVERY = 840/);
  assert.match(game, /const COMBAT_ONLY_AGGRO_RANGE = 220/);
  assert.match(game, /const EXTRA_CHASE_LEEWAY = 360/);

  const JACKAL_ATTACK_RANGE = 118;
  const BEAST_ATTACK_VERTICAL = 110;
  const beastCanStrikePlayer = (beast, pl, range = JACKAL_ATTACK_RANGE, vertical = BEAST_ATTACK_VERTICAL) =>
    Math.abs(pl.x - beast.x) <= range && Math.abs((pl.y + 42) - beast.y) < vertical;

  const lateRoads = [
    { map: 5, x: 2140, ground: surfaceAt(maps[5].plats, 2140) },
    { map: 5, x: 4520, ground: surfaceAt(maps[5].plats, 4520) },
    { map: 6, x: 2480, ground: surfaceAt(maps[6].plats, 2480) },
    { map: 6, x: 4400, ground: surfaceAt(maps[6].plats, 4400) },
  ];
  for (const road of lateRoads) {
    assert.ok(road.ground != null && road.ground >= 545, `map ${road.map} combat stretch x=${road.x} stays on the road`);
    const beast = { x: road.x, y: road.ground };
    const standing = { x: road.x + 80, y: road.ground - PH };
    const jumping = { x: road.x + 80, y: 330 };
    const far = { x: road.x + 400, y: road.ground - PH };
    assert.equal(beastCanStrikePlayer(beast, standing), true, `map ${road.map} road stand stays inside the strike box`);
    assert.equal(beastCanStrikePlayer(beast, jumping), false, `map ${road.map} air stand stays outside the strike box`);
    assert.equal(beastCanStrikePlayer(beast, far), false, `map ${road.map} far stand stays outside the strike box`);
  }

  const coalBeast = { x: 1480, y: surfaceAt(maps[5].plats, 1480) };
  const coalLedgePlayer = { x: 1480, y: 440 - PH };
  assert.equal(beastCanStrikePlayer(coalBeast, coalLedgePlayer), false, "a kiln-road lynx cannot strike a coal-ledge stand");

  const echoBeast = { x: 5920, y: surfaceAt(maps[6].plats, 5920) };
  const echoLedgePlayer = { x: 5920, y: 430 - PH };
  assert.equal(beastCanStrikePlayer(echoBeast, echoLedgePlayer), false, "a heart-road wyrm cannot strike an echo-ledge stand");
});

test("maps 1–4 stay gapless with jumpable road rises after recent stones; no new climb bug", () => {
  for (const id of [1, 2, 3, 4]) {
    const map = maps[id];
    assert.deepEqual(walkableGaps(map.plats, map.w), [], `map ${id} should have no walkable void gaps`);
    let prev = surfaceAt(map.plats, PLAYER_EDGE_MARGIN);
    for (let x = PLAYER_EDGE_MARGIN; x <= map.w - PLAYER_EDGE_MARGIN; x += 4) {
      const ground = surfaceAt(map.plats, x);
      assert.notEqual(ground, null, `map ${id} road x=${x} must stay walkable`);
      if (prev != null && ground != null) {
        assert.ok(prev - ground <= 106, `map ${id} road rise at x=${x} stays inside a jump`);
      }
      if (ground != null) prev = ground;
    }
  }
});

test("locks hold: Moon Night, planted helpers, PR #10 numbers, Hale / talk tables, no dating, no maps 7+", () => {
  assert.match(game, /PLAYER_NAME = "Moon Night"/);
  assert.match(campaign, /PLAYER_DISPLAY_NAME = "Moon Night"/);
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);
  assert.match(game, /const idleSeat=!hunting\?plantedFloorAt\(map,ally\.x\):null/);
  assert.match(game, /const MAP6_PULSE_X = 4400/);
  assert.match(game, /const lateMapContactShade = \(map:MapId\) => map===5/);
  assert.match(game, /const COMPANION_HUNT_RANGE = 520/);
  assert.match(game, /const COMPANION_STRIKE_RANGE = 132/);
  assert.match(game, /const COMPANION_STRIKE_DAMAGE = 5/);
  assert.match(game, /const COMPANION_STRIKE_RECOVERY = 840/);
  assert.match(game, /const COMBAT_ONLY_AGGRO_RANGE = 220/);
  assert.match(game, /const EXTRA_CHASE_LEEWAY = 360/);
  assert.match(game, /id:"hale"/);
  assert.match(game, /\{id:"hale",name:"Hale",map:5,x:4040/);
  assert.doesNotMatch(game, /Moon Knight|bondMeter|dating sim|affectionMeter|romanceChoice|MAP7_/);
  assert.doesNotMatch(game, /radio encounter|tune the radio|drawPixelHouse|drawCastleKeep/i);
  assert.doesNotMatch(game, /map:\s*7|Map 7/);
  assert.equal((game.match(/firstTalk:\[/g) || []).length, 37);
  assert.equal((game.match(/againTalk:\[/g) || []).length, 37);
  assert.equal((game.match(/afterCaptureTalk:\[/g) || []).length, 37);
});
