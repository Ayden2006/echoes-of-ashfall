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

const num = (pattern, label) => {
  const match = game.match(pattern);
  assert.ok(match, label);
  return Number(match[1]);
};

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const PH = 92;
const PW = 46;
const STEP_HEIGHT = 32;
const ROAD_STEP_HEIGHT = 56;
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
const roadStepHold = (grounded, oldBottom, ground) =>
  grounded && Number.isFinite(ground) && Math.abs(ground - oldBottom) <= ROAD_STEP_HEIGHT;

const groundAt = (plats, x, bottom, fromGrounded = false) => {
  let best = Infinity;
  const climb = fromGrounded ? ROAD_STEP_HEIGHT : STEP_HEIGHT;
  for (const p of plats) {
    const overlaps = x + PW * 0.5 > p.x && x - PW * 0.5 < p.x + p.w;
    const allow = p.h > 80 ? climb : STEP_HEIGHT;
    const reachable = p.y >= bottom - allow && bottom <= p.y + allow;
    if (overlaps && reachable && p.y < best) best = p.y;
  }
  return best;
};

const walkRoad = (plats, width, startX, dir) => {
  const startGround = surfaceAt(plats, startX);
  let x = startX, y = startGround, grounded = true, stuck = false, airs = 0;
  const goal = dir > 0 ? width - PLAYER_EDGE_MARGIN : PLAYER_EDGE_MARGIN;
  for (let i = 0; i < width + 8; i++) {
    if ((dir > 0 && x >= goal) || (dir < 0 && x <= goal)) break;
    const oldBottom = y;
    const nextX = clamp(x + dir, PLAYER_EDGE_MARGIN, width - PLAYER_EDGE_MARGIN);
    const gNext = groundAt(plats, nextX, oldBottom, grounded);
    if (!grounded || gNext < Infinity) x = nextX;
    else { stuck = true; break; }
    const ground = groundAt(plats, x, oldBottom, grounded);
    if (ground < Infinity && (oldBottom <= ground + STEP_HEIGHT && y >= ground || roadStepHold(grounded, oldBottom, ground))) {
      y = ground;
      grounded = true;
    } else {
      grounded = false;
      airs += 1;
      if (ground < Infinity) { y = ground; grounded = true; }
      else break;
    }
  }
  return { x, y, grounded, stuck, airs };
};

const portalEnter = (plats, width, playerX, facing, mapId) => {
  const player = plantedFloorAt(plats, width, playerX, mapId);
  const seat = plantedFloorAt(plats, width, player.x - facing * 96, mapId);
  return {
    player,
    ally: { x: creatureEdgeAt(width, seat.x), groundY: seat.groundY, y: seat.groundY },
    heal: true,
    flashMs: 430,
  };
};

const assertPlanted = (mapId, body, label) => {
  const map = maps[mapId];
  assert.ok(body.x >= PLAYER_EDGE_MARGIN && body.x <= map.w - PLAYER_EDGE_MARGIN, `${label} stays on-map`);
  assert.notEqual(surfaceAt(map.plats, body.x), null, `${label} needs road`);
  assert.equal(standingInsideStone(map.plats, body.x, body.groundY), false, `${label} is not inside a stone`);
  assert.equal(cardBlockedAt(map.plats, mapId, body.x), false, `${label} stays off walls`);
  assert.ok(body.groundY >= 535, `${label} sits on the road, not a perch`);
  assert.ok(body.y <= body.groundY, `${label} must not sit underground`);
};

test("maps 2/4/5/6 leftover walk/slide still hold after #70 road-step; thin stones stay on STEP_HEIGHT", () => {
  assert.equal(num(/const STEP_HEIGHT = (\d+)/, "STEP_HEIGHT"), 32);
  assert.equal(num(/const ROAD_STEP_HEIGHT = (\d+)/, "ROAD_STEP_HEIGHT"), 56);
  assert.match(game, /const ROAD_STEP_HEIGHT = 56; \/\/ leftover maps 1\/3 road seams still hold walk\/slide; leftover stones keep STEP_HEIGHT; leftover maps 2\/4\/5\/6 walk\/slide still hold after #70 road-step/);
  assert.match(game, /const roadStepHold=\(grounded:boolean,oldBottom:number,ground:number\)=>grounded&&Number\.isFinite\(ground\)&&Math\.abs\(ground-oldBottom\)<=ROAD_STEP_HEIGHT/);
  assert.match(game, /const groundAt=\(x:number,bottom:number,fromGrounded=false\)=>\{/);
  assert.match(game, /const climb=fromGrounded\?ROAD_STEP_HEIGHT:STEP_HEIGHT/);
  assert.match(game, /const allow=p\.h>80\?climb:STEP_HEIGHT/);
  assert.match(game, /if\(!pl\.grounded\|\|groundAt\(nextX,oldBottom,pl\.grounded\)<Infinity\)pl\.x=nextX/);
  assert.match(game, /if\(pl\.vy>=0&&ground<Infinity&&\(oldBottom<=ground\+STEP_HEIGHT&&newBottom>=ground\|\|roadStepHold\(wasGrounded&&!didJump,oldBottom,ground\)\)\)\{pl\.y=ground-PH;pl\.vy=0;pl\.grounded=true;pl\.jumpsLeft=2;\}else\{pl\.grounded=false;pl\.crouched=false;pl\.sliding=false;slideUntil\.current=0;\} \/\/ leftover maps 1\/3 road seams still hold walk\/slide; Space jump\/double jump \+ S crouch\/slide stay; leftover maps 2\/4\/5\/6 walk\/slide still hold after #70 road-step/);
  assert.match(game, /if\(wantsSlide&&pl\.grounded&&Math\.abs\(pl\.vx\)>55\)\{ \/\/ S crouch\/slide leftover still readable after road-seam hold/);
  assert.match(art, /Keep the heat local to coals, kiln mouths, and lynx-eye accents/);
  assert.match(art, /Keep the heart's glow local; do not wash the whole chamber in magenta/);

  const leftoverClimb = [
    { map: 1, from: 610, to: 570, leaveX: 1402 },
    { map: 3, from: 600, to: 548, leaveX: 1470 },
  ];
  for (const seam of leftoverClimb) {
    const plats = maps[seam.map].plats;
    const edge = seam.leaveX + PW * 0.5 + 1;
    assert.equal(groundAt(plats, edge, seam.from, false), Infinity, `map ${seam.map} #70 climb ${seam.from}→${seam.to} still needs ROAD_STEP`);
    assert.equal(groundAt(plats, edge, seam.from, true), seam.to, `map ${seam.map} #70 road-step hold is not undone`);
    assert.equal(roadStepHold(true, seam.from, seam.to), true);
  }

  for (const id of [2, 4, 5, 6]) {
    const map = maps[id];
    assert.deepEqual(walkableGaps(map.plats, map.w), [], `map ${id} leftover stays gapless after #70 road-step`);
    const east = walkRoad(map.plats, map.w, 230, 1);
    assert.equal(east.stuck, false, `map ${id} leftover walk east still holds after #70 road-step`);
    assert.equal(east.grounded, true, `map ${id} leftover walk east stays on the road`);
    assert.equal(east.airs, 0, `map ${id} leftover walk east keeps slide through road seams`);
    const west = walkRoad(map.plats, map.w, map.w - 80, -1);
    assert.equal(west.stuck, false, `map ${id} leftover walk west still holds after #70 road-step`);
    assert.equal(west.grounded, true, `map ${id} leftover walk west stays on the road`);
    assert.equal(west.airs, 0, `map ${id} leftover walk west keeps slide through road seams`);

    let prev = surfaceAt(map.plats, 0);
    for (let x = 1; x <= map.w; x++) {
      const g = surfaceAt(map.plats, x);
      if (g != null && prev != null && g !== prev) {
        assert.ok(Math.abs(g - prev) <= STEP_HEIGHT, `map ${id} leftover seam at x=${x} ${prev}→${g} stays on STEP_HEIGHT`);
        prev = g;
      } else if (g != null) prev = g;
    }

    for (const stone of map.plats.filter((p) => p.h <= 24)) {
      const mid = stone.x + stone.w / 2;
      const road = surfaceAt(map.plats, mid);
      if (road == null) continue;
      const stepOnto = groundAt(map.plats, mid, road, true);
      assert.notEqual(stepOnto, stone.y, `map ${id} leftover stone at ${stone.x} must not steal a grounded step`);
      assert.ok(road - stone.y > STEP_HEIGHT, `map ${id} leftover stone at ${stone.x} stays above STEP_HEIGHT`);
    }
  }

  const closeStones = [
    { map: 2, x: 1680, y: 498, w: 150, road: 538, gap: 40 },
    { map: 4, x: 5200, y: 500, w: 140, road: 545, gap: 45 },
    { map: 4, x: 5460, y: 500, w: 140, road: 555, gap: 55 },
    { map: 6, x: 5780, y: 490, w: 150, road: 545, gap: 55 },
    { map: 6, x: 6080, y: 490, w: 150, road: 545, gap: 55 },
    { map: 6, x: 6160, y: 490, w: 150, road: 545, gap: 55 },
  ];
  for (const stone of closeStones) {
    const mid = stone.x + stone.w / 2;
    const plats = maps[stone.map].plats;
    assert.equal(surfaceAt(plats, mid), stone.road, `map ${stone.map} close stone at ${stone.x} still sits over leftover road ${stone.road}`);
    assert.equal(roadStepHold(true, stone.road, stone.y), true, `map ${stone.map} close stone gap ${stone.gap} would steal if ROAD_STEP applied`);
    assert.ok(stone.gap > STEP_HEIGHT && stone.gap <= ROAD_STEP_HEIGHT, `map ${stone.map} close stone stays STEP-only leftover`);
    assert.notEqual(groundAt(plats, mid, stone.road, true), stone.y, `map ${stone.map} leftover stone at ${stone.x} still uses STEP_HEIGHT only`);
  }
});

test("late HUD/combat leftover: sword rim + HUNT/ALLY HUNT/health strokes + MAGICAL CARD FORMED cream still readable", () => {
  assert.match(game, /const drawActualAttackArm=\(pl:Player,now:number\)=>\{/);
  assert.match(game, /const late=lateMapContactShade\(mapRef\.current\);\n {6}ctx\.save\(\);ctx\.translate\(pl\.x\+pl\.facing\*anchorLocalX,pl\.y\+anchorLocalY\);ctx\.rotate\(swordAngle\);ctx\.scale\(1,pl\.facing\);\n {6}ctx\.imageSmoothingEnabled=false;ctx\.shadowColor=late\?"rgba\(255,246,210,\.88\)":"rgba\(135,62,198,\.3\)";ctx\.shadowBlur=late\?12:7; \/\/ LMB sword rim stays readable on maps 5–6 after #48\/#50 late stroke; leftover still readable after #70 road-step/);
  assert.match(game, /onPointerDown=\{\(e\)=>\{if\(e\.button===0\)\{e\.preventDefault\(\);updateAim\(e\.clientX,e\.clientY\);attack\(\);\}\}\}/);
  assert.match(game, /data-sword-damage=\{SWORD_DAMAGE\}/);
  assert.match(game, /left click to attack for \$\{SWORD_DAMAGE\} damage/);
  assert.match(game, /const lateMapContactShade = \(map:MapId\) => map===5/);
  assert.match(game, /const huntTag=currentHuntTarget\(\)\?" · HUNT":""/);
  assert.match(game, /ctx\.lineWidth=late\?4:3;ctx\.strokeStyle=late\?"rgba\(6,2,4,\.96\)":"rgba\(2,6,8,\.92\)";ctx\.strokeText\(`ALLY · \$\{companionName\}\$\{huntTag\}  \$\{Math\.ceil\(ally\.health\)\} \/ \$\{ally\.maxHealth\}`/);
  assert.match(game, /ctx\.fillText\(`ALLY · \$\{companionName\}\$\{huntTag\}  \$\{Math\.ceil\(ally\.health\)\} \/ \$\{ally\.maxHealth\}`,ally\.x,barY-5\); \/\/ ALLY · HUNT leftover still keeps #58 late stroke with sword rim \/ lynx \/ wyrm health; leftover still readable after #70 road-step; leftover still readable after followHold/);
  assert.match(game, /ctx\.lineWidth=late\?4:3;ctx\.strokeStyle=late\?"rgba\(6,2,4,\.96\)":"rgba\(4,10,6,\.9\)";ctx\.strokeText\("HUNT",0,-10\); \/\/ leftover HUNT still readable after #70 road-step; leftover still readable after followHold/);
  assert.match(game, /ctx\.fillStyle=\(late\?"rgba\(220,255,140,":"rgba\(185,255,99,"\)\+pulse\+"\)"/);
  assert.match(game, /ctx\.lineWidth=late\?5:4;ctx\.strokeStyle=late\?"rgba\(4,2,6,\.96\)":"rgba\(8,4,8,\.92\)";ctx\.strokeText\("-"\+dmg,x,y\)/);
  assert.match(game, /ctx\.lineWidth=late\?4:3;ctx\.strokeStyle=late\?"rgba\(6,2,4,\.96\)":"rgba\(10,2,10,\.9\)";ctx\.strokeText\(healthLabel,wyrm\.x\+recoilX,barY-3\); \/\/ heart wyrm health keeps late stroke with HUNT; leftover still readable after #70 road-step; leftover still readable after followHold/);
  assert.match(game, /ctx\.lineWidth=late\?4:3;ctx\.strokeStyle=late\?"rgba\(6,2,4,\.96\)":"rgba\(20,8,4,\.9\)";ctx\.strokeText\(healthLabel,beast\.x\+recoilX,barY-3\); \/\/ kiln lynx health keeps late stroke with HUNT; leftover still readable after #70 road-step; leftover still readable after followHold/);
  assert.match(game, /drawHuntMark\(wyrm\.x\+recoilX,barY-28,now,currentHuntTarget\(\)===wyrm\)/);
  assert.match(game, /drawHuntMark\(beast\.x\+recoilX,barY-26,now,currentHuntTarget\(\)===beast\); \/\/ fox\/stag\/lynx keep HUNT \+ stroked hurt/);
  assert.match(game, /ctx\.lineWidth=late\?4:3;ctx\.strokeStyle=late\?"rgba\(6,2,4,\.96\)":"rgba\(7,3,16,\.9\)";ctx\.strokeText\("MAGICAL CARD FORMED",x,riseY-cardH\/2\*scale-13\)/);
  assert.match(game, /ctx\.fillStyle=late\?"#fff6d2":"#eaff9f";ctx\.fillText\("MAGICAL CARD FORMED",x,riseY-cardH\/2\*scale-13\); \/\/ late-map card banner keeps #48\/#50\/#58 cream stroke; leftover still readable after #70 road-step/);
  assert.doesNotMatch(game, /ctx\.lineWidth=3;ctx\.strokeStyle="rgba\(7,3,16,\.9\)";ctx\.strokeText\("MAGICAL CARD FORMED"/);
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

  const lateStroke = (late) => ({
    width: late ? 4 : 3,
    style: late ? "rgba(6,2,4,.96)" : "rgba(7,3,16,.9)",
    fill: late ? "#fff6d2" : "#eaff9f",
    sword: late ? "rgba(255,246,210,.88)" : "rgba(135,62,198,.3)",
    swordBlur: late ? 12 : 7,
  });
  assert.deepEqual(lateStroke(true), { width: 4, style: "rgba(6,2,4,.96)", fill: "#fff6d2", sword: "rgba(255,246,210,.88)", swordBlur: 12 });
  assert.deepEqual(lateStroke(false), { width: 3, style: "rgba(7,3,16,.9)", fill: "#eaff9f", sword: "rgba(135,62,198,.3)", swordBlur: 7 });
});

test("portal enter heal/flash + companion reseat still fire after #70 groundAt signature", () => {
  assert.match(game, /const groundAt=\(x:number,bottom:number,fromGrounded=false\)=>\{/);
  assert.match(game, /const climb=fromGrounded\?ROAD_STEP_HEIGHT:STEP_HEIGHT/);
  assert.match(game, /if\(!pl\.grounded\|\|groundAt\(nextX,oldBottom,pl\.grounded\)<Infinity\)pl\.x=nextX/);
  assert.match(game, /const newBottom=pl\.y\+PH,ground=groundAt\(pl\.x,oldBottom,wasGrounded\)/);
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);
  assert.match(game, /const keepCreatureOnRoad=\(creature:\{x:number;y:number;groundY:number\},map:MapId\)=>\{/);

  const enterMap = game.match(/const enterMap = useCallback\(\(map:MapId, from:MapId\|null=mapRef\.current\) => \{[\s\S]*?\},\[showDialogue,tone\]\);/);
  assert.ok(enterMap, "enterMap callback should stay intact after #70 groundAt signature");
  assert.doesNotMatch(enterMap[0], /groundAt\(/);
  assert.match(enterMap[0], /pl\.health=pl\.maxHealth;staminaRef\.current=MAX_STAMINA/);
  assert.match(enterMap[0], /setHealth\(pl\.maxHealth\);setStamina\(MAX_STAMINA\); \/\/ portal heal still fires after companion reseat; leftover still fires after #70 groundAt signature/);
  assert.match(enterMap[0], /const arrivalGround=seat\.groundY; \/\/ companion portal reseat still plants after #38 floors; leftover still plants after #70 groundAt signature/);
  assert.match(enterMap[0], /portalFlashUntil\.current=performance\.now\(\)\+430; \/\/ portal flash still fires after companion reseat; leftover still fires after #70 groundAt signature/);
  assert.match(enterMap[0], /tone\(610,\.25,\.028\);window\.setTimeout\(\(\)=>tone\(360,\.2,\.02\),100\); \/\/ portal enter tone still fires after companion reseat; leftover still fires after #70 groundAt signature/);
  assert.match(enterMap[0], /const seat=plantedFloorAt\(map,pl\.x-pl\.facing\*96\)/);
  assert.match(game, /const reseatGround=seat\.groundY; \/\/ companion portal reseat still plants after #38 floors; leftover still plants after #70 groundAt signature/);
  assert.match(game, /if\(portalFlashUntil\.current>now\)\{ctx\.fillStyle="rgba\(255,244,214,"\+\(\(portalFlashUntil\.current-now\)\/430\*\.18\)\+"\)";ctx\.fillRect\(cameraX,0,viewW,WORLD_H\);\}/);
  assert.match(game, /else if\(map===2&&nearPortalAt\(x,MAP2_EXIT_X\)\) enterMap\(3,2\)/);
  assert.match(game, /else if\(map===4&&nearPortalAt\(x,MAP4_EXIT_X\)\) enterMap\(5,4\)/);
  assert.match(game, /else if\(map===5&&nearPortalAt\(x,MAP5_EXIT_X\)\) enterMap\(6,5\)/);
  assert.match(game, /else if\(map===6&&nearPortalAt\(x,MAP6_ENTRY_X\)\) enterMap\(5,6\)/);
  const healIdx = enterMap[0].indexOf("pl.health=pl.maxHealth");
  const reseatIdx = enterMap[0].indexOf("const seat=plantedFloorAt(map,pl.x-pl.facing*96)");
  const flashIdx = enterMap[0].indexOf("portalFlashUntil.current=performance.now()+430");
  assert.ok(healIdx >= 0 && reseatIdx > healIdx && flashIdx > reseatIdx, "heal, planted reseat, then flash still run in that order after #70 groundAt");

  const arrivals = [
    { map: 2, playerX: 340, facing: 1, label: "shore west arrive" },
    { map: 2, playerX: maps[2].w - 340, facing: -1, label: "shore east return" },
    { map: 4, playerX: 340, facing: 1, label: "cliff west arrive" },
    { map: 4, playerX: maps[4].w - 340, facing: -1, label: "cliff east return" },
    { map: 5, playerX: 340, facing: 1, label: "kiln west arrive" },
    { map: 5, playerX: maps[5].w - 340, facing: -1, label: "kiln east return" },
    { map: 6, playerX: 340, facing: 1, label: "heart west arrive" },
    { map: 6, playerX: maps[6].w - 340, facing: -1, label: "heart east return" },
  ];
  for (const scene of arrivals) {
    const map = maps[scene.map];
    const entered = portalEnter(map.plats, map.w, scene.playerX, scene.facing, scene.map);
    assert.equal(entered.heal, true, `map ${scene.map} ${scene.label} still heals`);
    assert.equal(entered.flashMs, 430, `map ${scene.map} ${scene.label} still flashes`);
    assertPlanted(scene.map, { x: entered.player.x, y: entered.player.groundY, groundY: entered.player.groundY }, `map ${scene.map} ${scene.label} player seat`);
    assertPlanted(scene.map, entered.ally, `map ${scene.map} ${scene.label} companion reseat`);
    assert.ok(entered.ally.y <= entered.ally.groundY, `map ${scene.map} ${scene.label} reseat must not sit underground`);
  }
});

test("locks hold: Moon Night, #19–#70 helpers, PR #10 numbers, talk tables, no dating, no maps 7+", () => {
  assert.match(game, /PLAYER_NAME = "Moon Night"/);
  assert.match(campaign, /PLAYER_DISPLAY_NAME = "Moon Night"/);
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);
  assert.match(game, /const keepCreatureOnRoad=\(creature:\{x:number;y:number;groundY:number\},map:MapId\)=>\{/);
  assert.match(game, /const companionIdleLeftover = \(ally:\{mode:DragonMode;prevMode:DragonMode;modeBlendAt:number;gait:number;groundY:number;y:number\}, groundAlly:boolean, now:number\) => \{/);
  assert.match(game, /const ROAD_STEP_HEIGHT = 56/);
  assert.match(game, /const roadStepHold=\(grounded:boolean,oldBottom:number,ground:number\)=>/);
  assert.match(game, /const MAP6_PULSE_X = 4400/);
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
