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

const maps = {
  1: { w: 7200, plats: extractPlatforms("map1Platforms") },
  2: { w: 5400, plats: extractPlatforms("map2Platforms") },
  3: { w: 5800, plats: extractPlatforms("map3Platforms") },
  4: { w: 6000, plats: extractPlatforms("map4Platforms") },
  5: { w: 6200, plats: extractPlatforms("map5Platforms") },
  6: { w: 6600, plats: extractPlatforms("map6Platforms") },
};

const SINGLE_JUMP = 100;
const STEP_NEAR = 90;

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

test("new mid-height stones keep named secrets and portal perches on a single-jump chain", () => {
  const added = [
    { name: "plaque-west-approach", plat: "{x:2320,y:508,w:140,h:18}" },
    { name: "plaque-east", plat: "{x:2780,y:468,w:150,h:18}" },
    { name: "merlon-east", plat: "{x:6680,y:500,w:150,h:18}" },
    { name: "shell-east", plat: "{x:1680,y:498,w:150,h:18}" },
    { name: "hollow-east", plat: "{x:1690,y:488,w:150,h:18}" },
    { name: "nest-east", plat: "{x:4640,y:500,w:140,h:18}" },
    { name: "lichen-east", plat: "{x:2720,y:508,w:140,h:18}" },
    { name: "map4-east-perch", plat: "{x:5200,y:500,w:140,h:18}" },
    { name: "map4-east-perch-east", plat: "{x:5460,y:500,w:140,h:18}" },
    { name: "coal-east", plat: "{x:1620,y:508,w:140,h:18}" },
    { name: "map5-east-gate", plat: "{x:5920,y:488,w:140,h:18}" },
    { name: "echo-east", plat: "{x:6080,y:490,w:150,h:18}" },
  ];
  for (const stone of added) {
    assert.match(game, new RegExp(stone.plat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), stone.name);
  }

  const kept = [
    { name: "plaque", plat: "{x:2588,y:382,w:210,h:18}", stone: "{x:2448,y:428,w:150,h:18}" },
    { name: "merlon", plat: "{x:6520,y:430,w:170,h:18}", stone: "{x:6380,y:500,w:150,h:18}" },
    { name: "shell", plat: "{x:1515,y:430,w:155,h:18}", stone: "{x:1418,y:498,w:160,h:18}" },
    { name: "tide", plat: "{x:5180,y:432,w:160,h:18}", stone: "{x:5080,y:500,w:140,h:18}" },
    { name: "hollow", plat: "{x:1510,y:418,w:200,h:18}", stone: "{x:1400,y:488,w:150,h:18}" },
    { name: "nest", plat: "{x:4500,y:430,w:160,h:18}", stone: "{x:4380,y:500,w:140,h:18}" },
    { name: "lichen", plat: "{x:2580,y:440,w:170,h:18}", stone: "{x:2460,y:508,w:140,h:18}" },
    { name: "coal", plat: "{x:1480,y:440,w:170,h:18}", stone: "{x:1360,y:508,w:140,h:18}" },
    { name: "echo", plat: "{x:5920,y:430,w:180,h:18}", stone: "{x:5780,y:490,w:150,h:18}" },
  ];
  for (const secret of kept) {
    assert.match(game, new RegExp(secret.plat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), secret.name);
    assert.match(game, new RegExp(secret.stone.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${secret.name} west stone`);
  }

  const secrets = [
    { map: 1, x: 2588, y: 382, w: 210, needEast: true },
    { map: 1, x: 6520, y: 430, w: 170, needEast: true },
    { map: 2, x: 1515, y: 430, w: 155, needEast: true },
    { map: 2, x: 5180, y: 432, w: 160, needEast: false },
    { map: 3, x: 1510, y: 418, w: 200, needEast: true },
    { map: 3, x: 4500, y: 430, w: 160, needEast: true },
    { map: 4, x: 2580, y: 440, w: 170, needEast: true },
    { map: 4, x: 5320, y: 430, w: 160, needEast: true },
    { map: 5, x: 1480, y: 440, w: 170, needEast: true },
    { map: 5, x: 5780, y: 422, w: 160, needEast: true },
    { map: 6, x: 5920, y: 430, w: 180, needEast: true },
  ];
  for (const secret of secrets) {
    const plats = maps[secret.map].plats;
    assert.ok(hasMidStone(plats, secret, "west"), `map ${secret.map} secret at ${secret.x} needs a west mid-stone`);
    if (secret.needEast) {
      assert.ok(hasMidStone(plats, secret, "east"), `map ${secret.map} secret at ${secret.x} needs an east mid-stone`);
    }
    const road = surfaceAt(plats, secret.x + secret.w / 2);
    assert.notEqual(road, null, `map ${secret.map} secret at ${secret.x} stays over road`);
  }
});

test("maps 1–6 still have no walkable void gaps after the new stones", () => {
  for (const [id, map] of Object.entries(maps)) {
    assert.deepEqual(walkableGaps(map.plats, map.w), [], `map ${id} should have no walkable void gaps`);
  }
});

test("east/west portal labels and Press E stay on the existing heal-on-enter portal", () => {
  assert.match(game, /const PORTAL_PROMPT_RANGE = 145/);
  assert.match(game, /const nearPortalAt = \(x:number, portalX:number\) => Math\.abs\(x-\(portalX\+55\)\)<PORTAL_PROMPT_RANGE/);
  assert.match(game, /if\(map===1&&nearPortalAt\(x,MAP1_PORTAL_X\)\) enterMap\(2,1\)/);
  assert.match(game, /else if\(map===5&&nearPortalAt\(x,MAP5_EXIT_X\)\) enterMap\(6,5\)/);
  assert.match(game, /else if\(map===6&&nearPortalAt\(x,MAP6_ENTRY_X\)\) enterMap\(5,6\)/);
  assert.match(game, /else if\(map===1&&nearPortalAt\(pl\.x,MAP1_PORTAL_X\)\)action="Enter Sunset Shore"/);
  assert.match(game, /else if\(map===5&&nearPortalAt\(pl\.x,MAP5_EXIT_X\)\)action="Enter Ashfall's Heart"/);
  assert.match(game, /pl\.health=pl\.maxHealth;staminaRef\.current=MAX_STAMINA/);
  assert.match(game, /EAST · SHORE/);
  assert.match(game, /WEST · RAIN/);
  assert.match(game, /EAST · HOLLOW/);
  assert.match(game, /WEST · SHORE/);
  assert.match(game, /EAST · CLIFFS/);
  assert.match(game, /WEST · HOLLOW/);
  assert.match(game, /EAST · EMBER/);
  assert.match(game, /WEST · CLIFFS/);
  assert.match(game, /EAST · HEART/);
  assert.match(game, /WEST · EMBER/);
  assert.match(game, /ctx\.strokeText\("PRESS E",cx,groundY-174\)/);
  assert.match(game, /const drawPortal=\(x:number,groundY:number,now:number,map:MapId,colorOverride\?:string,label\?:string\)=>\{/);
});

test("late-map combat reads: no air-stuck strikes, clamped lunges, hunt mark, stroked hurt", () => {
  assert.match(game, /const BEAST_ATTACK_VERTICAL = 110/);
  assert.match(game, /const beastCanStrikePlayer = \(beast:\{x:number;y:number\}, pl:\{x:number;y:number\}, range=JACKAL_ATTACK_RANGE, vertical=BEAST_ATTACK_VERTICAL\) => Math\.abs\(pl\.x-beast\.x\)<=range && Math\.abs\(\(pl\.y\+42\)-beast\.y\)<vertical/);
  assert.match(game, /if\(beastCanStrikePlayer\(jackal,pl\)\)\{jackalCounterAttack\(jackal,now\);continue;\}/);
  assert.match(game, /if\(beastCanStrikePlayer\(jackal,pl,JACKAL_ATTACK_RANGE\+12,BEAST_ATTACK_VERTICAL\+12\)\)jackalCounterAttack\(jackal,now\)/);
  assert.match(game, /const lungeBound=chaseBounds\(jackal\.angry,jackal\.patrolMin,jackal\.patrolMax,worldWidthFor\(mapRef\.current\)\)/);
  assert.match(game, /jackal\.x=clamp\(jackal\.x,lungeBound\.min,lungeBound\.max\)/);
  assert.match(game, /const currentHuntTarget=\(\)=>\{/);
  assert.match(game, /const drawHuntMark=\(x:number,y:number,now:number,marked:boolean\)=>\{/);
  assert.match(game, /ctx\.strokeText\("HUNT",0,-10\)/);
  assert.match(game, /const huntTag=currentHuntTarget\(\)\?" · HUNT":""/);
  assert.match(game, /const drawHurtNumber=\(x:number,y:number,dmg:number,progress:number,fill:string\)=>\{/);
  assert.match(game, /ctx\.strokeText\("-"\+dmg,x,y\)/);
  assert.match(game, /drawHurtNumber\(dragon\.x\+recoilX,barY-19-hurtProgress\*22,dragon\.lastDamage,hurtProgress\*1\.15,"#f4ffb0"\)/);
  assert.match(game, /drawHurtNumber\(wyrm\.x\+recoilX,barY-18-hurtProgress\*18,wyrm\.lastDamage,hurtProgress,"#ffdfe8"\)/);
  assert.match(game, /drawHuntMark\(wyrm\.x\+recoilX,barY-28,now,currentHuntTarget\(\)===wyrm\)/);
  assert.match(game, /drawHuntMark\(beast\.x\+recoilX,barY-26,now,currentHuntTarget\(\)===beast\); \/\/ fox\/stag\/lynx keep HUNT \+ stroked hurt/);
  assert.match(game, /if\(hurtActive\)drawHurtNumber\(beast\.x\+recoilX,barY-16-hurtProgress\*18,beast\.lastDamage,hurtProgress,"#ffe7a8"\)/);
  assert.match(game, /const HURT_FLASH_MS = 90/);
  assert.match(game, /if\(hurt&&pixelHurtFlash\(now\)\)ctx\.globalAlpha=\.4/);

  const JACKAL_ATTACK_RANGE = 118;
  const BEAST_ATTACK_VERTICAL = 110;
  const beastCanStrikePlayer = (beast, pl, range = JACKAL_ATTACK_RANGE, vertical = BEAST_ATTACK_VERTICAL) =>
    Math.abs(pl.x - beast.x) <= range && Math.abs((pl.y + 42) - beast.y) < vertical;
  assert.equal(beastCanStrikePlayer({ x: 200, y: 590 }, { x: 250, y: 548 }), true);
  assert.equal(beastCanStrikePlayer({ x: 200, y: 590 }, { x: 250, y: 330 }), false);
  assert.equal(beastCanStrikePlayer({ x: 200, y: 590 }, { x: 400, y: 548 }), false);
});

test("softlock markers and PR #10 / #19 / #22 locks stay put", () => {
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);
  assert.match(game, /const atHeartAltar=\(x:number\)=>Math\.abs\(x-MAP6_HEART_X\)<ALTAR_INTERACT_RANGE/);
  assert.match(game, /const PLAYER_EDGE_MARGIN = 28/);
  assert.match(game, /if\(ally\.y>ally\.groundY\+28\)ally\.y=ally\.groundY/);
  assert.match(game, /if\(jackal\.y>jackal\.groundY\+28\)jackal\.y=jackal\.groundY/);
  assert.match(game, /if\(pl\.y>WORLD_H\+80\)\{pl\.x=Math\.max\(120,pl\.x-180\);pl\.y=240/);
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
  assert.equal((game.match(/firstTalk:\[/g) || []).length, 36);
  assert.equal((game.match(/againTalk:\[/g) || []).length, 36);
  assert.equal((game.match(/afterCaptureTalk:\[/g) || []).length, 36);
});
