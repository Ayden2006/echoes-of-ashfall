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

const recoverFromVoid = (plats, width, x, mapId) => {
  const floor = plantedFloorAt(plats, width, Math.max(120, x - 180), mapId);
  return { x: floor.x, y: floor.groundY - PH, groundY: floor.groundY };
};

const npcs = [...game.matchAll(/\{id:"([^"]+)",name:"([^"]+)",map:(\d+),x:(\d+),talkRadius:(\d+)/g)].map((m) => ({
  id: m[1], name: m[2], map: Number(m[3]), x: Number(m[4]), r: Number(m[5]),
}));

test("altar-E marker: heart altar still wins after #56 Dell/Rowan walk-out, geometry/camera only", () => {
  const heartX = num(/const MAP6_HEART_X = (\d+)/, "MAP6_HEART_X");
  const altarX = heartX + 40;
  const range = num(/const ALTAR_INTERACT_RANGE = (\d+)/, "ALTAR_INTERACT_RANGE");
  const pad = num(/const CAM_EDGE_PAD = (\d+)/, "CAM_EDGE_PAD");
  const margin = num(/const PLAYER_EDGE_MARGIN = (\d+)/, "PLAYER_EDGE_MARGIN");
  const echoX = num(/const MAP6_ECHO_X = (\d+)/, "MAP6_ECHO_X");
  const veinX = num(/const MAP6_VEIN_X = (\d+)/, "MAP6_VEIN_X");
  const stepX = num(/const MAP6_STEP_X = (\d+)/, "MAP6_STEP_X");
  assert.equal(heartX, 6470);
  assert.equal(range, 200);
  assert.match(game, /const atHeartAltar=\(x:number\)=>Math\.abs\(x-MAP6_HEART_X\)<ALTAR_INTERACT_RANGE/);
  assert.match(game, /else if\(map===6&&atHeartAltar\(x\)\)\{ \/\/ altar E still wins after #56 Dell\/Rowan walk-out; no nearby talk radius covers this window/);
  assert.match(game, /else if\(map===6&&atHeartAltar\(pl\.x\)\)action=campaignEndedRef\.current\?"Rest at Ashfall's Heart":"Press E at Ashfall's Heart"; \/\/ altar prompt still wins after #56 Dell\/Rowan walk-out/);
  assert.match(game, /const target=talkTargetAt\(map,x,player\.current\.y\+PH\);/);
  assert.match(game, /if\(target\.npc\)\{/);
  assert.match(game, /if\(target\.landmark\)\{showDialogue\(target\.landmark\.lines\);return;\}/);

  const dell = npcs.find((n) => n.id === "dell" && n.map === 6);
  const rowan = npcs.find((n) => n.id === "rowan" && n.map === 6);
  const edan = npcs.find((n) => n.id === "edan" && n.map === 6);
  assert.ok(dell && rowan && edan, "Dell, Rowan, and Edan stay on map 6");
  assert.equal(dell.x, 4180);
  assert.equal(rowan.x, 3880);
  assert.equal(edan.x, 4900);
  assert.equal(dell.r, 150);
  assert.equal(rowan.r, 150);
  assert.equal(edan.r, 150);

  const altarLo = heartX - range, altarHi = heartX + range;
  const atHeartAltar = (x) => Math.abs(x - heartX) < range;
  const talkTargetAt = (x, footY) => {
    const npc = npcs.find((n) => n.map === 6 && Math.abs(x - n.x) < n.r) ?? null;
    const landmarks = [
      { id: "echo", x: echoX, groundY: 430, r: 120 },
      { id: "vein", x: veinX, groundY: 545, r: 140 },
      { id: "step", x: stepX, groundY: 590, r: 130 },
    ];
    const landmark = landmarks.find((mark) => Math.abs(x - mark.x) < mark.r && Math.abs(footY - mark.groundY) < 56) ?? null;
    if (npc && landmark) return Math.abs(x - landmark.x) <= Math.abs(x - npc.x) ? { npc: null, landmark } : { npc, landmark: null };
    return { npc, landmark: npc ? null : landmark };
  };

  for (const npc of npcs.filter((n) => n.map === 6)) {
    assert.ok(npc.x + npc.r < altarLo, `${npc.id} talk at ${npc.x}±${npc.r} must stay west of altar E [${altarLo},${altarHi}]`);
    assert.equal(atHeartAltar(npc.x + npc.r), false, `${npc.id} east talk rim must not sit in the altar window`);
  }
  for (const [label, x, r] of [["echo", echoX, 120], ["vein", veinX, 140], ["step", stepX, 130]]) {
    assert.ok(x + r < altarLo, `${label} study at ${x}±${r} must stay west of altar E`);
  }

  const cameraXFor = (playerX, worldW, viewW) =>
    clamp(playerX - viewW * 0.38, -pad, Math.max(0, maps[6].w - viewW) + pad);
  const finishInCameraAt = (landmarkX, playerX, worldW, viewW, inset = 36) => {
    const cam = cameraXFor(playerX, worldW, viewW);
    return landmarkX >= cam + inset && landmarkX <= cam + viewW - inset;
  };

  const rim = maps[6].w - margin;
  const recoverXs = [6470, altarX, rim, 8000].map((x) => recoverFromVoid(maps[6].plats, maps[6].w, x, 6).x);
  const stands = [heartX, altarX, rim, ...recoverXs];
  for (const x of stands) {
    const roadY = surfaceAt(maps[6].plats, x) ?? 590;
    const target = talkTargetAt(x, roadY);
    assert.equal(atHeartAltar(x), true, `E still reaches the heart from x=${x}`);
    assert.equal(target.npc, null, `no NPC steals altar E at x=${x}`);
    assert.equal(target.landmark, null, `no landmark steals altar E at x=${x}`);
    assert.notEqual(surfaceAt(maps[6].plats, x), null, `altar stand x=${x} stays on the road`);
    for (const viewW of [960, 1280, 1440]) {
      assert.equal(finishInCameraAt(heartX, x, maps[6].w, viewW), true, `heart readable at x=${x}, view ${viewW}`);
      assert.equal(finishInCameraAt(altarX, x, maps[6].w, viewW), true, `altar readable at x=${x}, view ${viewW}`);
    }
  }
});

test("combat-read marker: LMB sword + companion hunt stay readable on maps 5–6 after late strokes", () => {
  assert.match(game, /const drawActualAttackArm=\(pl:Player,now:number\)=>\{/);
  assert.match(game, /const late=lateMapContactShade\(mapRef\.current\);\n {6}ctx\.save\(\);ctx\.translate\(pl\.x\+pl\.facing\*anchorLocalX,pl\.y\+anchorLocalY\);ctx\.rotate\(swordAngle\);ctx\.scale\(1,pl\.facing\);\n {6}ctx\.imageSmoothingEnabled=false;ctx\.shadowColor=late\?"rgba\(255,246,210,\.88\)":"rgba\(135,62,198,\.3\)";ctx\.shadowBlur=late\?12:7; \/\/ LMB sword rim stays readable on maps 5–6 after #48\/#50 late stroke/);
  assert.match(game, /onPointerDown=\{\(e\)=>\{if\(e\.button===0\)\{e\.preventDefault\(\);updateAim\(e\.clientX,e\.clientY\);attack\(\);\}\}\}/);
  assert.match(game, /data-sword-damage=\{SWORD_DAMAGE\}/);
  assert.match(game, /left click to attack for \$\{SWORD_DAMAGE\} damage/);
  assert.match(game, /const lateMapContactShade = \(map:MapId\) => map===5/);
  assert.match(game, /const huntTag=currentHuntTarget\(\)\?" · HUNT":""/);
  assert.match(game, /ctx\.lineWidth=late\?4:3;ctx\.strokeStyle=late\?"rgba\(6,2,4,\.96\)":"rgba\(2,6,8,\.92\)";ctx\.strokeText\(`ALLY · \$\{companionName\}\$\{huntTag\}  \$\{Math\.ceil\(ally\.health\)\} \/ \$\{ally\.maxHealth\}`/);
  assert.match(game, /ctx\.lineWidth=late\?4:3;ctx\.strokeStyle=late\?"rgba\(6,2,4,\.96\)":"rgba\(4,10,6,\.9\)";ctx\.strokeText\("HUNT",0,-10\)/);
  assert.match(game, /ctx\.fillStyle=\(late\?"rgba\(220,255,140,":"rgba\(185,255,99,"\)\+pulse\+"\)"/);
  assert.match(game, /ctx\.lineWidth=late\?5:4;ctx\.strokeStyle=late\?"rgba\(4,2,6,\.96\)":"rgba\(8,4,8,\.92\)";ctx\.strokeText\("-"\+dmg,x,y\)/);
  assert.match(game, /ctx\.lineWidth=late\?4:3;ctx\.strokeStyle=late\?"rgba\(6,2,4,\.96\)":"rgba\(10,2,10,\.9\)";ctx\.strokeText\(healthLabel,wyrm\.x\+recoilX,barY-3\); \/\/ heart wyrm health keeps late stroke with HUNT/);
  assert.match(game, /ctx\.lineWidth=late\?4:3;ctx\.strokeStyle=late\?"rgba\(6,2,4,\.96\)":"rgba\(20,8,4,\.9\)";ctx\.strokeText\(healthLabel,beast\.x\+recoilX,barY-3\); \/\/ kiln lynx health keeps late stroke with HUNT/);
  assert.match(game, /drawHuntMark\(wyrm\.x\+recoilX,barY-28,now,currentHuntTarget\(\)===wyrm\)/);
  assert.match(game, /drawHuntMark\(beast\.x\+recoilX,barY-26,now,currentHuntTarget\(\)===beast\); \/\/ fox\/stag\/lynx keep HUNT \+ stroked hurt/);
  assert.match(game, /if\(hunting&&hunted\)\{ally\.targetX=hunted\.x;ally\.attackUntil=now\+1600;\}/);
  assert.equal(num(/const SWORD_DAMAGE = (\d+)/, "SWORD_DAMAGE"), 15);
  assert.equal(num(/const SWORD_STAMINA_COST = (\d+)/, "SWORD_STAMINA_COST"), 25);
  assert.equal(num(/const COMPANION_HUNT_RANGE = (\d+)/, "COMPANION_HUNT_RANGE"), 520);
  assert.equal(num(/const COMPANION_STRIKE_RANGE = (\d+)/, "COMPANION_STRIKE_RANGE"), 132);
  assert.equal(num(/const COMPANION_STRIKE_DAMAGE = (\d+)/, "COMPANION_STRIKE_DAMAGE"), 5);
  assert.equal(num(/const COMPANION_STRIKE_RECOVERY = (\d+)/, "COMPANION_STRIKE_RECOVERY"), 840);
  assert.equal(num(/const COMBAT_ONLY_AGGRO_RANGE = (\d+)/, "COMBAT_ONLY_AGGRO_RANGE"), 220);
  assert.equal(num(/const EXTRA_CHASE_LEEWAY = (\d+)/, "EXTRA_CHASE_LEEWAY"), 360);
  assert.doesNotMatch(game, /SWORD_DAMAGE = 1[0-46-9]|SWORD_DAMAGE = [02-9]\d/);
});

test("softlock marker: maps 5–6 planted void recover + portal heal/flash still fire", () => {
  assert.match(game, /if\(pl\.y>WORLD_H\+80\)\{const floor=plantedFloorAt\(map,Math\.max\(120,pl\.x-180\)\);pl\.x=floor\.x;pl\.y=plantedYAt\(map,floor\.x\);pl\.vy=0;pl\.grounded=true/);
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);
  assert.doesNotMatch(game, /if\(pl\.y>WORLD_H\+80\)\{pl\.x=Math\.max\(120,pl\.x-180\);pl\.y=240/);

  const enterMap = game.match(/const enterMap = useCallback\(\(map:MapId, from:MapId\|null=mapRef\.current\) => \{[\s\S]*?\},\[showDialogue,tone\]\);/);
  assert.ok(enterMap, "enterMap callback should stay intact");
  assert.match(enterMap[0], /pl\.health=pl\.maxHealth;staminaRef\.current=MAX_STAMINA/);
  assert.match(enterMap[0], /setHealth\(pl\.maxHealth\);setStamina\(MAX_STAMINA\); \/\/ portal heal still fires after companion reseat/);
  assert.match(enterMap[0], /portalFlashUntil\.current=performance\.now\(\)\+430; \/\/ portal flash still fires after companion reseat/);
  assert.match(enterMap[0], /tone\(610,\.25,\.028\);window\.setTimeout\(\(\)=>tone\(360,\.2,\.02\),100\); \/\/ portal enter tone still fires after companion reseat/);
  assert.match(enterMap[0], /const seat=plantedFloorAt\(map,pl\.x-pl\.facing\*96\)/);
  assert.match(game, /else if\(map===5&&nearPortalAt\(x,MAP5_EXIT_X\)\) enterMap\(6,5\)/);
  assert.match(game, /else if\(map===6&&nearPortalAt\(x,MAP6_ENTRY_X\)\) enterMap\(5,6\)/);
  assert.match(game, /if\(portalFlashUntil\.current>now\)\{ctx\.fillStyle="rgba\(255,244,214,"\+\(\(portalFlashUntil\.current-now\)\/430\*\.18\)\+"\)";ctx\.fillRect\(cameraX,0,viewW,WORLD_H\);\}/);
  const healIdx = enterMap[0].indexOf("pl.health=pl.maxHealth");
  const reseatIdx = enterMap[0].indexOf("const seat=plantedFloorAt(map,pl.x-pl.facing*96)");
  const flashIdx = enterMap[0].indexOf("portalFlashUntil.current=performance.now()+430");
  assert.ok(healIdx >= 0 && reseatIdx > healIdx && flashIdx > reseatIdx, "heal, planted reseat, then flash still run in that order");

  const voids = [
    { map: 5, x: 1660, label: "coal ledge" },
    { map: 5, x: 5960, label: "east gate perch" },
    { map: 5, x: 6200, label: "map 5 east rim" },
    { map: 6, x: 2860, label: "wyrm perch" },
    { map: 6, x: 6100, label: "echo stone" },
    { map: 6, x: 6470, label: "heart altar" },
    { map: 6, x: 8000, label: "past-east void" },
  ];
  for (const id of [5, 6]) {
    assert.deepEqual(walkableGaps(maps[id].plats, maps[id].w), [], `map ${id} stays gapless for void recover`);
  }
  for (const fall of voids) {
    const map = maps[fall.map];
    const recovered = recoverFromVoid(map.plats, map.w, fall.x, fall.map);
    assert.ok(recovered.x >= 48 && recovered.x <= map.w - 48, `map ${fall.map} ${fall.label} recover stays on-map`);
    assert.notEqual(surfaceAt(map.plats, recovered.x), null, `map ${fall.map} ${fall.label} recover needs road`);
    assert.equal(recovered.y + PH, recovered.groundY, `map ${fall.map} ${fall.label} recover stands on the planted floor`);
    assert.equal(standingInsideStone(map.plats, recovered.x, recovered.groundY), false, `map ${fall.map} ${fall.label} recover is not inside a stone`);
    assert.equal(cardBlockedAt(map.plats, fall.map, recovered.x), false, `map ${fall.map} ${fall.label} recover stays off walls`);
  }
});

test("locks hold: Moon Night, planted helpers, PR #10 numbers, Dell/Rowan talk tables, no dating, no maps 7+", () => {
  assert.match(game, /PLAYER_NAME = "Moon Night"/);
  assert.match(campaign, /PLAYER_DISPLAY_NAME = "Moon Night"/);
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);
  assert.match(game, /const keepCreatureOnRoad=\(creature:\{x:number;y:number;groundY:number\},map:MapId\)=>\{/);
  assert.match(game, /\{id:"dell",name:"Dell",map:6,x:4180,talkRadius:150/);
  assert.match(game, /\{id:"rowan",name:"Rowan",map:6,x:3880,talkRadius:150/);
  assert.match(game, /\{id:"edan",name:"Edan",map:6,x:4900,talkRadius:150/);
  assert.match(game, /Then we walk out as people\. The shore can go dark without taking us/);
  assert.match(game, /Then we walk out as people\. The leftover road can go quiet/);
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
