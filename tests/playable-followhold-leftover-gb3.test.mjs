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

const num = (pattern, label) => {
  const match = game.match(pattern);
  assert.ok(match, label);
  return Number(match[1]);
};

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const easeInOut = (t) => t * t * (3 - 2 * t);
const PH = 92;
const PW = 46;
const STEP_HEIGHT = 32;
const ROAD_STEP_HEIGHT = 56;
const PLAYER_EDGE_MARGIN = 28;
const CARD_FLOOR_INSET = 22;
const CARD_WALL_CLEAR = 28;
const COMPANION_TELEPORT_DISTANCE = 720;
const COMPANION_HUNT_RANGE = 520;
const COMPANION_STRIKE_RANGE = 132;
const SCENERY_PROP_XS = [380,760,1110,1490,1810,2190,2570,2940,3310,3710,4100,4510,4780,4980,5150,5420,5580,5860,6040,6280,6460,6640,6820,6980];
const maps = {
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

const hopArc = (t, height) => {
  const u = clamp(t, 0, 1), peak = 0.36;
  const shaped = u < peak ? easeInOut(u / peak) : 1 - easeInOut((u - peak) / (1 - peak));
  return shaped * height;
};
const groundBeastHop = (beast, now) => {
  if (now >= beast.leapUntil || beast.id.startsWith("heart-wyrm") || beast.id.startsWith("ash-roost")) return 0;
  if (beast.mode !== "walk" && beast.mode !== "run" && beast.mode !== "idle") return 0;
  const span = beast.leapUntil - beast.leapStarted;
  const hopT = span > 0 ? clamp((now - beast.leapStarted) / span, 0, 1) : 0;
  return hopArc(hopT, 52);
};

const followHoldAt = (plats, width, playerX, facing, mapId) => {
  const followX = creatureEdgeAt(width, playerX - facing * 104);
  const followHold = plantedFloorAt(plats, width, followX, mapId);
  const ally = { x: creatureEdgeAt(width, followHold.x), groundY: followHold.groundY, y: followHold.groundY };
  keepCreatureOnRoad(ally, plats, width, mapId);
  if (ally.y > ally.groundY) ally.y = ally.groundY;
  return { ally, followX, holdFollowX: ally.x };
};

const idleSeatAt = (plats, width, x, mapId) => {
  const idleSeat = plantedFloorAt(plats, width, x, mapId);
  const ally = { x: creatureEdgeAt(width, idleSeat.x), groundY: idleSeat.groundY, y: idleSeat.groundY };
  keepCreatureOnRoad(ally, plats, width, mapId);
  if (ally.y > ally.groundY) ally.y = ally.groundY;
  return ally;
};

const huntTeleportAt = (plats, width, playerX, facing, huntedX, mapId) => {
  const followX = creatureEdgeAt(width, playerX - facing * 104);
  const followHold = null;
  const holdFollowX = followX;
  const targetX = huntedX;
  const seat = followHold ?? plantedFloorAt(plats, width, followX, mapId);
  const ally = { x: creatureEdgeAt(width, seat.x), groundY: seat.groundY, y: seat.groundY };
  keepCreatureOnRoad(ally, plats, width, mapId);
  if (ally.y > ally.groundY) ally.y = ally.groundY;
  return { ally, followX, holdFollowX, targetX };
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

const canStrike = (allyX, huntedX) => Math.abs(huntedX - allyX) < COMPANION_STRIKE_RANGE;

const closeStones = [
  { map: 2, x: 1680, y: 498, w: 150, road: 538, gap: 40, label: "shore 1680" },
  { map: 4, x: 5200, y: 500, w: 140, road: 545, gap: 45, label: "cliff 5200" },
  { map: 4, x: 5460, y: 500, w: 140, road: 555, gap: 55, label: "cliff 5460" },
  { map: 6, x: 5780, y: 490, w: 150, road: 545, gap: 55, label: "heart 5780" },
  { map: 6, x: 6080, y: 490, w: 150, road: 545, gap: 55, label: "heart 6080" },
  { map: 6, x: 6160, y: 490, w: 150, road: 545, gap: 55, label: "heart 6160" },
];

test("followHold leftover smoke: hunt path still uses hunted.x; teleport/idle still plant", () => {
  assert.match(game, /const followHold=!hunting\?plantedFloorAt\(map,followX\):null; \/\/ leftover follow still plants after #72 road-step; close leftover stones stay off allies; leftover still plants after followHold; hunt path still uses hunted\.x/);
  assert.match(game, /const holdFollowX=followHold\?creatureEdgeAt\(map,followHold\.x\):followX/);
  assert.match(game, /const stayForHunt=hunted&&Math\.abs\(pl\.x-hunted\.x\)<COMPANION_HUNT_RANGE\+140&&Math\.abs\(ally\.x-hunted\.x\)<COMPANION_TELEPORT_DISTANCE/);
  assert.match(game, /const seat=followHold\?\?plantedFloorAt\(map,followX\); \/\/ leftover teleport still plants after followHold; hunt path still uses hunted\.x/);
  assert.match(game, /const arrivalX=creatureEdgeAt\(map,seat\.x\)/);
  assert.match(game, /const arrivalGround=seat\.groundY/);
  assert.match(game, /const targetX=hunting\?hunted!\.x:holdFollowX; \/\/ hunt path still uses hunted\.x; leftover follow uses holdFollowX/);
  assert.match(game, /if\(hunting&&hunted\)\{ally\.targetX=hunted\.x;ally\.attackUntil=now\+1600;\}/);
  assert.match(game, /const idleSeat=!hunting\?plantedFloorAt\(map,ally\.x\):null; \/\/ leftover idle still plants after #72 road-step; close leftover stones stay STEP-only; leftover idle still plants after followHold/);
  assert.match(game, /if\(idleSeat\)\{ally\.x=creatureEdgeAt\(map,idleSeat\.x\);ally\.groundY=idleSeat\.groundY;\}/);
  assert.match(game, /ally\.y\+=\(ally\.groundY-leftover-ally\.y\)\*\(1-Math\.exp\(-12\*dt\)\); \/\/ hop\/roost leftover still eases through idle after sleep→wake and portal reseat; leftover still plants after #72 road-step; leftover still plants after followHold/);
  assert.doesNotMatch(game, /const targetX=hunting\?holdFollowX/);
  assert.doesNotMatch(game, /const stayForHunt=hunted&&Math\.abs\(pl\.x-holdFollowX\)/);
  assert.doesNotMatch(game, /const seat=!hunting\?plantedFloorAt\(map,followX\):null/);
  assert.match(art, /Keep the heat local to coals, kiln mouths, and lynx-eye accents/);
  assert.match(art, /Keep the heart's glow local; do not wash the whole chamber in magenta/);

  const stayForHunt = (plX, allyX, huntedX) =>
    Math.abs(plX - huntedX) < COMPANION_HUNT_RANGE + 140 && Math.abs(allyX - huntedX) < COMPANION_TELEPORT_DISTANCE;
  const shouldTeleport = (plX, allyX, huntedX) =>
    Math.abs(plX - allyX) > COMPANION_TELEPORT_DISTANCE && !stayForHunt(plX, allyX, huntedX);

  assert.equal(shouldTeleport(2680, 2680 - 800, 2680), true, "ally stuck west of a perch still teleports into the hunt");
  assert.equal(shouldTeleport(2680, 2600, 2680), false, "ally already on the hunt leash does not teleport");
  assert.equal(shouldTeleport(400, 1300, 1800), true, "far follow without a nearby hunt still teleports");
  assert.equal(shouldTeleport(2140, 2140 - 900, 4520), true, "map 5 kiln-road ally stuck off the lynx still teleports");
  assert.equal(shouldTeleport(2480, 2480 - 860, 4400), true, "map 6 heart-road ally stuck off the pulse still teleports");

  for (const stone of closeStones) {
    const map = maps[stone.map];
    const mid = stone.x + stone.w / 2;
    assert.equal(surfaceAt(map.plats, mid), stone.road, `${stone.label} still sits over leftover road ${stone.road}`);
    assert.ok(stone.gap > STEP_HEIGHT && stone.gap <= ROAD_STEP_HEIGHT, `${stone.label} stays STEP-only leftover`);
    assert.equal(standingInsideStone(map.plats, mid, stone.road), true, `${stone.label} mid overlaps the leftover stone`);

    const idle = idleSeatAt(map.plats, map.w, mid, stone.map);
    assertPlanted(stone.map, idle, `${stone.label} idleSeat`);
    assert.notEqual(idle.x, mid, `${stone.label} idle still plants off the leftover stone`);

    for (const facing of [1, -1]) {
      const hold = followHoldAt(map.plats, map.w, mid, facing, stone.map);
      assertPlanted(stone.map, hold.ally, `${stone.label} followHold facing ${facing}`);

      const playerX = mid + facing * 104;
      const hunt = huntTeleportAt(map.plats, map.w, playerX, facing, mid, stone.map);
      assert.equal(hunt.targetX, mid, `${stone.label} hunt path still uses hunted.x, not holdFollowX`);
      assert.equal(hunt.holdFollowX, hunt.followX, `${stone.label} hunt does not plant holdFollowX onto leftover follow`);
      assert.ok(Math.abs(hunt.followX - mid) < 8, `${stone.label} hunt followX lands on the leftover stone mid`);
      assertPlanted(stone.map, hunt.ally, `${stone.label} hunt teleport facing ${facing}`);
      assert.notEqual(hunt.ally.x, hunt.followX, `${stone.label} hunt teleport still plants off the leftover stone`);
    }
  }
});

test("late studyable PRESS E + portal cream leftover still match #52/#61/#68 after followHold", () => {
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
  assert.match(game, /ctx\.fillStyle="#fff6d2";ctx\.fillText\(bound\?"ALTAR EAST":"PULSE",x,groundY-28\); \/\/ echo\/vein\/step\/pulse keep #48\/#50\/#58 cream \+ late stroke; pulse stays scenery, no invented PRESS E/);
  assert.match(game, /ctx\.fillStyle="#fff6d2";ctx\.fillText\(label,cx,groundY-188\); \/\/ early-map west\/east tags keep cream fill after #48\/#50 late stroke; maps 2–4 leftover cream still matches #52\/#61\/#66 late portal tags; leftover still matches #52\/#61\/#68 after followHold/);
  assert.match(game, /ctx\.strokeText\("PRESS E",cx,groundY-174\); \/\/ maps 5–6 entry\/exit keep #52 cream fill \+ late stroke with nearPortalAt; maps 2–4 leftover PRESS E keeps the same cream; leftover still matches #52\/#61\/#68 after followHold/);
  assert.match(game, /ctx\.fillStyle="#fff6d2";ctx\.fillText\("PRESS E",cx,groundY-174\)/);
  assert.match(game, /const PORTAL_PROMPT_RANGE = 145/);
  assert.match(game, /const nearPortalAt = \(x:number, portalX:number\) => Math\.abs\(x-\(portalX\+55\)\)<PORTAL_PROMPT_RANGE/);
  assert.doesNotMatch(game, /ctx\.fillStyle=late\?"#fff6d2":"rgba\("\+portalColor\+","\+tagPulse\+"\)"/);
  assert.doesNotMatch(game, /ctx\.fillStyle=near\|\|late\?"#fff6d2"/);

  const lateStroke = (late) => ({
    width: late ? 4 : 3,
    style: late ? "rgba(6,2,4,.96)" : "rgba(7,3,16,.9)",
    fill: "#fff6d2",
  });
  assert.deepEqual(lateStroke(true), { width: 4, style: "rgba(6,2,4,.96)", fill: "#fff6d2" });
  assert.deepEqual(lateStroke(false), { width: 3, style: "rgba(7,3,16,.9)", fill: "#fff6d2" });

  const vein = plantedFloorAt(maps[6].plats, maps[6].w, 5620, 6);
  const echo = plantedFloorAt(maps[6].plats, maps[6].w, 5920, 6);
  const step = plantedFloorAt(maps[6].plats, maps[6].w, 1980, 6);
  const pulse = plantedFloorAt(maps[6].plats, maps[6].w, 4400, 6);
  for (const [label, floor] of [["VEIN", vein], ["ECHO", echo], ["STEP", step], ["PULSE", pulse]]) {
    assert.notEqual(surfaceAt(maps[6].plats, floor.x), null, `${label} stand stays on the heart road`);
    assert.equal(standingInsideStone(maps[6].plats, floor.x, floor.groundY), false, `${label} plant is not inside a leftover stone`);
    assert.ok(floor.groundY >= 545, `${label} reads from the road, not a perch`);
  }

  const nearPortalAt = (x, portalX) => Math.abs(x - (portalX + 55)) < 145;
  const portals = [
    { map: 2, x: 105, label: "WEST · RAIN" },
    { map: 2, x: 5270, label: "EAST · HOLLOW" },
    { map: 4, x: 105, label: "WEST · HOLLOW" },
    { map: 4, x: 5870, label: "EAST · EMBER" },
    { map: 5, x: 105, label: "WEST · CLIFFS" },
    { map: 5, x: 6070, label: "EAST · HEART" },
    { map: 6, x: 105, label: "WEST · EMBER" },
  ];
  for (const portal of portals) {
    const map = maps[portal.map];
    const cx = portal.x + 55;
    assert.match(game, new RegExp(portal.label.replace(/[·]/g, "·")));
    assert.notEqual(surfaceAt(map.plats, cx), null, `map ${portal.map} ${portal.label} stands on the road`);
    assert.equal(nearPortalAt(cx, portal.x), true);
    assert.equal(nearPortalAt(cx - 144, portal.x), true);
    assert.equal(nearPortalAt(cx + 144, portal.x), true);
    assert.equal(nearPortalAt(cx - 145, portal.x), false);
  }
});

test("fox/stag/lynx/wyrm keepCreatureOnRoad + late HUNT strokes still hold after followHold", () => {
  assert.match(game, /const keepCreatureOnRoad=\(creature:\{x:number;y:number;groundY:number\},map:MapId\)=>\{/);
  assert.match(game, /if\(creature\.y>ground\)creature\.y=ground; \/\/ hop\/gait leftover still holds after #61\/#66; do not flatten fox\/stag\/lynx air; leftover still holds after followHold/);
  assert.match(game, /if\(creature\.y>floor\.groundY\)creature\.y=floor\.groundY; \/\/ hop\/gait leftover still holds after #61\/#66; do not flatten fox\/stag\/lynx air; leftover still holds after followHold/);
  assert.match(game, /return hopArc\(hopT,52\); \/\/ fox\/stag\/lynx hop leftover still holds after #61\/#66; wyrm keeps roost\/fly; leftover still holds after followHold/);
  assert.match(game, /keepCreatureOnRoad\(jackal,mapRef\.current\)/);
  assert.match(game, /createBeast\("cinder-fox-a",920,620,1480/);
  assert.match(game, /createBeast\("pale-stag-a",1760,1180,2680/);
  assert.match(game, /createBeast\("ember-lynx-a",1280,980,1680/);
  assert.match(game, /createBeast\("heart-wyrm",2480,1880,3180/);
  assert.match(game, /ctx\.lineWidth=late\?4:3;ctx\.strokeStyle=late\?"rgba\(6,2,4,\.96\)":"rgba\(4,10,6,\.9\)";ctx\.strokeText\("HUNT",0,-10\); \/\/ leftover HUNT still readable after #70 road-step; leftover still readable after followHold/);
  assert.match(game, /ctx\.fillText\(`ALLY · \$\{companionName\}\$\{huntTag\}  \$\{Math\.ceil\(ally\.health\)\} \/ \$\{ally\.maxHealth\}`,ally\.x,barY-5\); \/\/ ALLY · HUNT leftover still keeps #58 late stroke with sword rim \/ lynx \/ wyrm health; leftover still readable after #70 road-step; leftover still readable after followHold/);
  assert.match(game, /ctx\.lineWidth=late\?4:3;ctx\.strokeStyle=late\?"rgba\(6,2,4,\.96\)":"rgba\(10,2,10,\.9\)";ctx\.strokeText\(healthLabel,wyrm\.x\+recoilX,barY-3\); \/\/ heart wyrm health keeps late stroke with HUNT; leftover still readable after #70 road-step; leftover still readable after followHold/);
  assert.match(game, /ctx\.lineWidth=late\?4:3;ctx\.strokeStyle=late\?"rgba\(6,2,4,\.96\)":"rgba\(20,8,4,\.9\)";ctx\.strokeText\(healthLabel,beast\.x\+recoilX,barY-3\); \/\/ kiln lynx health keeps late stroke with HUNT; leftover still readable after #70 road-step; leftover still readable after followHold/);
  assert.match(game, /drawHuntMark\(wyrm\.x\+recoilX,barY-28,now,currentHuntTarget\(\)===wyrm\)/);
  assert.match(game, /drawHuntMark\(beast\.x\+recoilX,barY-26,now,currentHuntTarget\(\)===beast\); \/\/ fox\/stag\/lynx keep HUNT \+ stroked hurt/);
  assert.match(game, /const COMPANION_HUNT_RANGE = 520/);
  assert.match(game, /const COMPANION_STRIKE_RANGE = 132/);
  assert.match(game, /const COMPANION_STRIKE_DAMAGE = 5/);
  assert.match(game, /const COMPANION_STRIKE_RECOVERY = 840/);
  assert.match(game, /const COMBAT_ONLY_AGGRO_RANGE = 220/);
  assert.match(game, /const EXTRA_CHASE_LEEWAY = 360/);
  assert.equal(num(/const COMPANION_HUNT_RANGE = (\d+)/, "COMPANION_HUNT_RANGE"), 520);
  assert.equal(num(/const COMPANION_STRIKE_RANGE = (\d+)/, "COMPANION_STRIKE_RANGE"), 132);
  assert.equal(num(/const COMPANION_STRIKE_DAMAGE = (\d+)/, "COMPANION_STRIKE_DAMAGE"), 5);
  assert.equal(num(/const COMPANION_STRIKE_RECOVERY = (\d+)/, "COMPANION_STRIKE_RECOVERY"), 840);
  assert.equal(canStrike(200, 200 + 120), true);
  assert.equal(canStrike(200, 200 + 140), false);

  const packs = [
    { map: 3, id: "cinder-fox-a", x: 920, hops: true },
    { map: 3, id: "cinder-fox-b", x: 2480, hops: true },
    { map: 4, id: "pale-stag-a", x: 1760, hops: true },
    { map: 4, id: "pale-stag-b", x: 5320, hops: true },
    { map: 5, id: "ember-lynx-a", x: 1280, hops: true },
    { map: 5, id: "ember-lynx-c", x: 4520, hops: true },
    { map: 6, id: "heart-wyrm", x: 2480, hops: false },
    { map: 6, id: "heart-wyrm", x: 2860, hops: false },
  ];
  for (const beast of packs) {
    const map = maps[beast.map];
    const hop = groundBeastHop({ id: beast.id, mode: "idle", leapStarted: 0, leapUntil: 560 }, 200);
    if (beast.hops) assert.ok(hop > 20, `${beast.id} hop stays readable through idle after followHold`);
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

test("locks hold: Moon Night, #19–#73 helpers, PR #10 numbers, talk tables, no dating, no maps 7+", () => {
  assert.match(game, /PLAYER_NAME = "Moon Night"/);
  assert.match(campaign, /PLAYER_DISPLAY_NAME = "Moon Night"/);
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);
  assert.match(game, /const keepCreatureOnRoad=\(creature:\{x:number;y:number;groundY:number\},map:MapId\)=>\{/);
  assert.match(game, /const companionIdleLeftover = \(ally:\{mode:DragonMode;prevMode:DragonMode;modeBlendAt:number;gait:number;groundY:number;y:number\}, groundAlly:boolean, now:number\) => \{/);
  assert.match(game, /const idleSeat=!hunting\?plantedFloorAt\(map,ally\.x\):null/);
  assert.match(game, /const followHold=!hunting\?plantedFloorAt\(map,followX\):null/);
  assert.match(game, /const holdFollowX=followHold\?creatureEdgeAt\(map,followHold\.x\):followX/);
  assert.match(game, /const ROAD_STEP_HEIGHT = 56/);
  assert.match(game, /const roadStepHold=\(grounded:boolean,oldBottom:number,ground:number\)=>/);
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
