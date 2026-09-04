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

const SCENERY_PROP_XS = [380,760,1110,1490,1810,2190,2570,2940,3310,3710,4100,4510,4780,4980,5150,5420,5580,5860,6040,6280,6460,6640,6820,6980];
const CARD_FLOOR_INSET = 22;
const CARD_WALL_CLEAR = 28;

const PH = 92;
const PW = 46;

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

const maps = {
  1: { w: 7200, plats: extractPlatforms("map1Platforms") },
  2: { w: 5400, plats: extractPlatforms("map2Platforms") },
  3: { w: 5800, plats: extractPlatforms("map3Platforms") },
  4: { w: 6000, plats: extractPlatforms("map4Platforms") },
  5: { w: 6200, plats: extractPlatforms("map5Platforms") },
  6: { w: 6600, plats: extractPlatforms("map6Platforms") },
};

const num = (pattern, label) => {
  const match = game.match(pattern);
  assert.ok(match, label);
  return Number(match[1]);
};

test("heart altar is on solid ground, inside the player clamp, and E starts the ending", () => {
  const heartX = num(/const MAP6_HEART_X = (\d+)/, "MAP6_HEART_X");
  const altarX = num(/const MAP6_ALTAR_X = MAP6_HEART_X\+(\d+)/, "MAP6_ALTAR_X offset") + heartX;
  const range = num(/const ALTAR_INTERACT_RANGE = (\d+)/, "ALTAR_INTERACT_RANGE");
  const margin = num(/const PLAYER_EDGE_MARGIN = (\d+)/, "PLAYER_EDGE_MARGIN");
  const map = maps[6];
  const maxX = map.w - margin;

  assert.equal(heartX, 6470);
  assert.equal(altarX, 6510);
  assert.ok(range >= 180, "altar interact range should cover the glowing heart");
  assert.notEqual(surfaceAt(map.plats, heartX), null, "heart marker needs road");
  assert.notEqual(surfaceAt(map.plats, altarX), null, "visual altar needs road");
  assert.ok(altarX <= maxX, "player clamp must still reach the visual altar");
  assert.ok(Math.abs(maxX - heartX) < range, "standing at the east rim must still press E");
  assert.ok(Math.abs(altarX - heartX) < range, "glowing heart stays inside the E radius");
  assert.match(game, /const atHeartAltar=\(x:number\)=>Math\.abs\(x-MAP6_HEART_X\)<ALTAR_INTERACT_RANGE/);
  assert.match(game, /else if\(map===6&&atHeartAltar\(x\)\)\{/);
  assert.match(game, /if\(!campaignEndedRef\.current\)\{campaignEndedRef\.current=true;setCampaignEnded\(true\);\}/);
  assert.match(game, /showDialogue\(ENDING_LINES\)/);
  assert.match(game, /Press E at Ashfall's Heart/);
  assert.match(game, /createBeast\("heart-wyrm",2480,1880,3180/);
});

test("card floors plant onto solid ground and stay inside the map for E pickup", () => {
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);
  assert.match(game, /const seatDeadBeast=\(beast:\{x:number;groundY:number;vx:number\},map:MapId\)=>\{/);
  assert.match(game, /const floor=plantedFloorAt\(map,beast\.x\);\n  beast\.x=floor\.x;beast\.groundY=floor\.groundY;beast\.vx=0;/);
  assert.match(game, /seatDeadBeast\(dragon,1\)/);
  assert.match(game, /seatDeadBeast\(jackal,mapRef\.current\)/);
  assert.match(game, /seatDeadBeast\(prey,map\)/);
  assert.match(game, /const floor=plantedFloorAt\(1,dragon\.x\);drawMagicalAnimalCard\("Baby Dragon",floor\.x,floor\.groundY/);
  assert.match(game, /const floor=plantedFloorAt\(2,jackal\.x\);drawMagicalAnimalCard\("Sunset Jackal",floor\.x,floor\.groundY/);
  assert.match(game, /const floor=plantedFloorAt\(6,wyrm\.x\);drawMagicalAnimalCard\("Heart Wyrm",floor\.x,floor\.groundY/);
  assert.match(game, /const floor=plantedFloorAt\(mapRef\.current,beast\.x\);drawMagicalAnimalCard\(card\.name,floor\.x,floor\.groundY/);
  assert.match(game, /const dragonFloor=plantedFloorAt\(1,dragon\.x\)/);
  assert.match(game, /const floor=plantedFloorAt\(2,jackal\.x\)/);
  assert.match(game, /const floor=plantedFloorAt\(map,beast\.x\)/);
  assert.match(game, /Math\.abs\(pl\.x-dragonFloor\.x\)<105&&Math\.abs\(\(pl\.y\+PH\)-dragonFloor\.groundY\)<85/);
  assert.match(game, /Math\.abs\(pl\.x-floor\.x\)<115&&Math\.abs\(\(pl\.y\+PH\)-floor\.groundY\)<95/);

  const cardDrops = [
    { map: 1, xs: [1710, 1100, 5920, 1475, 1990] },
    { map: 2, xs: [980, 720, 1280, 1880, 1580, 2280, 2860, 2520, 3320, 48, 5352] },
    { map: 3, xs: [920, 620, 1480, 2480, 2100, 3300] },
    { map: 4, xs: [1760, 1180, 2680] },
    { map: 5, xs: [1280, 980, 1680, 2140, 1960, 2480, 4520, 4160, 4980] },
    { map: 6, xs: [2480, 1880, 3180, 1520, 3540] },
  ];
  for (const drop of cardDrops) {
    const map = maps[drop.map];
    for (const x of drop.xs) {
      const floor = plantedFloorAt(map.plats, map.w, x, drop.map);
      assert.notEqual(floor.groundY, null, `map ${drop.map} card x=${x} must plant`);
      assert.ok(floor.x >= 48 && floor.x <= map.w - 48, `map ${drop.map} card x=${x} stays in bounds`);
      assert.notEqual(surfaceAt(map.plats, floor.x), null, `map ${drop.map} planted card x=${floor.x} needs road`);
      assert.ok(Math.abs(floor.x - x) < 400 || surfaceAt(map.plats, x) == null, `map ${drop.map} plant should stay near the fall`);
      assert.equal(cardBlockedAt(map.plats, drop.map, floor.x), false, `map ${drop.map} planted card x=${floor.x} stays off walls and perch lips`);
      assert.equal(standingInsideStone(map.plats, floor.x, floor.groundY), false, `map ${drop.map} planted card x=${floor.x} clears thin stones`);
    }
  }

  const wallPlant = plantedFloorAt(maps[6].plats, maps[6].w, 2390, 6);
  assert.ok(Math.abs(wallPlant.x - 2390) >= 26, "heart-column drops slide off the wall");
  assert.equal(cardBlockedAt(maps[6].plats, 6, wallPlant.x), false, "nudged heart-column card is pickable");
  const perchPlant = plantedFloorAt(maps[6].plats, maps[6].w, 2680, 6);
  assert.notEqual(surfaceAt(maps[6].plats, perchPlant.x), null, "perch deaths still plant on the road");
  assert.ok(perchPlant.groundY > 80, "perch deaths do not stay on the thin ledge");
  assert.match(game, /drawCardPressE\(x,riseY\+cardH\/2\*scale\+6\)/);
  assert.match(game, /strokeText\("PRESS E",x,y\)/);
  assert.match(game, /promptAt=\{x:dragonFloor\.x,y:dragonFloor\.groundY\}/);
  assert.match(game, /className=\{"interaction"\+\(promptAnchor\?" near-card":""\)\}/);

  const voidPlant = plantedFloorAt(maps[6].plats, maps[6].w, 8000, 6);
  assert.ok(voidPlant.x <= maps[6].w - 48, "past-edge drops pull back onto the road");
  assert.notEqual(surfaceAt(maps[6].plats, voidPlant.x), null, "past-edge drops still land on ground");
});

test("companions and wild beasts clamp to PLAYER_EDGE_MARGIN and reseat with surfaceYAt", () => {
  assert.match(game, /const creatureEdgeAt=\(map:MapId,x:number\)=>clamp\(x,PLAYER_EDGE_MARGIN,worldWidthFor\(map\)-PLAYER_EDGE_MARGIN\)/);
  assert.match(game, /const keepCreatureOnRoad=\(creature:\{x:number;y:number;groundY:number\},map:MapId\)=>\{/);
  assert.match(game, /creature\.x=creatureEdgeAt\(map,creature\.x\)/);
  assert.match(game, /const ground=surfaceYAt\(map,creature\.x,creature\.groundY\)\?\?surfaceYAt\(map,creature\.x,590\)/);
  assert.match(game, /if\(creature\.y>ground\+28\)creature\.y=ground/);
  assert.match(game, /keepCreatureOnRoad\(ally,map\)/);
  assert.match(game, /keepCreatureOnRoad\(jackal,mapRef\.current\)/);
  assert.match(game, /keepCreatureOnRoad\(dragon,1\)/);
  assert.match(game, /ally\.x=creatureEdgeAt\(map,pl\.x-pl\.facing\*96\)/);
  assert.match(game, /ally\.x=creatureEdgeAt\(map,ally\.x\)/);
  assert.match(game, /const summonX=creatureEdgeAt\(map,pl\.x\+pl\.facing\*COMPANION_DEPLOY_DISTANCE\)/);
  assert.match(game, /if\(ally\.y>ally\.groundY\+28\)ally\.y=ally\.groundY/);
  assert.match(game, /if\(jackal\.y>jackal\.groundY\+28\)jackal\.y=jackal\.groundY/);

  const margin = num(/const PLAYER_EDGE_MARGIN = (\d+)/, "PLAYER_EDGE_MARGIN");
  const creatureEdgeAt = (width, x) => Math.max(margin, Math.min(width - margin, x));
  assert.equal(creatureEdgeAt(6600, -40), 28);
  assert.equal(creatureEdgeAt(6600, 8000), 6572);
  assert.equal(creatureEdgeAt(6600, 3300), 3300);
  const edge = creatureEdgeAt(maps[6].w, 0);
  assert.notEqual(surfaceAt(maps[6].plats, edge), null, "clamped west companion still has road");
  const east = creatureEdgeAt(maps[6].w, 9999);
  assert.notEqual(surfaceAt(maps[6].plats, east), null, "clamped east companion still has road");
});

test("map 6 keeps a mid-road pulse cue after the wyrm on the altar road", () => {
  const pulseX = num(/const MAP6_PULSE_X = (\d+)/, "MAP6_PULSE_X");
  const heartX = num(/const MAP6_HEART_X = (\d+)/, "MAP6_HEART_X");
  const veinX = num(/const MAP6_VEIN_X = (\d+)/, "MAP6_VEIN_X");
  const map = maps[6];
  assert.equal(pulseX, 4400);
  assert.ok(pulseX > 3180 && pulseX < veinX, "pulse sits between wyrm road and the cooled vein");
  assert.ok(pulseX < heartX, "pulse is west of the altar");
  assert.notEqual(surfaceAt(map.plats, pulseX), null, "pulse stands on the heart road");
  assert.match(game, /const drawHeartRoadPulse=\(now:number\)=>\{/);
  assert.match(game, /drawHeartRoadPulse\(now\)/);
  assert.match(game, /const bound=otherWildCollected\.has\(HEART_WYRM_CARD\.id\)/);
  assert.match(game, /ctx\.fillText\(bound\?"ALTAR EAST":"PULSE",x,groundY-28\)/);
  assert.match(game, /Press E at Ashfall's Heart/);
  assert.match(game, /const atHeartAltar=\(x:number\)=>Math\.abs\(x-MAP6_HEART_X\)<ALTAR_INTERACT_RANGE/);
});

test("east/west edges stay walkable and the camera can look a little past the rim", () => {
  const margin = num(/const PLAYER_EDGE_MARGIN = (\d+)/, "PLAYER_EDGE_MARGIN");
  const pad = num(/const CAM_EDGE_PAD = (\d+)/, "CAM_EDGE_PAD");
  assert.ok(margin >= 24, "player must stay inside the world");
  assert.ok(pad >= 120, "camera needs edge pad on the wider maps");
  assert.match(game, /const cameraXFor=\(playerX:number,worldW:number,viewW:number\)=>clamp\(playerX-viewW\*\.38,-CAM_EDGE_PAD,Math\.max\(0,worldW-viewW\)\+CAM_EDGE_PAD\)/);
  assert.match(game, /const cameraTarget=cameraXFor\(pl\.x,activeWorldW,viewW\)/);
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);

  for (const [id, map] of Object.entries(maps)) {
    const west = margin;
    const east = map.w - margin;
    assert.notEqual(surfaceAt(map.plats, west), null, `map ${id} west clamp stands on road`);
    assert.notEqual(surfaceAt(map.plats, east), null, `map ${id} east clamp stands on road`);
    assert.notEqual(surfaceAt(map.plats, 24), null, `map ${id} far-west still has ground`);
    assert.notEqual(surfaceAt(map.plats, map.w - 24), null, `map ${id} far-east still has ground`);
  }
});

test("late HUD copy clarifies the finish without adding systems", () => {
  assert.match(game, /const lateObjectiveFor=\(map:MapId,held:string\[\],ended:boolean\)=>\{/);
  assert.match(game, /if\(ended\) return "The echo is still\. Ashfall keeps its heart\."/);
  assert.match(game, /if\(map===6&&held\.includes\(HEART_WYRM_CARD\.id\)\) return "Press E at the heart altar to end the campaign\."/);
  assert.match(game, /if\(map===5&&held\.includes\(EMBER_LYNX_CARD\.id\)\) return "Take the healing east gate to Ashfall's Heart\."/);
  assert.match(game, /setObjective\(hudLockFor\(map,inventoryRef\.current\.map\(item=>item\.id\),campaignEndedRef\.current\)\.objective\)/);
  assert.match(campaign, /press E at the altar to end the campaign/);
});

test("locks hold: Moon Night, plantedYAt, PR #10 numbers, no dating, no maps 7+", () => {
  assert.match(game, /PLAYER_NAME = "Moon Night"/);
  assert.match(campaign, /PLAYER_DISPLAY_NAME = "Moon Night"/);
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);
  assert.match(game, /const COMPANION_HUNT_RANGE = 520/);
  assert.match(game, /const COMPANION_STRIKE_RANGE = 132/);
  assert.match(game, /const COMPANION_STRIKE_DAMAGE = 5/);
  assert.match(game, /const COMPANION_STRIKE_RECOVERY = 840/);
  assert.match(game, /const COMBAT_ONLY_AGGRO_RANGE = 220/);
  assert.match(game, /const EXTRA_CHASE_LEEWAY = 360/);
  assert.match(game, /if\(hunting&&hunted\)\{ally\.targetX=hunted\.x;ally\.attackUntil=now\+1600;\}/);
  assert.doesNotMatch(game, /Moon Knight|bondMeter|dating sim|affectionMeter|romanceChoice|MAP7_/);
  assert.doesNotMatch(game, /radio encounter|tune the radio|drawPixelHouse|drawCastleKeep/i);
  assert.doesNotMatch(game, /map:\s*7|Map 7/);
  assert.equal((game.match(/firstTalk:\[/g) || []).length, 37);
  assert.equal((game.match(/againTalk:\[/g) || []).length, 37);
  assert.equal((game.match(/afterCaptureTalk:\[/g) || []).length, 37);
});
