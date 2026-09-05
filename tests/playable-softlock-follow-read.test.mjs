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

test("maps 1–6 stay gapless and portal/spawn/respawn plant off void and out of stones", () => {
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);
  assert.match(game, /if\(platformsFor\(map\)\.some\(p=>p\.h<=24&&nx\+PW\*\.5>p\.x&&nx-PW\*\.5<p\.x\+p\.w&&p\.y<g-2&&p\.y\+p\.h>head\+2\)\)return null/);
  assert.match(game, /if\(from===null\)\{const floor=plantedFloorAt\(1,230\);return \{x:floor\.x,y:plantedYAt\(1,floor\.x\),facing:1/);
  assert.match(game, /const floor=plantedFloorAt\(map,x\);return \{x:floor\.x,y:plantedYAt\(map,floor\.x\),facing:-1/);
  assert.match(game, /const floor=plantedFloorAt\(mapRef\.current,respawnXFor\(mapRef\.current\)\);pl\.x=floor\.x;pl\.y=plantedYAt\(mapRef\.current,pl\.x\)/);

  const layouts = [
    { id: 1, portals: [7070 + 55], spawns: [230, 6860], respawn: 230, from: [[null], [2]] },
    { id: 2, portals: [105 + 55, 5270 + 55], spawns: [340, 5060], respawn: 340, from: [[1], [3]] },
    { id: 3, portals: [105 + 55, 5670 + 55], spawns: [340, 5460], respawn: 340, from: [[2], [4]] },
    { id: 4, portals: [105 + 55, 5870 + 55], spawns: [340, 5660], respawn: 340, from: [[3], [5]] },
    { id: 5, portals: [105 + 55, 6070 + 55], spawns: [340, 5860], respawn: 340, from: [[4], [6]] },
    { id: 6, portals: [105 + 55, 6470], spawns: [340, 6260], respawn: 340, from: [[5]] },
  ];

  for (const layout of layouts) {
    const map = maps[layout.id];
    assert.deepEqual(walkableGaps(map.plats, map.w), [], `map ${layout.id} should have no walkable void gaps`);
    for (const x of layout.portals) {
      assert.notEqual(surfaceAt(map.plats, x), null, `map ${layout.id} portal x=${x} needs solid ground`);
    }
    for (const from of layout.from) {
      const spawn = spawnFor(layout.id, from[0]);
      assert.notEqual(surfaceAt(map.plats, spawn.x), null, `map ${layout.id} planted spawn x=${spawn.x} needs road`);
      assert.equal(spawn.y + PH, spawn.groundY, `map ${layout.id} planted spawn stands on the surface`);
      assert.equal(standingInsideStone(map.plats, spawn.x, spawn.groundY), false, `map ${layout.id} spawn x=${spawn.x} must not sit inside a stone`);
      assert.ok(spawn.x >= PLAYER_EDGE_MARGIN && spawn.x <= map.w - PLAYER_EDGE_MARGIN, `map ${layout.id} spawn stays on-map`);
    }
    const respawn = plantedFloorAt(map.plats, map.w, layout.respawn, layout.id);
    assert.notEqual(surfaceAt(map.plats, respawn.x), null, `map ${layout.id} respawn needs road`);
    assert.equal(standingInsideStone(map.plats, respawn.x, respawn.groundY), false, `map ${layout.id} respawn must not sit inside a stone`);
  }

  const shoreReturn = spawnFor(2, 3);
  assert.ok(shoreReturn.x < 5060, "map 2 east return should slide off the tide approach stone");
  assert.ok(Math.abs(shoreReturn.x - 5060) <= 24, "map 2 east return should stay near the east gate");
  const unusedHeartEast = spawnFor(6, 4);
  assert.equal(standingInsideStone(maps[6].plats, unusedHeartEast.x, unusedHeartEast.groundY), false, "map 6 east plant stays out of the echo stones");
});

test("when not hunting, companion reseats with plantedFloorAt / keepCreatureOnRoad / teleport", () => {
  assert.match(game, /const stayForHunt=hunted&&Math\.abs\(pl\.x-hunted\.x\)<COMPANION_HUNT_RANGE\+140&&Math\.abs\(ally\.x-hunted\.x\)<COMPANION_TELEPORT_DISTANCE/);
  assert.match(game, /if\(Math\.abs\(pl\.x-ally\.x\)>COMPANION_TELEPORT_DISTANCE&&!stayForHunt\)/);
  assert.match(game, /const seat=followHold\?\?plantedFloorAt\(map,followX\); \/\/ leftover teleport still plants after followHold; hunt path still uses hunted\.x/);
  assert.match(game, /const arrivalX=creatureEdgeAt\(map,seat\.x\)/);
  assert.match(game, /const arrivalGround=seat\.groundY/);
  assert.match(game, /const idleSeat=!hunting\?plantedFloorAt\(map,ally\.x\):null/);
  assert.match(game, /if\(idleSeat\)\{ally\.x=creatureEdgeAt\(map,idleSeat\.x\);ally\.groundY=idleSeat\.groundY;\}/);
  assert.match(game, /keepCreatureOnRoad\(ally,map\)/);
  assert.match(game, /const huntSeat=hunting&&hunted&&"groundY" in hunted\?\(hunted as \{groundY:number\}\)\.groundY:playerGround/);
  assert.match(game, /ally\.attackUntil=0;ally\.attackLanded=false;ally\.recallStarted=0;ally\.targetX=ally\.x;\n {6}keepCreatureOnRoad\(ally,map\)/);

  const COMPANION_TELEPORT_DISTANCE = 720;
  const shouldTeleport = (plX, allyX, hunting) => Math.abs(plX - allyX) > COMPANION_TELEPORT_DISTANCE && !hunting;
  assert.equal(shouldTeleport(2680, 2680 - 800, false), true, "after a perch hop, a far idle ally still teleports");
  assert.equal(shouldTeleport(2680, 2600, false), false, "a nearby idle ally does not teleport");
  assert.equal(shouldTeleport(2680, 2680 - 800, true), false, "hunt leash still skips the follow teleport");

  const perchFollow = plantedFloorAt(maps[1].plats, maps[1].w, 2680 - 104, 1);
  assert.notEqual(surfaceAt(maps[1].plats, perchFollow.x), null, "plaque follow seat stays on the road");
  assert.equal(standingInsideStone(maps[1].plats, perchFollow.x, perchFollow.groundY), false, "plaque follow seat is not inside the climb stones");
  assert.ok(perchFollow.groundY >= 535, "idle reseat after a perch hop sits on the road, not the plaque");

  const map4Follow = plantedFloorAt(maps[4].plats, maps[4].w, 5400 - 104, 4);
  assert.notEqual(surfaceAt(maps[4].plats, map4Follow.x), null, "map 4 east perch follow stays on the road");
  assert.equal(standingInsideStone(maps[4].plats, map4Follow.x, map4Follow.groundY), false);
});

test("late-map HUNT marks and hurt numbers keep contrast on ember/heart shade", () => {
  assert.match(game, /const lateMapContactShade = \(map:MapId\) => map===5/);
  assert.match(game, /const lateShade=lateMapContactShade\(mapRef\.current\)/);
  assert.match(game, /const late=lateMapContactShade\(mapRef\.current\)/);
  assert.match(game, /ctx\.lineWidth=late\?4:3;ctx\.strokeStyle=late\?"rgba\(6,2,4,\.96\)":"rgba\(4,10,6,\.9\)";ctx\.strokeText\("HUNT",0,-10\)/);
  assert.match(game, /ctx\.fillStyle=\(late\?"rgba\(220,255,140,":"rgba\(185,255,99,"\)\+pulse\+"\)"/);
  assert.match(game, /ctx\.lineWidth=late\?5:4;ctx\.strokeStyle=late\?"rgba\(4,2,6,\.96\)":"rgba\(8,4,8,\.92\)";ctx\.strokeText\("-"\+dmg,x,y\)/);
  assert.match(game, /ctx\.shadowColor=late\?"rgba\(255,248,210,\.95\)":"rgba\(255,240,180,\.7\)"/);
  assert.match(game, /drawHuntMark\(wyrm\.x\+recoilX,barY-28,now,currentHuntTarget\(\)===wyrm\)/);
  assert.match(game, /drawHurtNumber\(wyrm\.x\+recoilX,barY-18-hurtProgress\*18,wyrm\.lastDamage,hurtProgress,"#ffdfe8"\)/);
  assert.match(game, /drawHuntMark\(beast\.x\+recoilX,barY-26,now,currentHuntTarget\(\)===beast\); \/\/ fox\/stag\/lynx keep HUNT \+ stroked hurt/);
  assert.match(game, /if\(hurtActive\)drawHurtNumber\(beast\.x\+recoilX,barY-16-hurtProgress\*18,beast\.lastDamage,hurtProgress,"#ffe7a8"\)/);
});

test("softlock markers and PR #10 / #19–#36 helpers stay put; E-talk tables stay GB1's", () => {
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);
  assert.match(game, /const keepCreatureOnRoad=\(creature:\{x:number;y:number;groundY:number\},map:MapId\)=>\{/);
  assert.match(game, /const seatDeadBeast=\(beast:\{x:number;groundY:number;vx:number\},map:MapId\)=>\{/);
  assert.match(game, /const gaitBlendAmt = \(blendAt:number, now:number\)=>easeInOut\(clamp\(\(now-blendAt\)\/MODE_BLEND_MS,0,1\)\)/);
  assert.match(game, /const locoPoseMode = \(animal:\{mode:DragonMode;prevMode:DragonMode;modeBlendAt:number\}, now:number\)/);
  assert.match(game, /const hudLockFor=\(map:MapId,held:string\[\],ended:boolean\)=>\(\{name:MAP_STORY\[map\]\.name,objective:lateObjectiveFor\(map,held,ended\)\}\)/);
  assert.match(game, /const drawCardPressE=\(x:number,y:number\)=>\{/);
  assert.match(game, /const lateMapContactShade = \(map:MapId\) => map===5/);
  assert.match(game, /\{x:2320,y:508,w:140,h:18\}/);
  assert.match(game, /\{x:5460,y:500,w:140,h:18\}/);
  assert.match(game, /if\(ally\.y>ally\.groundY\+28\)ally\.y=ally\.groundY/);
  assert.match(game, /if\(pl\.y>WORLD_H\+80\)\{const floor=plantedFloorAt\(map,Math\.max\(120,pl\.x-180\)\);pl\.x=floor\.x;pl\.y=plantedYAt\(map,floor\.x\)/);
  assert.match(game, /const COMPANION_HUNT_RANGE = 520/);
  assert.match(game, /const COMPANION_STRIKE_RANGE = 132/);
  assert.match(game, /const COMPANION_STRIKE_DAMAGE = 5/);
  assert.match(game, /const COMPANION_STRIKE_RECOVERY = 840/);
  assert.match(game, /const COMBAT_ONLY_AGGRO_RANGE = 220/);
  assert.match(game, /const EXTRA_CHASE_LEEWAY = 360/);
  assert.match(game, /if\(hunting&&hunted\)\{ally\.targetX=hunted\.x;ally\.attackUntil=now\+1600;\}/);
  assert.match(game, /PLAYER_NAME = "Moon Night"/);
  assert.match(campaign, /PLAYER_DISPLAY_NAME = "Moon Night"/);
  assert.doesNotMatch(game, /Moon Knight|bondMeter|dating sim|affectionMeter|romanceChoice|MAP7_/);
  assert.doesNotMatch(game, /radio encounter|tune the radio|drawPixelHouse|drawCastleKeep/i);
  assert.doesNotMatch(game, /map:\s*7|Map 7/);
  assert.equal((game.match(/firstTalk:\[/g) || []).length, 37);
  assert.equal((game.match(/againTalk:\[/g) || []).length, 37);
  assert.equal((game.match(/afterCaptureTalk:\[/g) || []).length, 37);
  assert.match(game, /You named the whole road in shards\. The pulse is the last name/);
  assert.match(game, /The rain I watched since dusk is quieter now\. That is the first shard/);
});
