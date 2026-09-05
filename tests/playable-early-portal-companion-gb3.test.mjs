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
const PH = 92;
const PW = 46;
const PLAYER_EDGE_MARGIN = 28;
const CARD_FLOOR_INSET = 22;
const CARD_WALL_CLEAR = 28;
const COMPANION_DEPLOY_DISTANCE = 285;
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
  if (already >= 0) return { equipped: next, selected: already, replaced: null };
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

const recoverFromVoid = (plats, width, x, mapId) => {
  const floor = plantedFloorAt(plats, width, Math.max(120, x - 180), mapId);
  return { x: floor.x, y: floor.groundY - PH, groundY: floor.groundY };
};

const qDuringRecall = (plats, width, playerX, facing, mapId) => {
  const ally = { x: playerX - 900, y: 880, groundY: 430, recallStarted: 400 };
  ally.recallStarted = 0;
  const summonX = creatureEdgeAt(width, playerX + facing * COMPANION_DEPLOY_DISTANCE);
  const summonFloor = plantedFloorAt(plats, width, summonX, mapId);
  ally.x = creatureEdgeAt(width, summonFloor.x);
  ally.groundY = summonFloor.groundY;
  ally.y = summonFloor.groundY;
  keepCreatureOnRoad(ally, plats, width, mapId);
  if (ally.y > ally.groundY) ally.y = ally.groundY;
  return ally;
};

const assertPlanted = (mapId, point, label) => {
  const map = maps[mapId];
  assert.ok(point.x >= 48 && point.x <= map.w - 48, `${label} stays on-map`);
  assert.notEqual(surfaceAt(map.plats, point.x), null, `${label} needs road`);
  assert.equal(standingInsideStone(map.plats, point.x, point.groundY), false, `${label} is not inside a stone`);
  assert.equal(cardBlockedAt(map.plats, mapId, point.x), false, `${label} stays off walls`);
  assert.ok(point.y <= point.groundY, `${label} must not sit underground`);
};

test("maps 2–4 early portal cream leftover still matches #52/#61/#66 late portal tags", () => {
  assert.match(game, /const PORTAL_PROMPT_RANGE = 145/);
  assert.match(game, /const nearPortalAt = \(x:number, portalX:number\) => Math\.abs\(x-\(portalX\+55\)\)<PORTAL_PROMPT_RANGE/);
  assert.match(game, /const lateMapContactShade = \(map:MapId\) => map===5/);
  assert.match(game, /const drawPortal=\(x:number,groundY:number,now:number,map:MapId,colorOverride\?:string,label\?:string\)=>\{/);
  assert.match(game, /ctx\.lineWidth=late\?5:4;ctx\.strokeStyle=late\?"rgba\(6,2,4,\.96\)":"rgba\(6,8,10,\.88\)";ctx\.strokeText\(label,cx,groundY-188\)/);
  assert.match(game, /ctx\.fillStyle="#fff6d2";ctx\.fillText\(label,cx,groundY-188\); \/\/ early-map west\/east tags keep cream fill after #48\/#50 late stroke; maps 2–4 leftover cream still matches #52\/#61\/#66 late portal tags; leftover still matches #52\/#61\/#68 after followHold/);
  assert.match(game, /ctx\.strokeText\("PRESS E",cx,groundY-174\); \/\/ maps 5–6 entry\/exit keep #52 cream fill \+ late stroke with nearPortalAt; maps 2–4 leftover PRESS E keeps the same cream/);
  assert.match(game, /ctx\.fillStyle="#fff6d2";ctx\.fillText\("PRESS E",cx,groundY-174\)/);
  assert.doesNotMatch(game, /ctx\.fillStyle=late\?"#fff6d2":"rgba\("\+portalColor\+","\+tagPulse\+"\)"/);
  assert.doesNotMatch(game, /ctx\.fillStyle=near\|\|late\?"#fff6d2"/);

  const labels = [
    ["WEST · RAIN", 2, 105],
    ["EAST · HOLLOW", 2, 5270],
    ["WEST · SHORE", 3, 105],
    ["EAST · CLIFFS", 3, 5670],
    ["WEST · HOLLOW", 4, 105],
    ["EAST · EMBER", 4, 5870],
    ["WEST · CLIFFS", 5, 105],
    ["EAST · HEART", 5, 6070],
    ["WEST · EMBER", 6, 105],
  ];
  const nearPortalAt = (x, portalX) => Math.abs(x - (portalX + 55)) < 145;
  for (const [label, id, x] of labels) {
    assert.match(game, new RegExp(label.replace(/[·]/g, "·")));
    const map = maps[id];
    const cx = x + 55;
    assert.notEqual(surfaceAt(map.plats, cx), null, `map ${id} ${label} stands on the road`);
    assert.equal(nearPortalAt(cx, x), true);
    assert.equal(nearPortalAt(cx - 144, x), true);
    assert.equal(nearPortalAt(cx + 144, x), true);
    assert.equal(nearPortalAt(cx - 145, x), false);
  }
  assert.match(game, /if\(map===2&&nearPortalAt\(x,MAP2_PORTAL_X\)\) enterMap\(1,2\)/);
  assert.match(game, /else if\(map===2&&nearPortalAt\(x,MAP2_EXIT_X\)\) enterMap\(3,2\)/);
  assert.match(game, /else if\(map===4&&nearPortalAt\(x,MAP4_EXIT_X\)\) enterMap\(5,4\)/);
  assert.match(game, /else if\(map===5&&nearPortalAt\(x,MAP5_EXIT_X\)\) enterMap\(6,5\)/);
});

test("Q-during-recall + inventory 1–5 leftover after #63 still plants off thin stones", () => {
  assert.match(game, /if\(startedRef\.current&&\/\^\[1-5\]\$\/\.test\(k\)&&!e\.repeat\)\{selectUsableSlot\(Number\(k\)-1\);return;\} \/\/ leftover 1–5 still selects during recall after #63/);
  assert.match(game, /if\(!worldMapOpenRef\.current\)deployQueued\.current=true/);
  assert.match(game, /const nextUsableLoadout=\(equipped:\(string\|null\)\[\],itemId:string,selected:number\)=>\{/);
  assert.match(game, /ally\.recallStarted=0;\n {14}const summonX=creatureEdgeAt\(map,pl\.x\+pl\.facing\*COMPANION_DEPLOY_DISTANCE\)/);
  assert.match(game, /const summonFloor=plantedFloorAt\(map,summonX\); \/\/ Tab\/1–5\/Q deploy still plants off leftover stones after portal reseat; Q-during-recall leftover after #63 still clears thin stones/);
  assert.match(game, /const summonFloor=plantedFloorAt\(map,summonX\); \/\/ Tab\/1–5\/Q deploy still plants off leftover stones after portal reseat; leftover 1–5\/Q after #63 still clears thin stones/);
  assert.equal((game.match(/const summonFloor=plantedFloorAt\(map,summonX\); \/\/ Tab\/1–5\/Q deploy still plants off leftover stones after portal reseat/g) || []).length, 2);
  assert.match(game, /keepCreatureOnRoad\(ally,map\)/);
  assert.match(game, /if\(ally\.y>ally\.groundY\)ally\.y=ally\.groundY/);
  assert.match(game, /if\(platformsFor\(map\)\.some\(p=>p\.h<=24&&nx\+PW\*\.5>p\.x&&nx-PW\*\.5<p\.x\+p\.w&&p\.y<g-2&&p\.y\+p\.h>head\+2\)\)return null/);

  const empty = [null, null, null, null, null];
  const afterPickup = nextUsableLoadout(empty, "sunset-jackal-card-a", 0);
  assert.equal(afterPickup.equipped[0], "sunset-jackal-card-a");
  assert.equal(afterPickup.selected, 0);
  const afterSelect = nextUsableLoadout(afterPickup.equipped, "sunset-jackal-card-a", 3);
  assert.equal(afterSelect.selected, 0, "1–5 on an already-held card focuses that slot for Q");
  const midBinds = ["sunset-jackal-card-a", "cinder-fox-card", "pale-stag-card"];
  let loadout = empty.slice();
  let selected = 0;
  for (const id of midBinds) {
    const next = nextUsableLoadout(loadout, id, selected);
    loadout = next.equipped;
    selected = next.selected;
  }
  assert.deepEqual(loadout.slice(0, 3), midBinds);
  const slotPick = nextUsableLoadout(loadout, "cinder-fox-card", 4);
  assert.equal(slotPick.selected, 1, "1–5 leftover still focuses the held fox for Q-during-recall");

  const leftoverScenes = [
    { map: 2, playerX: 1515, facing: 1, label: "dusk-shell leftover" },
    { map: 2, playerX: 5180, facing: -1, label: "tide leftover" },
    { map: 3, playerX: 1510, facing: 1, label: "foxfire leftover" },
    { map: 3, playerX: 4500, facing: -1, label: "nest leftover" },
    { map: 4, playerX: 2580, facing: 1, label: "lichen leftover" },
    { map: 4, playerX: 5320, facing: -1, label: "east-cliff leftover" },
  ];
  for (const scene of leftoverScenes) {
    const map = maps[scene.map];
    const ally = qDuringRecall(map.plats, map.w, scene.playerX, scene.facing, scene.map);
    assert.equal(ally.recallStarted, 0, `map ${scene.map} ${scene.label} Q-during-recall clears recall`);
    assertPlanted(scene.map, ally, `map ${scene.map} ${scene.label} Q-during-recall`);
  }

  for (const id of [2, 3, 4]) {
    const map = maps[id];
    for (const stone of map.plats.filter((p) => p.h <= 24)) {
      const mid = stone.x + stone.w / 2;
      for (const facing of [1, -1]) {
        const ally = qDuringRecall(map.plats, map.w, mid, facing, id);
        assert.equal(standingInsideStone(map.plats, ally.x, ally.groundY), false, `map ${id} Q-during-recall from stone mid ${mid} facing ${facing} must slide clear`);
        assert.equal(cardBlockedAt(map.plats, id, ally.x), false, `map ${id} Q-during-recall from stone mid ${mid} stays off walls`);
      }
    }
  }
});

test("campaign-loop leftover after #66: maps 1–6 void recover, portal heal/flash, altar E still fire with 6460 off heart", () => {
  assert.match(game, /if\(pl\.y>WORLD_H\+80\)\{const floor=plantedFloorAt\(map,Math\.max\(120,pl\.x-180\)\);pl\.x=floor\.x;pl\.y=plantedYAt\(map,floor\.x\);pl\.vy=0;pl\.grounded=true;pl\.jumpsLeft=2;pl\.crouched=false;pl\.sliding=false;slideUntil\.current=0;\} \/\/ void recover still plants after #60\/#61 companionIdleLeftover; maps 1–6 leftover still fire after #66 6460 vein skip/);
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);
  assert.doesNotMatch(game, /if\(pl\.y>WORLD_H\+80\)\{pl\.x=Math\.max\(120,pl\.x-180\);pl\.y=240/);
  assert.match(game, /if\(map===6&&Math\.abs\(x-MAP6_HEART_X\)<40\)continue; \/\/ leftover 6460 vein no longer sits on the heart after #64 afterCapture trim/);
  assert.match(game, /else if\(map===6&&atHeartAltar\(x\)\)\{ \/\/ altar E still wins after #56 Dell\/Rowan walk-out and #64 afterCapture trim; no nearby talk radius covers this window; leftover still fires after #66 scenery vein move/);
  assert.match(game, /else if\(map===6&&atHeartAltar\(pl\.x\)\)action=campaignEndedRef\.current\?"Rest at Ashfall's Heart":"Press E at Ashfall's Heart"; \/\/ altar prompt still wins after #56 Dell\/Rowan walk-out and #64 afterCapture trim; leftover still fires after #66 scenery vein move/);

  const enterMap = game.match(/const enterMap = useCallback\(\(map:MapId, from:MapId\|null=mapRef\.current\) => \{[\s\S]*?\},\[showDialogue,tone\]\);/);
  assert.ok(enterMap, "enterMap callback should stay intact");
  assert.match(enterMap[0], /pl\.health=pl\.maxHealth;staminaRef\.current=MAX_STAMINA/);
  assert.match(enterMap[0], /setHealth\(pl\.maxHealth\);setStamina\(MAX_STAMINA\); \/\/ portal heal still fires after companion reseat/);
  assert.match(enterMap[0], /portalFlashUntil\.current=performance\.now\(\)\+430; \/\/ portal flash still fires after companion reseat/);
  assert.match(enterMap[0], /tone\(610,\.25,\.028\);window\.setTimeout\(\(\)=>tone\(360,\.2,\.02\),100\); \/\/ portal enter tone still fires after companion reseat/);
  assert.match(enterMap[0], /const seat=plantedFloorAt\(map,pl\.x-pl\.facing\*96\)/);
  const healIdx = enterMap[0].indexOf("pl.health=pl.maxHealth");
  const reseatIdx = enterMap[0].indexOf("const seat=plantedFloorAt(map,pl.x-pl.facing*96)");
  const flashIdx = enterMap[0].indexOf("portalFlashUntil.current=performance.now()+430");
  assert.ok(healIdx >= 0 && reseatIdx > healIdx && flashIdx > reseatIdx, "heal, planted reseat, then flash still run in that order");

  const heartX = num(/const MAP6_HEART_X = (\d+)/, "MAP6_HEART_X");
  const range = num(/const ALTAR_INTERACT_RANGE = (\d+)/, "ALTAR_INTERACT_RANGE");
  const veinX = num(/const MAP6_VEIN_X = (\d+)/, "MAP6_VEIN_X");
  assert.equal(heartX, 6470);
  assert.equal(range, 200);
  assert.equal(veinX, 5620);
  const atHeartAltar = (x) => Math.abs(x - heartX) < range;
  const skipNearHeart = (x) => Math.abs(x - heartX) < 40;
  assert.equal(skipNearHeart(6460), true, "shared 6460 vein sits on the heart and must stay undrawn");
  assert.equal(skipNearHeart(6280), false, "6280 vein stays west of the altar-clear window");
  assert.ok(Math.abs(6460 - heartX) < CARD_WALL_CLEAR, "6460 is the leftover vein that sat on the heart");
  assert.ok(veinX + 140 < heartX - range, "studyable vein stays west of altar E after the scenery skip");

  const layouts = [
    { id: 1, voids: [2680, 6520, 7200] },
    { id: 2, voids: [1515, 5180, 5400] },
    { id: 3, voids: [1510, 4500, 5800] },
    { id: 4, voids: [2580, 5320, 6000] },
    { id: 5, voids: [1660, 5960, 6200] },
    { id: 6, voids: [2860, 6100, 6470, 6460, 8000] },
  ];
  for (const layout of layouts) {
    const map = maps[layout.id];
    assert.deepEqual(walkableGaps(map.plats, map.w), [], `map ${layout.id} stays gapless for leftover void recover`);
    for (const x of layout.voids) {
      const recovered = recoverFromVoid(map.plats, map.w, x, layout.id);
      assertPlanted(layout.id, recovered, `map ${layout.id} void recover x=${x}`);
      assert.equal(recovered.y + PH, recovered.groundY, `map ${layout.id} void recover x=${x} stands on the planted floor`);
    }
  }

  const altarX = heartX + 40;
  const rim = maps[6].w - PLAYER_EDGE_MARGIN;
  const recoverXs = [6470, 6460, altarX, rim, 8000].map((x) => recoverFromVoid(maps[6].plats, maps[6].w, x, 6).x);
  for (const x of [heartX, altarX, rim, ...recoverXs]) {
    assert.equal(atHeartAltar(x), true, `E still reaches the heart from x=${x} after #66 6460 skip`);
    assert.notEqual(surfaceAt(maps[6].plats, x), null, `altar stand x=${x} stays on the road`);
  }
});

test("locks hold: Moon Night, planted helpers, PR #10 numbers, talk tables, no dating, no maps 7+", () => {
  assert.match(game, /PLAYER_NAME = "Moon Night"/);
  assert.match(campaign, /PLAYER_DISPLAY_NAME = "Moon Night"/);
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);
  assert.match(game, /const keepCreatureOnRoad=\(creature:\{x:number;y:number;groundY:number\},map:MapId\)=>\{/);
  assert.match(game, /const companionIdleLeftover = \(ally:\{mode:DragonMode;prevMode:DragonMode;modeBlendAt:number;gait:number;groundY:number;y:number\}, groundAlly:boolean, now:number\) => \{/);
  assert.match(game, /const idleSeat=!hunting\?plantedFloorAt\(map,ally\.x\):null/);
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
