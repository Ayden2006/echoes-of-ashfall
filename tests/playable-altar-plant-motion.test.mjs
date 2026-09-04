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

const PH = 92;
const PW = 46;
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

const num = (pattern, label) => {
  const match = game.match(pattern);
  assert.ok(match, label);
  return Number(match[1]);
};

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const easeInOut = (t) => t * t * (3 - 2 * t);
const hopArc = (t, height) => {
  const u = clamp(t, 0, 1), peak = 0.36;
  const shaped = u < peak ? easeInOut(u / peak) : 1 - easeInOut((u - peak) / (1 - peak));
  return shaped * height;
};
const gaitBlendAmt = (blendAt, now) => easeInOut(clamp((now - blendAt) / 260, 0, 1));
const groundBeastHop = (beast, now) => {
  if (now >= beast.leapUntil || beast.id.startsWith("heart-wyrm") || beast.id.startsWith("ash-roost")) return 0;
  if (beast.mode !== "walk" && beast.mode !== "run" && beast.mode !== "idle") return 0;
  const span = beast.leapUntil - beast.leapStarted;
  const hopT = span > 0 ? clamp((now - beast.leapStarted) / span, 0, 1) : 0;
  return hopArc(hopT, 52);
};
const flyLandAmt = (animal, now) =>
  animal.prevMode === "fly" && (animal.mode === "idle" || animal.mode === "walk" || animal.mode === "run")
    ? (1 - gaitBlendAmt(animal.modeBlendAt, now)) * 28
    : 0;

test("map 6 pulse and heart altar stay planted, in camera, and E-reachable after #38 floors", () => {
  assert.match(game, /const atHeartAltar=\(x:number\)=>Math\.abs\(x-MAP6_HEART_X\)<ALTAR_INTERACT_RANGE/);
  assert.match(game, /const MAP6_PULSE_X = 4400/);
  assert.match(game, /const cameraXFor=\(playerX:number,worldW:number,viewW:number\)=>clamp\(playerX-viewW\*\.38,-CAM_EDGE_PAD,Math\.max\(0,worldW-viewW\)\+CAM_EDGE_PAD\)/);
  assert.match(game, /const finishInCameraAt=\(landmarkX:number,playerX:number,worldW:number,viewW:number,inset=36\)=>\{const cam=cameraXFor\(playerX,worldW,viewW\);return landmarkX>=cam\+inset&&landmarkX<=cam\+viewW-inset;\}/);
  assert.match(game, /else if\(map===6&&atHeartAltar\(x\)\)\{/);
  assert.match(game, /else if\(map===6&&atHeartAltar\(pl\.x\)\)action=campaignEndedRef\.current\?"Rest at Ashfall's Heart":"Press E at Ashfall's Heart"/);
  assert.match(game, /const idleSeat=!hunting\?plantedFloorAt\(map,ally\.x\):null/);

  const pulseX = num(/const MAP6_PULSE_X = (\d+)/, "MAP6_PULSE_X");
  const heartX = num(/const MAP6_HEART_X = (\d+)/, "MAP6_HEART_X");
  const range = num(/const ALTAR_INTERACT_RANGE = (\d+)/, "ALTAR_INTERACT_RANGE");
  const pad = num(/const CAM_EDGE_PAD = (\d+)/, "CAM_EDGE_PAD");
  const margin = num(/const PLAYER_EDGE_MARGIN = (\d+)/, "PLAYER_EDGE_MARGIN");
  const map6W = maps[6].w;
  const cameraXFor = (playerX, worldW, viewW) =>
    clamp(playerX - viewW * 0.38, -pad, Math.max(0, worldW - viewW) + pad);
  const finishInCameraAt = (landmarkX, playerX, worldW, viewW, inset = 36) => {
    const cam = cameraXFor(playerX, worldW, viewW);
    return landmarkX >= cam + inset && landmarkX <= cam + viewW - inset;
  };
  const atHeartAltar = (x) => Math.abs(x - heartX) < range;

  const pulse = plantedFloorAt(maps[6].plats, map6W, pulseX, 6);
  assert.equal(pulse.x, pulseX, "pulse cue must not slide off its road mark");
  assert.notEqual(surfaceAt(maps[6].plats, pulse.x), null);
  assert.equal(standingInsideStone(maps[6].plats, pulse.x, pulse.groundY), false);

  const heart = plantedFloorAt(maps[6].plats, map6W, heartX, 6);
  const altar = plantedFloorAt(maps[6].plats, map6W, heartX + 40, 6);
  const rim = plantedFloorAt(maps[6].plats, map6W, map6W - margin, 6);
  assert.ok(Math.abs(heart.x - heartX) < 40, "heart plant stays on the altar, not off the finish");
  assert.equal(atHeartAltar(heart.x), true, "planted heart still accepts Press E");
  assert.equal(atHeartAltar(altar.x), true, "visual altar plant still accepts Press E");
  assert.equal(atHeartAltar(rim.x), true, "east-rim plant still accepts Press E");
  assert.equal(cardBlockedAt(maps[6].plats, 6, heart.x), false);
  assert.equal(standingInsideStone(maps[6].plats, heart.x, heart.groundY), false);
  assert.equal(standingInsideStone(maps[6].plats, altar.x, altar.groundY), false);

  for (const viewW of [720, 960, 1280, 1440]) {
    assert.equal(finishInCameraAt(heartX, rim.x, map6W, viewW), true, `heart readable from planted rim, view ${viewW}`);
    assert.equal(finishInCameraAt(heartX + 40, rim.x, map6W, viewW), true, `altar readable from planted rim, view ${viewW}`);
    assert.equal(finishInCameraAt(heartX, heart.x, map6W, viewW), true, `heart readable from planted heart, view ${viewW}`);
  }
});

test("planted cards still clear thin stones and stay off walls for PRESS E", () => {
  assert.match(game, /if\(platformsFor\(map\)\.some\(p=>p\.h<=24&&nx\+PW\*\.5>p\.x&&nx-PW\*\.5<p\.x\+p\.w&&p\.y<g-2&&p\.y\+p\.h>head\+2\)\)return null/);
  assert.match(game, /const floor=plantedFloorAt\(1,dragon\.x\);drawMagicalAnimalCard\("Baby Dragon",floor\.x,floor\.groundY/);
  assert.match(game, /const floor=plantedFloorAt\(2,jackal\.x\);drawMagicalAnimalCard\("Sunset Jackal",floor\.x,floor\.groundY/);
  assert.match(game, /const floor=plantedFloorAt\(6,wyrm\.x\);drawMagicalAnimalCard\("Heart Wyrm",floor\.x,floor\.groundY/);
  assert.match(game, /const floor=plantedFloorAt\(mapRef\.current,beast\.x\);drawMagicalAnimalCard\(card\.name,floor\.x,floor\.groundY/);
  assert.match(game, /drawCardPressE\(x,riseY\+cardH\/2\*scale\+6\)/);

  const drops = [
    { map: 1, xs: [1710, 1100, 5920, 1475, 1990, 6180] },
    { map: 2, xs: [980, 720, 1280, 1880, 1580, 2280, 2860, 2520, 3320, 48, 5352] },
    { map: 3, xs: [920, 620, 1480, 2480, 2100, 3300, 1780] },
    { map: 4, xs: [1760, 1180, 2680, 5320] },
    { map: 5, xs: [1280, 980, 1680, 2140, 1960, 2480, 4520, 4160, 4980, 2620] },
    { map: 6, xs: [2480, 1880, 3180, 1520, 3540, 2390, 2680] },
  ];
  for (const drop of drops) {
    const map = maps[drop.map];
    for (const x of drop.xs) {
      const floor = plantedFloorAt(map.plats, map.w, x, drop.map);
      assert.notEqual(surfaceAt(map.plats, floor.x), null, `map ${drop.map} card x=${x} plants on road`);
      assert.equal(cardBlockedAt(map.plats, drop.map, floor.x), false, `map ${drop.map} planted x=${floor.x} stays off walls`);
      assert.equal(standingInsideStone(map.plats, floor.x, floor.groundY), false, `map ${drop.map} planted x=${floor.x} is not inside a thin stone`);
    }
  }

  for (const [id, map] of Object.entries(maps)) {
    for (const stone of map.plats.filter((p) => p.h <= 24)) {
      const mid = stone.x + stone.w / 2;
      const floor = plantedFloorAt(map.plats, map.w, mid, Number(id));
      assert.equal(standingInsideStone(map.plats, floor.x, floor.groundY), false, `map ${id} plant from stone mid ${mid} must slide clear`);
    }
  }
});

test("ground-beast hop finishes through idle and roost idle holds the walk↔fly land", () => {
  assert.match(game, /const groundBeastHop = \(beast:\{id:string;mode:DragonMode;leapStarted:number;leapUntil:number\}, now:number\)=>\{/);
  assert.match(game, /if\(beast\.mode!=="walk"&&beast\.mode!=="run"&&beast\.mode!=="idle"\)return 0/);
  assert.match(game, /const flyLandAmt = \(animal:\{mode:DragonMode;prevMode:DragonMode;modeBlendAt:number\}, now:number\)=>/);
  assert.match(game, /animal\.prevMode==="fly"&&\(animal\.mode==="idle"\|\|animal\.mode==="walk"\|\|animal\.mode==="run"\)\?\(1-gaitBlendAmt\(animal\.modeBlendAt,now\)\)\*28:0/);
  assert.match(game, /const hop=groundBeastHop\(jackal,now\)/);
  assert.match(game, /const land=flyLandAmt\(jackal,now\)/);
  assert.match(game, /const targetY=jackal\.groundY-\(flyLeap\|\|hop\|\|land\)/);
  assert.match(game, /jackal\.y\+=\(jackal\.groundY-hop-land-jackal\.y\)\*\(1-Math\.exp\(-12\*dt\)\)/);
  assert.match(game, /else if\(\(roost\.mode==="idle"\|\|poseMode==="idle"\)&&roost\.prevMode!=="sleep"\)\{/);
  assert.match(game, /const phase=elapsed%2900;index=phase<1550\?0:phase<2150\?1:phase<2500\?2:3/);
  assert.match(game, /const poseMode=locoPoseMode\(roost,now\)/);
  assert.match(game, /if\(blend<0\.58&&animal\.prevMode==="fly"&&\(animal\.mode==="idle"\|\|animal\.mode==="walk"\|\|animal\.mode==="run"\)\) return animal\.prevMode/);
  assert.doesNotMatch(game, /new AnimationSystem|skeletonRig|spineRuntime|createGaitMachine/);

  const midHop = { id: "cinder-fox-a", mode: "idle", leapStarted: 0, leapUntil: 560 };
  assert.ok(groundBeastHop(midHop, 200) > 20, "idle after a hop should keep the arc, not snap to 0");
  assert.equal(groundBeastHop({ ...midHop, mode: "sleep" }, 200), 0);
  assert.equal(groundBeastHop({ id: "ash-roost", mode: "idle", leapStarted: 0, leapUntil: 560 }, 200), 0);
  assert.equal(groundBeastHop({ ...midHop, leapUntil: 0 }, 200), 0);
  const landStart = flyLandAmt({ mode: "idle", prevMode: "fly", modeBlendAt: 0 }, 0);
  const landMid = flyLandAmt({ mode: "idle", prevMode: "fly", modeBlendAt: 0 }, 130);
  const landDone = flyLandAmt({ mode: "idle", prevMode: "fly", modeBlendAt: 0 }, 260);
  assert.ok(landStart > landMid && landMid > landDone, "roost/wyrm fly→idle should ease the last air");
  assert.equal(landDone, 0);
  assert.equal(flyLandAmt({ mode: "idle", prevMode: "walk", modeBlendAt: 0 }, 0), 0);
});

test("locks hold: Moon Night, #19–#38 helpers, PR #10 numbers, Hale talk untouched, no dating, no maps 7+", () => {
  assert.match(game, /PLAYER_NAME = "Moon Night"/);
  assert.match(campaign, /PLAYER_DISPLAY_NAME = "Moon Night"/);
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);
  assert.match(game, /const idleSeat=!hunting\?plantedFloorAt\(map,ally\.x\):null/);
  assert.match(game, /const huntSeat=hunting&&hunted&&"groundY" in hunted\?\(hunted as \{groundY:number\}\)\.groundY:playerGround/);
  assert.match(game, /const locoPoseMode = \(animal:\{mode:DragonMode;prevMode:DragonMode;modeBlendAt:number\}, now:number\)/);
  assert.match(game, /const MAP6_PULSE_X = 4400/);
  assert.match(game, /const COMPANION_HUNT_RANGE = 520/);
  assert.match(game, /const COMPANION_STRIKE_RANGE = 132/);
  assert.match(game, /const COMPANION_STRIKE_DAMAGE = 5/);
  assert.match(game, /const COMPANION_STRIKE_RECOVERY = 840/);
  assert.match(game, /const COMBAT_ONLY_AGGRO_RANGE = 220/);
  assert.match(game, /const EXTRA_CHASE_LEEWAY = 360/);
  assert.match(game, /id:"hale"/);
  assert.match(game, /The wind forgets you between watches\. I'm Hale\./);
  assert.match(game, /\{id:"hale",name:"Hale",map:5,x:4040/);
  assert.doesNotMatch(game, /Moon Knight|bondMeter|dating sim|affectionMeter|romanceChoice|MAP7_/);
  assert.doesNotMatch(game, /radio encounter|tune the radio|drawPixelHouse|drawCastleKeep/i);
  assert.doesNotMatch(game, /map:\s*7|Map 7/);
  assert.equal((game.match(/firstTalk:\[/g) || []).length, 37);
  assert.equal((game.match(/againTalk:\[/g) || []).length, 37);
  assert.equal((game.match(/afterCaptureTalk:\[/g) || []).length, 37);
});
