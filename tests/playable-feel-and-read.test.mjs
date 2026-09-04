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

const maps = {
  5: { w: 6200, plats: extractPlatforms("map5Platforms") },
  6: { w: 6600, plats: extractPlatforms("map6Platforms") },
};

test("maps 5–6 stay fair after #24/#26/#30 stones without a physics rewrite", () => {
  assert.deepEqual(walkableGaps(maps[5].plats, maps[5].w), [], "map 5 should have no walkable void gaps");
  assert.deepEqual(walkableGaps(maps[6].plats, maps[6].w), [], "map 6 should have no walkable void gaps");

  const secrets = [
    { map: 5, x: 1480, y: 440, w: 170 },
    { map: 5, x: 5780, y: 422, w: 160 },
    { map: 6, x: 5920, y: 430, w: 180 },
  ];
  for (const secret of secrets) {
    const plats = maps[secret.map].plats;
    assert.ok(hasMidStone(plats, secret, "west"), `map ${secret.map} secret at ${secret.x} needs a west mid-stone`);
    assert.ok(hasMidStone(plats, secret, "east"), `map ${secret.map} secret at ${secret.x} needs an east mid-stone`);
    assert.notEqual(surfaceAt(plats, secret.x + secret.w / 2), null, `map ${secret.map} secret stays over road`);
  }

  assert.match(game, /\{x:1360,y:508,w:140,h:18\}/);
  assert.match(game, /\{x:1620,y:508,w:140,h:18\}/);
  assert.match(game, /\{x:5640,y:488,w:150,h:18\}/);
  assert.match(game, /\{x:5920,y:488,w:140,h:18\}/);
  assert.match(game, /\{x:5780,y:490,w:150,h:18\}/);
  assert.match(game, /\{x:6080,y:490,w:150,h:18\}/);
  assert.match(game, /if\(jump&&pl\.jumpsLeft>0\)\{\n {10}const secondJump=pl\.jumpsLeft===1;\n {10}pl\.vy=secondJump\?-465:-500/);
  assert.match(game, /if\(wasGrounded&&!didJump&&!pl\.grounded\)pl\.jumpsLeft=Math\.min\(pl\.jumpsLeft,1\)/);
  assert.match(game, /if\(pl\.y>WORLD_H\+80\)\{pl\.x=Math\.max\(120,pl\.x-180\);pl\.y=240/);
  assert.doesNotMatch(game, /coyoteTime|ledgeForgiv|tripleJump|jumpsLeft\s*=\s*3/);
});

test("roostling and jackal scout get stroked hurt and HUNT when hunted", () => {
  assert.match(game, /createJackal\("sunset-jackal-scout",2400,2320,2480\)/);
  assert.match(game, /createBeast\("ash-roost",6180,5980,6360/);
  assert.match(game, /const wildPackFor=\(map:MapId\)=>map===1\?roosts:map===2\?jackals:/);
  assert.match(game, /if\(map===1\)\{drawRoosts\(now\);return;\}/);
  assert.match(game, /if\(hurtActive\)drawHurtNumber\(jackal\.x\+recoilX,barY-16-hurtProgress\*18,jackal\.lastDamage,hurtProgress,"#ffe7a8"\)/);
  assert.match(game, /drawHuntMark\(jackal\.x\+recoilX,barY-26,now,currentHuntTarget\(\)===jackal\); \/\/ jackal scout shares stroked hurt \+ HUNT/);
  assert.match(game, /if\(hurtActive\)drawHurtNumber\(roost\.x\+recoilX,barY-16-hurtProgress\*16,roost\.lastDamage,hurtProgress,"#f4ffb0"\)/);
  assert.match(game, /drawHuntMark\(roost\.x\+recoilX,barY-26,now,currentHuntTarget\(\)===roost\); \/\/ roostling keep HUNT \+ stroked hurt/);
  assert.match(game, /ctx\.strokeText\("HUNT",0,-10\)/);
  assert.match(game, /ctx\.strokeText\("-"\+dmg,x,y\)/);
  assert.match(game, /const COMPANION_STRIKE_DAMAGE = 5/);
  assert.match(game, /const SWORD_DAMAGE = 15/);
});

test("enterMap still restores health and fires the portal flash after reseat", () => {
  const enterMap = game.match(/const enterMap = useCallback\(\(map:MapId, from:MapId\|null=mapRef\.current\) => \{[\s\S]*?\},\[showDialogue,tone\]\);/);
  assert.ok(enterMap, "enterMap callback should stay intact");
  assert.match(enterMap[0], /pl\.health=pl\.maxHealth;staminaRef\.current=MAX_STAMINA/);
  assert.match(enterMap[0], /setHealth\(pl\.maxHealth\);setStamina\(MAX_STAMINA\); \/\/ portal heal still fires after companion reseat/);
  assert.match(enterMap[0], /portalFlashUntil\.current=performance\.now\(\)\+430; \/\/ portal flash still fires after companion reseat/);
  assert.match(enterMap[0], /if\(ally\.active&&ally\.itemId\)\{/);
  assert.match(game, /if\(map===1&&nearPortalAt\(x,MAP1_PORTAL_X\)\) enterMap\(2,1\)/);
  assert.match(game, /else if\(map===5&&nearPortalAt\(x,MAP5_EXIT_X\)\) enterMap\(6,5\)/);
  assert.match(game, /else if\(map===6&&nearPortalAt\(x,MAP6_ENTRY_X\)\) enterMap\(5,6\)/);
  assert.match(game, /if\(portalFlashUntil\.current>now\)\{ctx\.fillStyle="rgba\(255,244,214,"\+\(\(portalFlashUntil\.current-now\)\/430\*\.18\)\+"\)";ctx\.fillRect\(cameraX,0,viewW,WORLD_H\);\}/);
});

test("maps 5–6 use existing pixel shade helpers for Moon Night contact shadows", () => {
  assert.match(art, /soft contact shadow so they read as planted/);
  assert.match(game, /const rgbaFromHex = \(hex:string,alpha:number\)/);
  assert.match(game, /const mixHex = \(hex:string,r:number,g:number,b:number,t:number\)/);
  assert.match(game, /const shadeLayer=document\.createElement\("canvas"\)/);
  assert.match(game, /const lateMapContactShade = \(map:MapId\) => map===5/);
  assert.match(game, /const lateShade=lateMapContactShade\(mapRef\.current\)/);
  assert.match(game, /if\(lateShade\)\{\n {10}const warm=ctx\.createRadialGradient\(1,PH\+3,1,1,PH\+3,36\)/);
  assert.doesNotMatch(game, /WebGLRenderer|THREE\.|new PerspectiveCamera|import\("three"\)/);
});

test("locks hold: Moon Night, planted helpers, PR #10 numbers, no dating, no maps 7+", () => {
  assert.match(game, /PLAYER_NAME = "Moon Night"/);
  assert.match(campaign, /PLAYER_DISPLAY_NAME = "Moon Night"/);
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);
  assert.match(game, /const keepCreatureOnRoad=\(creature:\{x:number;y:number;groundY:number\},map:MapId\)=>\{/);
  assert.match(game, /const gaitBlendAmt = \(blendAt:number, now:number\)=>easeInOut\(clamp\(\(now-blendAt\)\/MODE_BLEND_MS,0,1\)\)/);
  assert.match(game, /const locoPoseMode = \(animal:\{mode:DragonMode;prevMode:DragonMode;modeBlendAt:number\}, now:number\)/);
  assert.match(game, /const nextUsableLoadout=\(equipped:\(string\|null\)\[\],itemId:string,selected:number\)=>\{/);
  assert.match(game, /const cameraXFor=\(playerX:number,worldW:number,viewW:number\)=>clamp\(playerX-viewW\*\.38,-CAM_EDGE_PAD,Math\.max\(0,worldW-viewW\)\+CAM_EDGE_PAD\)/);
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
