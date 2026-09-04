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

const SINGLE_JUMP = 100;
const STEP_NEAR = 90;
const maps = {
  1: { w: 7200, plats: extractPlatforms("map1Platforms") },
  2: { w: 5400, plats: extractPlatforms("map2Platforms") },
  3: { w: 5800, plats: extractPlatforms("map3Platforms") },
  4: { w: 6000, plats: extractPlatforms("map4Platforms") },
  5: { w: 6200, plats: extractPlatforms("map5Platforms") },
  6: { w: 6600, plats: extractPlatforms("map6Platforms") },
};

const hasMidStone = (plats, secret, side) => {
  const stones = plats.filter((p) => p.h <= 24 && p.y > secret.y && p.y - secret.y <= SINGLE_JUMP);
  return stones.some((stone) => {
    const stoneMid = stone.x + stone.w / 2;
    const secretMid = secret.x + secret.w / 2;
    const gap = side === "west"
      ? secret.x - (stone.x + stone.w)
      : stone.x - (secret.x + secret.w);
    const overlap = stone.x < secret.x + secret.w && stone.x + stone.w > secret.x;
    return (overlap || (gap >= -20 && gap <= STEP_NEAR)) && (side === "west" ? stoneMid <= secretMid + 20 : stoneMid >= secretMid - 20);
  });
};

const roadToStone = (plats, stone) => {
  const ys = [];
  for (let x = stone.x; x <= stone.x + stone.w; x += 8) {
    const ground = surfaceAt(plats, x);
    if (ground != null) ys.push(ground);
  }
  return ys.length ? Math.min(...ys) - stone.y : null;
};

test("named secrets and the map 4 east perch stay on a single-jump chain from the road", () => {
  assert.match(game, /\{x:2320,y:508,w:140,h:18\}/);
  assert.match(game, /\{x:2448,y:428,w:150,h:18\}/);
  assert.match(game, /\{x:2588,y:382,w:210,h:18\}/);
  assert.match(game, /\{x:5460,y:500,w:140,h:18\}/);
  assert.match(game, /\{x:5320,y:430,w:160,h:18\}/);
  assert.match(game, /\{x:5200,y:500,w:140,h:18\}/);

  const climbs = [
    { map: 1, x: 2588, y: 382, w: 210, needEast: true, approach: { x: 2320, y: 508, w: 140 } },
    { map: 1, x: 6520, y: 430, w: 170, needEast: true },
    { map: 2, x: 1515, y: 430, w: 155, needEast: true },
    { map: 3, x: 1510, y: 418, w: 200, needEast: true },
    { map: 3, x: 4500, y: 430, w: 160, needEast: true },
    { map: 4, x: 2580, y: 440, w: 170, needEast: true },
    { map: 4, x: 5320, y: 430, w: 160, needEast: true },
    { map: 5, x: 1480, y: 440, w: 170, needEast: true },
    { map: 5, x: 5780, y: 422, w: 160, needEast: true },
    { map: 6, x: 5920, y: 430, w: 180, needEast: true },
  ];
  for (const secret of climbs) {
    const plats = maps[secret.map].plats;
    assert.ok(hasMidStone(plats, secret, "west"), `map ${secret.map} secret at ${secret.x} needs a west mid-stone`);
    if (secret.needEast) {
      assert.ok(hasMidStone(plats, secret, "east"), `map ${secret.map} secret at ${secret.x} needs an east mid-stone`);
    }
    const road = surfaceAt(plats, secret.x + secret.w / 2);
    assert.notEqual(road, null, `map ${secret.map} secret at ${secret.x} stays over road`);
    const stones = plats.filter((p) => p.h <= 24 && p.y > secret.y && p.y - secret.y <= SINGLE_JUMP);
    const near = stones.filter((stone) => {
      const gapWest = secret.x - (stone.x + stone.w);
      const gapEast = stone.x - (secret.x + stone.w);
      const overlap = stone.x < secret.x + secret.w && stone.x + stone.w > secret.x;
      return overlap || (gapWest >= -20 && gapWest <= STEP_NEAR) || (gapEast >= -20 && gapEast <= STEP_NEAR);
    });
    assert.ok(near.some((stone) => {
      const rise = roadToStone(plats, stone);
      return rise != null && rise <= SINGLE_JUMP;
    }), `map ${secret.map} secret at ${secret.x} needs a mid-stone the road can single-jump`);
  }

  const plaqueApproach = maps[1].plats.find((p) => p.x === 2320 && p.y === 508);
  assert.ok(plaqueApproach, "plaque west approach stone stays planted");
  assert.ok(roadToStone(maps[1].plats, plaqueApproach) <= SINGLE_JUMP, "plaque west approach is a single jump from the road");

  const map4East = maps[4].plats.find((p) => p.x === 5460 && p.y === 500);
  assert.ok(map4East, "map 4 east perch keeps an east mid-stone");
  assert.ok(roadToStone(maps[4].plats, map4East) <= SINGLE_JUMP, "map 4 east perch east stone is a single jump from the road");
});

test("maps 1–6 stay gapless after the approach stones", () => {
  for (const [id, map] of Object.entries(maps)) {
    assert.deepEqual(walkableGaps(map.plats, map.w), [], `map ${id} should have no walkable void gaps`);
  }
});

test("hunting companions stay leashed to the road instead of a tall perch", () => {
  assert.match(game, /const stayForHunt=hunted&&Math\.abs\(pl\.x-hunted\.x\)<COMPANION_HUNT_RANGE\+140&&Math\.abs\(ally\.x-hunted\.x\)<COMPANION_TELEPORT_DISTANCE/);
  assert.match(game, /if\(Math\.abs\(pl\.x-ally\.x\)>COMPANION_TELEPORT_DISTANCE&&!stayForHunt\)/);
  assert.match(game, /keepCreatureOnRoad\(ally,map\);\n {6}\}/);
  assert.match(game, /const huntSeat=hunting&&hunted&&"groundY" in hunted\?\(hunted as \{groundY:number\}\)\.groundY:playerGround/);
  assert.match(game, /const targetY=followMode==="fly"\?Math\.min\(huntSeat-68,ally\.groundY-76\):ally\.groundY-hopBlend/);
  assert.match(game, /const keepCreatureOnRoad=\(creature:\{x:number;y:number;groundY:number\},map:MapId\)=>\{/);
  assert.match(game, /keepCreatureOnRoad\(ally,map\)/);
  assert.match(game, /if\(ally\.y>ally\.groundY\+28\)ally\.y=ally\.groundY/);
  assert.match(game, /const COMPANION_TELEPORT_DISTANCE = 720/);
  assert.match(game, /const COMPANION_HUNT_RANGE = 520/);
  assert.match(game, /const COMPANION_STRIKE_RANGE = 132/);
  assert.match(game, /const COMPANION_STRIKE_DAMAGE = 5/);
  assert.match(game, /const COMPANION_STRIKE_RECOVERY = 840/);
  assert.match(game, /if\(hunting&&hunted\)\{ally\.targetX=hunted\.x;ally\.attackUntil=now\+1600;\}/);
  assert.doesNotMatch(game, /ally\.attackUntil=now\+900/);

  const COMPANION_TELEPORT_DISTANCE = 720;
  const COMPANION_HUNT_RANGE = 520;
  const stayForHunt = (plX, allyX, huntedX) =>
    Math.abs(plX - huntedX) < COMPANION_HUNT_RANGE + 140 && Math.abs(allyX - huntedX) < COMPANION_TELEPORT_DISTANCE;
  const shouldTeleport = (plX, allyX, huntedX) => Math.abs(plX - allyX) > COMPANION_TELEPORT_DISTANCE && !stayForHunt(plX, allyX, huntedX);
  assert.equal(shouldTeleport(2680, 2680 - 800, 2680), true, "ally stuck west of a perch still teleports into the hunt");
  assert.equal(shouldTeleport(2680, 2600, 2680), false, "ally already on the hunt leash does not teleport");
  assert.equal(shouldTeleport(400, 1300, 1800), true, "far follow without a nearby hunt still teleports");

  const perchY = 382;
  const roadY = 550;
  const huntSeat = (hunting, huntedGround, playerGround) => hunting && huntedGround != null ? huntedGround : playerGround;
  const flyY = (seat, groundY) => Math.min(seat - 68, groundY - 76);
  assert.ok(flyY(huntSeat(true, roadY, perchY), roadY) > perchY, "hunt flight seats to prey road, not the tall perch");
  assert.equal(flyY(huntSeat(false, roadY, perchY), roadY), perchY - 68);
});

test("walk↔fly flap keeps locoPoseMode instead of snapping roosts and dragons", () => {
  assert.match(game, /if\(blend<0\.58&&animal\.prevMode==="fly"&&\(animal\.mode==="idle"\|\|animal\.mode==="walk"\|\|animal\.mode==="run"\)\) return animal\.prevMode/);
  assert.match(game, /if\(blend<0\.5&&\(animal\.prevMode==="walk"\|\|animal\.prevMode==="idle"\|\|animal\.prevMode==="run"\)&&animal\.mode==="fly"\) return animal\.prevMode/);
  assert.match(game, /const poseMode=locoPoseMode\(dragon,now\)/);
  assert.match(game, /const poseMode=locoPoseMode\(ally,now\)/);
  assert.match(game, /const poseMode=locoPoseMode\(roost,now\)/);
  assert.match(game, /roost\.mode==="fly"\?flapFrame\(roost\.gait\|\|elapsed,frames\.length\)/);
  assert.match(game, /if\(poseMode!==roost\.mode&&poseMode==="fly"\)index=flapFrame\(roost\.gait\|\|elapsed,poseFrames\.length\)/);
  assert.match(game, /if\(roost\.mode==="fly"\|\|poseMode==="fly"\)\{\n {10}const beat=flapPhase\(roost\.gait\|\|elapsed\)/);
  assert.match(game, /if\(dragon\.mode==="fly"\|\|poseMode==="fly"\)\{\n {8}const beat=flapPhase\(gait\)/);
  assert.match(game, /const MODE_BLEND_MS = 260/);
  assert.match(game, /const DRAGON_FLAP_MS = 320/);
  assert.doesNotMatch(game, /new AnimationSystem|skeletonRig|spineRuntime|createGaitMachine/);
});

test("softlock markers and PR #10 / #19–#34 helpers stay put", () => {
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);
  assert.match(game, /const keepCreatureOnRoad=\(creature:\{x:number;y:number;groundY:number\},map:MapId\)=>\{/);
  assert.match(game, /const gaitBlendAmt = \(blendAt:number, now:number\)=>easeInOut\(clamp\(\(now-blendAt\)\/MODE_BLEND_MS,0,1\)\)/);
  assert.match(game, /const locoPoseMode = \(animal:\{mode:DragonMode;prevMode:DragonMode;modeBlendAt:number\}, now:number\)/);
  assert.match(game, /const hudLockFor=\(map:MapId,held:string\[\],ended:boolean\)=>\(\{name:MAP_STORY\[map\]\.name,objective:lateObjectiveFor\(map,held,ended\)\}\)/);
  assert.match(game, /const drawCardPressE=\(x:number,y:number\)=>\{/);
  assert.match(game, /const lateMapContactShade = \(map:MapId\) => map===5/);
  assert.match(game, /if\(ally\.y>ally\.groundY\+28\)ally\.y=ally\.groundY/);
  assert.match(game, /if\(pl\.y>WORLD_H\+80\)\{pl\.x=Math\.max\(120,pl\.x-180\);pl\.y=240/);
  assert.match(game, /const COMPANION_HUNT_RANGE = 520/);
  assert.match(game, /const COMPANION_STRIKE_RANGE = 132/);
  assert.match(game, /const COMPANION_STRIKE_DAMAGE = 5/);
  assert.match(game, /const COMPANION_STRIKE_RECOVERY = 840/);
  assert.match(game, /const COMBAT_ONLY_AGGRO_RANGE = 220/);
  assert.match(game, /const EXTRA_CHASE_LEEWAY = 360/);
  assert.match(game, /PLAYER_NAME = "Moon Night"/);
  assert.match(campaign, /PLAYER_DISPLAY_NAME = "Moon Night"/);
  assert.doesNotMatch(game, /Moon Knight|bondMeter|dating sim|affectionMeter|romanceChoice|MAP7_/);
  assert.doesNotMatch(game, /radio encounter|tune the radio|drawPixelHouse|drawCastleKeep/i);
  assert.doesNotMatch(game, /map:\s*7|Map 7/);
  assert.equal((game.match(/firstTalk:\[/g) || []).length, 35);
  assert.equal((game.match(/againTalk:\[/g) || []).length, 35);
  assert.equal((game.match(/afterCaptureTalk:\[/g) || []).length, 35);
});
