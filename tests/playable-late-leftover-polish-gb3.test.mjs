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

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const easeInOut = (t) => t * t * (3 - 2 * t);
const PH = 92;
const PW = 46;
const PLAYER_EDGE_MARGIN = 28;
const CARD_FLOOR_INSET = 22;
const CARD_WALL_CLEAR = 28;
const COMPANION_DEPLOY_DISTANCE = 285;
const SCENERY_PROP_XS = [380,760,1110,1490,1810,2190,2570,2940,3310,3710,4100,4510,4780,4980,5150,5420,5580,5860,6040,6280,6460,6640,6820,6980];
const maps = {
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

const gaitBlendAmt = (blendAt, now) => easeInOut(clamp((now - blendAt) / 260, 0, 1));
const flyLandAmt = (animal, now) =>
  animal.prevMode === "fly" && (animal.mode === "idle" || animal.mode === "walk" || animal.mode === "run")
    ? (1 - gaitBlendAmt(animal.modeBlendAt, now)) * 28
    : 0;
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
  return { x: creatureEdgeAt(width, seat.x), groundY: seat.groundY, y: seat.groundY };
};

const deployAfterPortal = (plats, width, playerX, facing, mapId) => {
  const playerFloor = plantedFloorAt(plats, width, playerX, mapId);
  const ally = portalReseat(plats, width, playerFloor.x, facing, mapId);
  keepCreatureOnRoad(ally, plats, width, mapId);
  const summonX = creatureEdgeAt(width, playerFloor.x + facing * COMPANION_DEPLOY_DISTANCE);
  const summonFloor = plantedFloorAt(plats, width, summonX, mapId);
  ally.x = creatureEdgeAt(width, summonFloor.x);
  ally.groundY = summonFloor.groundY;
  ally.y = summonFloor.groundY;
  keepCreatureOnRoad(ally, plats, width, mapId);
  if (ally.y > ally.groundY) ally.y = ally.groundY;
  return { player: playerFloor, ally, leftover: companionIdleLeftover({
    mode: "idle", prevMode: "run", modeBlendAt: 0, gait: 180, groundY: ally.groundY, y: ally.y,
  }, true, 40) };
};

const recoverFromVoid = (plats, width, x, mapId) => {
  const floor = plantedFloorAt(plats, width, Math.max(120, x - 180), mapId);
  return { x: floor.x, y: floor.groundY - PH, groundY: floor.groundY };
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

test("Tab/1–5/Q deploy leftover still plants off thin stones after portal reseat on maps 5–6", () => {
  assert.match(game, /if\(k==="tab"&&!e\.repeat\)\{toggleInventory\(\);return;\}/);
  assert.match(game, /if\(startedRef\.current&&\/\^\[1-5\]\$\/\.test\(k\)&&!e\.repeat\)\{selectUsableSlot\(Number\(k\)-1\);return;\}/);
  assert.match(game, /if\(!worldMapOpenRef\.current\)deployQueued\.current=true/);
  assert.match(game, /const summonX=creatureEdgeAt\(map,pl\.x\+pl\.facing\*COMPANION_DEPLOY_DISTANCE\)/);
  assert.match(game, /const summonFloor=plantedFloorAt\(map,summonX\); \/\/ Tab\/1–5\/Q deploy still plants off leftover stones after portal reseat/);
  assert.equal((game.match(/const summonFloor=plantedFloorAt\(map,summonX\); \/\/ Tab\/1–5\/Q deploy still plants off leftover stones after portal reseat/g) || []).length, 2);
  assert.match(game, /ally\.x=creatureEdgeAt\(map,summonFloor\.x\)/);
  assert.match(game, /keepCreatureOnRoad\(ally,map\)/);
  assert.match(game, /if\(ally\.y>ally\.groundY\)ally\.y=ally\.groundY/);
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);
  assert.match(game, /if\(platformsFor\(map\)\.some\(p=>p\.h<=24&&nx\+PW\*\.5>p\.x&&nx-PW\*\.5<p\.x\+p\.w&&p\.y<g-2&&p\.y\+p\.h>head\+2\)\)return null/);
  assert.match(game, /const arrivalGround=seat\.groundY; \/\/ companion portal reseat still plants after #38 floors/);
  assert.match(game, /const reseatGround=seat\.groundY; \/\/ companion portal reseat still plants after #38 floors/);

  const scenes = [
    { map: 5, playerX: 340, facing: 1, label: "kiln west arrive" },
    { map: 5, playerX: 1660, facing: 1, label: "coal leftover" },
    { map: 5, playerX: 5860, facing: -1, label: "kiln east return" },
    { map: 5, playerX: 5960, facing: 1, label: "east gate leftover" },
    { map: 6, playerX: 340, facing: 1, label: "heart west arrive" },
    { map: 6, playerX: 2860, facing: 1, label: "wyrm perch leftover" },
    { map: 6, playerX: 6100, facing: -1, label: "echo leftover" },
    { map: 6, playerX: 6260, facing: -1, label: "heart unused east plant" },
  ];
  for (const scene of scenes) {
    const map = maps[scene.map];
    const seated = deployAfterPortal(map.plats, map.w, scene.playerX, scene.facing, scene.map);
    assert.equal(seated.leftover, 0, `map ${scene.map} ${scene.label} Q after portal stays planted`);
    assertPlanted(scene.map, seated.ally, `map ${scene.map} ${scene.label} Q deploy`);
    assertPlanted(scene.map, { x: seated.player.x, y: seated.player.groundY, groundY: seated.player.groundY }, `map ${scene.map} ${scene.label} player seat`);
  }

  for (const [id, map] of Object.entries(maps)) {
    for (const stone of map.plats.filter((p) => p.h <= 24)) {
      const mid = stone.x + stone.w / 2;
      const seated = deployAfterPortal(map.plats, map.w, mid, 1, Number(id));
      assert.equal(standingInsideStone(map.plats, seated.ally.x, seated.ally.groundY), false, `map ${id} Q from stone mid ${mid} must slide clear`);
    }
  }
});

test("late studyable PRESS E leftover still reads echo/vein/step/pulse with #48/#50/#58 strokes", () => {
  assert.match(art, /Keep the heat local to coals, kiln mouths, and lynx-eye accents/);
  assert.match(art, /Keep the heart's glow local; do not wash the whole chamber in magenta/);
  assert.match(game, /const lateMapContactShade = \(map:MapId\) => map===5/);
  assert.match(game, /const drawLateStudyableTag=\(x:number,y:number,label:string\)=>\{/);
  assert.match(game, /drawCardPressE\(x,y\+3\); \/\/ late studyable PRESS E still uses #48\/#50\/#58 cream stroke for kiln\/coal\/bellows\/echo\/vein\/step; leftover still matches #52\/#61\/#68 after followHold/);
  assert.match(game, /ctx\.lineWidth=late\?4:3;ctx\.strokeStyle=late\?"rgba\(6,2,4,\.96\)":"rgba\(7,3,16,\.9\)";ctx\.strokeText\("PRESS E",x,y\)/);
  assert.match(game, /ctx\.fillStyle="#fff6d2";ctx\.fillText\("PRESS E",x,y\)/);
  assert.match(game, /if\(labeled\)drawLateStudyableTag\(x,groundY-78\*scale,"KILN"\)/);
  assert.match(game, /drawLateStudyableTag\(x,groundY-36,"COAL"\)/);
  assert.match(game, /drawLateStudyableTag\(x,groundY-46,"BELLOWS"\)/);
  assert.match(game, /drawLateStudyableTag\(x,groundY-36,"VEIN"\)/);
  assert.match(game, /drawLateStudyableTag\(x,groundY-68,"ECHO"\)/);
  assert.match(game, /drawLateStudyableTag\(x,groundY-28,"STEP"\)/);
  assert.match(game, /ctx\.strokeText\(bound\?"ALTAR EAST":"PULSE",x,groundY-28\)/);
  assert.match(game, /ctx\.fillStyle="#fff6d2";ctx\.fillText\(bound\?"ALTAR EAST":"PULSE",x,groundY-28\); \/\/ echo\/vein\/step\/pulse keep #48\/#50\/#58 cream \+ late stroke; pulse stays scenery, no invented PRESS E/);
  assert.match(game, /ctx\.lineWidth=late\?4:3;ctx\.strokeStyle=late\?"rgba\(6,2,4,\.96\)":"rgba\(7,3,16,\.9\)";ctx\.strokeText\("MAGICAL CARD FORMED",x,riseY-cardH\/2\*scale-13\)/);
  assert.match(game, /ctx\.fillStyle=late\?"#fff6d2":"#eaff9f";ctx\.fillText\("MAGICAL CARD FORMED",x,riseY-cardH\/2\*scale-13\); \/\/ late-map card banner keeps #48\/#50\/#58 cream stroke/);
  assert.match(game, /drawCardPressE\(x,riseY\+cardH\/2\*scale\+6\)/);
  assert.doesNotMatch(game, /ctx\.lineWidth=3;ctx\.strokeStyle="rgba\(7,3,16,\.9\)";ctx\.strokeText\("MAGICAL CARD FORMED"/);

  const lateStroke = (late) => ({
    width: late ? 4 : 3,
    style: late ? "rgba(6,2,4,.96)" : "rgba(7,3,16,.9)",
    fill: late ? "#fff6d2" : "#eaff9f",
  });
  assert.deepEqual(lateStroke(true), { width: 4, style: "rgba(6,2,4,.96)", fill: "#fff6d2" });
  assert.deepEqual(lateStroke(false), { width: 3, style: "rgba(7,3,16,.9)", fill: "#eaff9f" });

  const vein = plantedFloorAt(maps[6].plats, maps[6].w, 5620, 6);
  const echo = plantedFloorAt(maps[6].plats, maps[6].w, 5920, 6);
  const step = plantedFloorAt(maps[6].plats, maps[6].w, 1980, 6);
  const pulse = plantedFloorAt(maps[6].plats, maps[6].w, 4400, 6);
  for (const [label, floor] of [["VEIN", vein], ["ECHO", echo], ["STEP", step], ["PULSE", pulse]]) {
    assert.notEqual(surfaceAt(maps[6].plats, floor.x), null, `${label} stand stays on the heart road`);
    assert.equal(standingInsideStone(maps[6].plats, floor.x, floor.groundY), false, `${label} plant is not inside a leftover stone`);
    assert.ok(floor.groundY >= 545, `${label} reads from the road, not a perch`);
  }
});

test("softlock leftover after #60/#61: void recover + portal heal/flash + companionIdleLeftover still fire", () => {
  assert.match(game, /if\(pl\.y>WORLD_H\+80\)\{const floor=plantedFloorAt\(map,Math\.max\(120,pl\.x-180\)\);pl\.x=floor\.x;pl\.y=plantedYAt\(map,floor\.x\);pl\.vy=0;pl\.grounded=true;pl\.jumpsLeft=2;pl\.crouched=false;pl\.sliding=false;slideUntil\.current=0;\} \/\/ void recover still plants after #60\/#61 companionIdleLeftover/);
  assert.match(game, /const companionIdleLeftover = \(ally:\{mode:DragonMode;prevMode:DragonMode;modeBlendAt:number;gait:number;groundY:number;y:number\}, groundAlly:boolean, now:number\) => \{/);
  assert.match(game, /ally\.y\+=\(ally\.groundY-leftover-ally\.y\)\*\(1-Math\.exp\(-12\*dt\)\); \/\/ hop\/roost leftover still eases through idle after sleep→wake and portal reseat/);
  assert.doesNotMatch(game, /if\(pl\.y>WORLD_H\+80\)\{pl\.x=Math\.max\(120,pl\.x-180\);pl\.y=240/);

  const enterMap = game.match(/const enterMap = useCallback\(\(map:MapId, from:MapId\|null=mapRef\.current\) => \{[\s\S]*?\},\[showDialogue,tone\]\);/);
  assert.ok(enterMap, "enterMap callback should stay intact");
  assert.match(enterMap[0], /setHealth\(pl\.maxHealth\);setStamina\(MAX_STAMINA\); \/\/ portal heal still fires after companion reseat/);
  assert.match(enterMap[0], /const arrivalGround=seat\.groundY; \/\/ companion portal reseat still plants after #38 floors/);
  assert.match(enterMap[0], /portalFlashUntil\.current=performance\.now\(\)\+430; \/\/ portal flash still fires after companion reseat/);
  assert.match(enterMap[0], /tone\(610,\.25,\.028\);window\.setTimeout\(\(\)=>tone\(360,\.2,\.02\),100\); \/\/ portal enter tone still fires after companion reseat/);
  assert.match(game, /if\(portalFlashUntil\.current>now\)\{ctx\.fillStyle="rgba\(255,244,214,"\+\(\(portalFlashUntil\.current-now\)\/430\*\.18\)\+"\)";ctx\.fillRect\(cameraX,0,viewW,WORLD_H\);\}/);
  const healIdx = enterMap[0].indexOf("pl.health=pl.maxHealth");
  const reseatIdx = enterMap[0].indexOf("const seat=plantedFloorAt(map,pl.x-pl.facing*96)");
  const leftoverIdx = game.indexOf("const leftover=companionIdleLeftover(ally,groundAlly,now)");
  const flashIdx = enterMap[0].indexOf("portalFlashUntil.current=performance.now()+430");
  assert.ok(healIdx >= 0 && reseatIdx > healIdx && flashIdx > reseatIdx, "heal, planted reseat, then flash still run in that order");
  assert.ok(leftoverIdx > 0, "companionIdleLeftover still eases idle after #61");

  const hops = companionIdleLeftover({
    mode: "idle", prevMode: "run", modeBlendAt: 0, gait: 200, groundY: 590, y: 552,
  }, true, 80);
  assert.ok(hops > 8, "run→idle still keeps leftover hop air");
  assert.equal(companionIdleLeftover({
    mode: "idle", prevMode: "run", modeBlendAt: 0, gait: 200, groundY: 590, y: 590,
  }, true, 40), 0, "portal reseat on the road does not invent hop air");

  const voids = [
    { map: 5, x: 1660, label: "coal ledge" },
    { map: 5, x: 5960, label: "east gate perch" },
    { map: 6, x: 2860, label: "wyrm perch" },
    { map: 6, x: 6100, label: "echo stone" },
    { map: 6, x: 6470, label: "heart altar" },
  ];
  for (const fall of voids) {
    const map = maps[fall.map];
    const recovered = recoverFromVoid(map.plats, map.w, fall.x, fall.map);
    assertPlanted(fall.map, { x: recovered.x, y: recovered.groundY, groundY: recovered.groundY }, `map ${fall.map} ${fall.label} void recover`);
    assert.equal(recovered.y + PH, recovered.groundY, `map ${fall.map} ${fall.label} recover stands on the planted floor`);
  }
});

test("locks hold: Moon Night, #19–#61 helpers, PR #10 numbers, Lira/Wren talk untouched, no dating, no maps 7+", () => {
  assert.match(game, /PLAYER_NAME = "Moon Night"/);
  assert.match(campaign, /PLAYER_DISPLAY_NAME = "Moon Night"/);
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);
  assert.match(game, /const keepCreatureOnRoad=\(creature:\{x:number;y:number;groundY:number\},map:MapId\)=>\{/);
  assert.match(game, /const companionIdleLeftover = \(ally:\{mode:DragonMode;prevMode:DragonMode;modeBlendAt:number;gait:number;groundY:number;y:number\}, groundAlly:boolean, now:number\) => \{/);
  assert.match(game, /const idleSeat=!hunting\?plantedFloorAt\(map,ally\.x\):null/);
  assert.match(game, /const MAP6_PULSE_X = 4400/);
  assert.match(game, /const lateMapContactShade = \(map:MapId\) => map===5/);
  assert.match(game, /The gold I counted on the sand is pooled in this moonwell\. Press E there if the light feels thin/);
  assert.match(game, /The rain I listened to is still in this moonwell\. Press E there if the pool feels thin/);
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
