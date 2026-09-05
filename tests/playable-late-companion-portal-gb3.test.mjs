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

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const easeInOut = (t) => t * t * (3 - 2 * t);
const PH = 92;
const PW = 46;
const PLAYER_EDGE_MARGIN = 28;
const CARD_FLOOR_INSET = 22;
const CARD_WALL_CLEAR = 28;
const SCENERY_PROP_XS = [380,760,1110,1490,1810,2190,2570,2940,3310,3710,4100,4510,4780,4980,5150,5420,5580,5860,6040,6280,6460,6640,6820,6980];
const maps = {
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

const hopArc = (t, height) => {
  const u = clamp(t, 0, 1), peak = 0.36;
  const shaped = u < peak ? easeInOut(u / peak) : 1 - easeInOut((u - peak) / (1 - peak));
  return shaped * height;
};
const gaitBlendAmt = (blendAt, now) => easeInOut(clamp((now - blendAt) / 260, 0, 1));
const flyLandAmt = (animal, now) =>
  animal.prevMode === "fly" && (animal.mode === "idle" || animal.mode === "walk" || animal.mode === "run")
    ? (1 - gaitBlendAmt(animal.modeBlendAt, now)) * 28
    : 0;
const groundBeastHop = (beast, now) => {
  if (now >= beast.leapUntil || beast.id.startsWith("heart-wyrm") || beast.id.startsWith("ash-roost")) return 0;
  if (beast.mode !== "walk" && beast.mode !== "run" && beast.mode !== "idle") return 0;
  const span = beast.leapUntil - beast.leapStarted;
  const hopT = span > 0 ? clamp((now - beast.leapStarted) / span, 0, 1) : 0;
  return hopArc(hopT, 52);
};
const companionIdleLeftover = (ally, groundAlly, now) => {
  const land = flyLandAmt(ally, now);
  if (!groundAlly) return land;
  const leftoverAir = Math.max(0, ally.groundY - ally.y);
  const hopPrev = (ally.prevMode === "run" || ally.mode === "run")
    ? Math.min(leftoverAir, Math.abs(Math.sin((ally.gait || 0) * 0.008)) * 38)
    : 0;
  return hopPrev * (1 - gaitBlendAmt(ally.modeBlendAt, now));
};

const portalReseat = (plats, width, playerX, facing, mapId) => {
  const seat = plantedFloorAt(plats, width, playerX - facing * 96, mapId);
  const x = creatureEdgeAt(width, seat.x);
  return { x, groundY: seat.groundY, y: seat.groundY };
};

const assertPlanted = (mapId, ally, label) => {
  const map = maps[mapId];
  assert.ok(ally.x >= PLAYER_EDGE_MARGIN && ally.x <= map.w - PLAYER_EDGE_MARGIN, `${label} stays on-map`);
  assert.notEqual(surfaceAt(map.plats, ally.x), null, `${label} needs road`);
  assert.equal(standingInsideStone(map.plats, ally.x, ally.groundY), false, `${label} is not inside a stone`);
  assert.equal(cardBlockedAt(map.plats, mapId, ally.x), false, `${label} stays off walls`);
  assert.ok(ally.groundY >= 545, `${label} sits on the road, not a perch`);
  assert.ok(ally.y <= ally.groundY, `${label} must not sit underground`);
};

test("companion hop/roost leftover still eases through idle after sleep→wake and portal reseat", () => {
  assert.match(game, /const companionIdleLeftover = \(ally:\{mode:DragonMode;prevMode:DragonMode;modeBlendAt:number;gait:number;groundY:number;y:number\}, groundAlly:boolean, now:number\) => \{/);
  assert.match(game, /const leftover=companionIdleLeftover\(ally,groundAlly,now\)/);
  assert.match(game, /ally\.y\+=\(ally\.groundY-leftover-ally\.y\)\*\(1-Math\.exp\(-12\*dt\)\); \/\/ hop\/roost leftover still eases through idle after sleep→wake and portal reseat/);
  assert.match(game, /const hop=groundAlly&&distance>190\?Math\.abs\(Math\.sin\(ally\.gait\*\.008\)\)\*38:0/);
  assert.match(game, /const hopBlend=hopPrev\+\(hop-hopPrev\)\*easeInOut/);
  assert.match(game, /const idleSeat=!hunting\?plantedFloorAt\(map,ally\.x\):null/);
  assert.match(game, /if\(idleSeat\)\{ally\.x=creatureEdgeAt\(map,idleSeat\.x\);ally\.groundY=idleSeat\.groundY;\}/);
  assert.match(game, /keepCreatureOnRoad\(ally,map\)/);
  assert.match(game, /const arrivalGround=seat\.groundY; \/\/ companion portal reseat still plants after #38 floors/);
  assert.match(game, /const reseatGround=seat\.groundY; \/\/ companion portal reseat still plants after #38 floors/);
  assert.match(game, /const sleep=mode==="sleep"&&sleepPose>=0\.72; \/\/ curl only while asleep; sleep→wake uses sleepPoseAmt stand-up, no frozen curl frame/);

  const hopMid = companionIdleLeftover({
    mode: "idle", prevMode: "run", modeBlendAt: 0, gait: 200, groundY: 590, y: 552,
  }, true, 80);
  assert.ok(hopMid > 8, "run→idle still keeps leftover hop air");
  const hopDone = companionIdleLeftover({
    mode: "idle", prevMode: "run", modeBlendAt: 0, gait: 200, groundY: 590, y: 552,
  }, true, 260);
  assert.equal(hopDone, 0, "hop leftover finishes with MODE_BLEND");
  const plantedWake = companionIdleLeftover({
    mode: "idle", prevMode: "sleep", modeBlendAt: 0, gait: 0, groundY: 590, y: 590,
  }, true, 40);
  assert.equal(plantedWake, 0, "sleep→wake on the road does not invent hop air");
  const portalGround = companionIdleLeftover({
    mode: "idle", prevMode: "run", modeBlendAt: 0, gait: 400, groundY: 590, y: 590,
  }, true, 40);
  assert.equal(portalGround, 0, "portal reseat on the road does not invent hop air");
  const roostStart = companionIdleLeftover({
    mode: "idle", prevMode: "fly", modeBlendAt: 0, gait: 0, groundY: 590, y: 532,
  }, false, 0);
  const roostMid = companionIdleLeftover({
    mode: "idle", prevMode: "fly", modeBlendAt: 0, gait: 0, groundY: 590, y: 532,
  }, false, 130);
  const roostDone = companionIdleLeftover({
    mode: "idle", prevMode: "fly", modeBlendAt: 0, gait: 0, groundY: 590, y: 532,
  }, false, 260);
  assert.ok(roostStart > roostMid && roostMid > roostDone, "fly→idle roost leftover eases the last air");
  assert.equal(roostDone, 0);

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
    keepCreatureOnRoad(ally, map.plats, map.w, scene.map);
    const leftover = companionIdleLeftover({
      mode: "idle", prevMode: "run", modeBlendAt: 0, gait: 180, groundY: ally.groundY, y: ally.y,
    }, true, 40);
    assert.equal(leftover, 0, `map ${scene.map} ${scene.label} portal reseat stays planted`);
    assertPlanted(scene.map, ally, `map ${scene.map} ${scene.label}`);
  }

  const wakeSeats = [
    { map: 5, x: 1660, label: "coal leftover" },
    { map: 5, x: 5960, label: "east gate leftover" },
    { map: 6, x: 2860, label: "wyrm perch leftover" },
    { map: 6, x: 6100, label: "echo leftover" },
  ];
  for (const seat of wakeSeats) {
    const map = maps[seat.map];
    const idleSeat = plantedFloorAt(map.plats, map.w, seat.x, seat.map);
    const ally = { x: creatureEdgeAt(map.w, idleSeat.x), y: idleSeat.groundY, groundY: idleSeat.groundY };
    keepCreatureOnRoad(ally, map.plats, map.w, seat.map);
    const leftover = companionIdleLeftover({
      mode: "idle", prevMode: "sleep", modeBlendAt: 0, gait: 0, groundY: ally.groundY, y: ally.y,
    }, true, 80);
    assert.equal(leftover, 0, `map ${seat.map} ${seat.label} sleep→wake stays planted`);
    assertPlanted(seat.map, ally, `map ${seat.map} ${seat.label}`);
  }
});

test("late-map fox/stag/lynx/wyrm keepCreatureOnRoad + gait/hop stay readable without combat number changes", () => {
  assert.match(game, /const keepCreatureOnRoad=\(creature:\{x:number;y:number;groundY:number\},map:MapId\)=>\{/);
  assert.match(game, /const groundBeastHop = \(beast:\{id:string;mode:DragonMode;leapStarted:number;leapUntil:number\}, now:number\)=>\{/);
  assert.match(game, /if\(beast\.mode!=="walk"&&beast\.mode!=="run"&&beast\.mode!=="idle"\)return 0/);
  assert.match(game, /const hop=groundBeastHop\(jackal,now\)/);
  assert.match(game, /const land=flyLandAmt\(jackal,now\)/);
  assert.match(game, /keepCreatureOnRoad\(jackal,mapRef\.current\)/);
  assert.match(game, /createBeast\("cinder-fox-a",920,620,1480/);
  assert.match(game, /createBeast\("pale-stag-a",1760,1180,2680/);
  assert.match(game, /createBeast\("ember-lynx-a",1280,980,1680/);
  assert.match(game, /createBeast\("heart-wyrm",2480,1880,3180/);
  assert.match(game, /const COMPANION_HUNT_RANGE = 520/);
  assert.match(game, /const COMPANION_STRIKE_RANGE = 132/);
  assert.match(game, /const COMPANION_STRIKE_DAMAGE = 5/);
  assert.match(game, /const COMPANION_STRIKE_RECOVERY = 840/);
  assert.match(game, /const COMBAT_ONLY_AGGRO_RANGE = 220/);
  assert.match(game, /const EXTRA_CHASE_LEEWAY = 360/);

  const packs = [
    { map: 3, id: "cinder-fox-a", x: 920, hops: true },
    { map: 4, id: "pale-stag-a", x: 1760, hops: true },
    { map: 5, id: "ember-lynx-c", x: 4520, hops: true },
    { map: 5, id: "ember-lynx-a", x: 1480, hops: true },
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

test("maps 5–6 entry/exit cream stroke + nearPortalAt stay consistent with #52 early portal cream", () => {
  assert.match(game, /const PORTAL_PROMPT_RANGE = 145/);
  assert.match(game, /const nearPortalAt = \(x:number, portalX:number\) => Math\.abs\(x-\(portalX\+55\)\)<PORTAL_PROMPT_RANGE/);
  assert.match(game, /const lateMapContactShade = \(map:MapId\) => map===5/);
  assert.match(game, /ctx\.lineWidth=late\?5:4;ctx\.strokeStyle=late\?"rgba\(6,2,4,\.96\)":"rgba\(6,8,10,\.88\)";ctx\.strokeText\(label,cx,groundY-188\)/);
  assert.match(game, /ctx\.fillStyle="#fff6d2";ctx\.fillText\(label,cx,groundY-188\); \/\/ early-map west\/east tags keep cream fill after #48\/#50 late stroke/);
  assert.match(game, /ctx\.strokeText\("PRESS E",cx,groundY-174\); \/\/ maps 5–6 entry\/exit keep #52 cream fill \+ late stroke with nearPortalAt/);
  assert.match(game, /ctx\.fillStyle="#fff6d2";ctx\.fillText\("PRESS E",cx,groundY-174\)/);
  assert.match(game, /else if\(map===5&&nearPortalAt\(x,MAP5_ENTRY_X\)\) enterMap\(4,5\)/);
  assert.match(game, /else if\(map===5&&nearPortalAt\(x,MAP5_EXIT_X\)\) enterMap\(6,5\)/);
  assert.match(game, /else if\(map===6&&nearPortalAt\(x,MAP6_ENTRY_X\)\) enterMap\(5,6\)/);
  assert.match(game, /WEST · CLIFFS/);
  assert.match(game, /EAST · HEART/);
  assert.match(game, /WEST · EMBER/);
  assert.doesNotMatch(game, /ctx\.fillStyle=late\?"#fff6d2":"rgba\("\+portalColor\+","\+tagPulse\+"\)"/);
  assert.doesNotMatch(game, /ctx\.fillStyle=near\|\|late\?"#fff6d2"/);

  const nearPortalAt = (x, portalX) => Math.abs(x - (portalX + 55)) < 145;
  const portals = [
    { map: 5, x: 105, label: "WEST · CLIFFS" },
    { map: 5, x: 6070, label: "EAST · HEART" },
    { map: 6, x: 105, label: "WEST · EMBER" },
  ];
  for (const portal of portals) {
    const map = maps[portal.map];
    const cx = portal.x + 55;
    assert.notEqual(surfaceAt(map.plats, cx), null, `map ${portal.map} ${portal.label} stands on the road`);
    assert.equal(nearPortalAt(cx, portal.x), true);
    assert.equal(nearPortalAt(cx - 144, portal.x), true);
    assert.equal(nearPortalAt(cx + 144, portal.x), true);
    assert.equal(nearPortalAt(cx - 145, portal.x), false);
    const rim = clamp(cx, PLAYER_EDGE_MARGIN, map.w - PLAYER_EDGE_MARGIN);
    assert.notEqual(surfaceAt(map.plats, rim), null, `map ${portal.map} ${portal.label} rim stays walkable`);
  }
});

test("locks hold: Moon Night, #19–#58 helpers, PR #10 numbers, kiln talk untouched, no dating, no maps 7+", () => {
  assert.match(game, /PLAYER_NAME = "Moon Night"/);
  assert.match(campaign, /PLAYER_DISPLAY_NAME = "Moon Night"/);
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);
  assert.match(game, /const keepCreatureOnRoad=\(creature:\{x:number;y:number;groundY:number\},map:MapId\)=>\{/);
  assert.match(game, /const idleSeat=!hunting\?plantedFloorAt\(map,ally\.x\):null/);
  assert.match(game, /const companionIdleLeftover = \(ally:\{mode:DragonMode;prevMode:DragonMode;modeBlendAt:number;gait:number;groundY:number;y:number\}, groundAlly:boolean, now:number\) => \{/);
  assert.match(game, /const MAP6_PULSE_X = 4400/);
  assert.match(game, /const lateMapContactShade = \(map:MapId\) => map===5/);
  assert.match(game, /const COMPANION_HUNT_RANGE = 520/);
  assert.match(game, /const COMPANION_STRIKE_RANGE = 132/);
  assert.match(game, /const COMPANION_STRIKE_DAMAGE = 5/);
  assert.match(game, /const COMPANION_STRIKE_RECOVERY = 840/);
  assert.match(game, /const COMBAT_ONLY_AGGRO_RANGE = 220/);
  assert.match(game, /const EXTRA_CHASE_LEEWAY = 360/);
  assert.match(game, /\{id:"sera",name:"Sera",map:5,x:5720/);
  assert.match(game, /\{id:"vess",name:"Vess",map:5,x:2960/);
  assert.match(game, /\{id:"tamsin",name:"Tamsin",map:5,x:5000/);
  assert.match(game, /\{id:"maer",name:"Maer",map:5,x:3600/);
  assert.match(game, /\{id:"perrin",name:"Perrin",map:5,x:3260/);
  assert.match(game, /\{id:"isk",name:"Isk",map:5,x:1770/);
  assert.doesNotMatch(game, /Moon Knight|bondMeter|dating sim|affectionMeter|romanceChoice|MAP7_/);
  assert.doesNotMatch(game, /radio encounter|tune the radio|drawPixelHouse|drawCastleKeep/i);
  assert.doesNotMatch(game, /map:\s*7|Map 7/);
  assert.equal((game.match(/firstTalk:\[/g) || []).length, 37);
  assert.equal((game.match(/againTalk:\[/g) || []).length, 37);
  assert.equal((game.match(/afterCaptureTalk:\[/g) || []).length, 37);
});
