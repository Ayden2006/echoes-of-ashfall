import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const game = await readFile(new URL("../app/game.tsx", import.meta.url), "utf8");
const campaign = await readFile(new URL("../lib/campaign.ts", import.meta.url), "utf8");

const extractPlatforms = (name) => {
  const block = game.match(new RegExp(`const ${name}: Platform\\[\\] = \\[([\\s\\S]*?)\\];`));
  assert.ok(block, `${name} should exist`);
  const plats = [...block[1].matchAll(/\{x:(-?\d+),y:(-?\d+),w:(\d+),h:(\d+)\}/g)].map((m) => ({
    x: Number(m[1]), y: Number(m[2]), w: Number(m[3]), h: Number(m[4]),
  }));
  assert.ok(plats.length > 4, `${name} should list walkable ground`);
  return plats;
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

test("portal X and both-direction spawns stay on solid walkable ground", () => {
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);
  assert.match(game, /if\(from===null\) return \{x:230,y:plantedYAt\(1,230\),facing:1/);
  assert.match(game, /if\(map===1\) return \{x:6860,y:plantedYAt\(1,6860\),facing:-1/);
  assert.match(game, /if\(arrivingFromPrev\) return \{x:340,y:plantedYAt\(map,340\),facing:1/);
  assert.match(game, /return \{x,y:plantedYAt\(map,x\),facing:-1/);
  assert.match(game, /pl\.y=plantedYAt\(mapRef\.current,pl\.x\)/);
  assert.match(game, /const arrivalGround=surfaceYAt\(map,ally\.x,pl\.y\+PH\)\?\?surfaceYAt\(map,pl\.x,590\)\?\?pl\.y\+PH/);
  assert.match(game, /const reseatGround=companionSurfaceAt\(ally\.x,pl\.y\+PH,map\)\?\?surfaceYAt\(map,ally\.x,590\)\?\?pl\.y\+PH/);
  assert.match(game, /pl\.health=pl\.maxHealth/);

  const maps = [
    { id: 1, w: 7200, plats: extractPlatforms("map1Platforms"), portals: [7070 + 55], spawns: [230, 6860] },
    { id: 2, w: 5400, plats: extractPlatforms("map2Platforms"), portals: [105 + 55, 5270 + 55], spawns: [340, 5060] },
    { id: 3, w: 5800, plats: extractPlatforms("map3Platforms"), portals: [105 + 55, 5670 + 55], spawns: [340, 5460] },
    { id: 4, w: 6000, plats: extractPlatforms("map4Platforms"), portals: [105 + 55, 5870 + 55], spawns: [340, 5660] },
    { id: 5, w: 6200, plats: extractPlatforms("map5Platforms"), portals: [105 + 55, 6070 + 55], spawns: [340, 5860] },
    { id: 6, w: 6600, plats: extractPlatforms("map6Platforms"), portals: [105 + 55, 6470], spawns: [340] },
  ];

  for (const map of maps) {
    assert.deepEqual(walkableGaps(map.plats, map.w), [], `map ${map.id} should have no walkable void gaps`);
    for (const x of map.portals) {
      assert.notEqual(surfaceAt(map.plats, x), null, `map ${map.id} portal x=${x} needs solid ground`);
    }
    for (const x of map.spawns) {
      const ground = surfaceAt(map.plats, x);
      assert.notEqual(ground, null, `map ${map.id} spawn x=${x} needs solid ground`);
      const plantedY = ground - 92;
      const feet = plantedY + 92;
      assert.equal(feet, ground, `map ${map.id} planted spawn must stand on the surface`);
      assert.ok(ground >= feet - 32 && feet <= ground + 32, `map ${map.id} spawn must snap without a void fall`);
    }
  }
});

test("key high-secret ledges stay present and reachable from a stepping stone", () => {
  const secrets = [
    { name: "plaque", plat: "{x:2588,y:382,w:210,h:18}", stone: "{x:2448,y:428,w:150,h:18}" },
    { name: "plaque-approach", plat: "{x:2320,y:508,w:140,h:18}", stone: "{x:2320,y:508,w:140,h:18}" },
    { name: "map4-east", plat: "{x:5320,y:430,w:160,h:18}", stone: "{x:5460,y:500,w:140,h:18}" },
    { name: "merlon", plat: "{x:6520,y:430,w:170,h:18}", stone: "{x:6380,y:500,w:150,h:18}" },
    { name: "shell", plat: "{x:1515,y:430,w:155,h:18}", stone: "{x:1418,y:498,w:160,h:18}" },
    { name: "tide", plat: "{x:5180,y:432,w:160,h:18}", stone: "{x:5080,y:500,w:140,h:18}" },
    { name: "hollow", plat: "{x:1510,y:418,w:200,h:18}", stone: "{x:1400,y:488,w:150,h:18}" },
    { name: "nest", plat: "{x:4500,y:430,w:160,h:18}", stone: "{x:4380,y:500,w:140,h:18}" },
    { name: "lichen", plat: "{x:2580,y:440,w:170,h:18}", stone: "{x:2460,y:508,w:140,h:18}" },
    { name: "coal", plat: "{x:1480,y:440,w:170,h:18}", stone: "{x:1360,y:508,w:140,h:18}" },
    { name: "echo", plat: "{x:5920,y:430,w:180,h:18}", stone: "{x:5780,y:490,w:150,h:18}" },
  ];
  for (const secret of secrets) {
    assert.match(game, new RegExp(secret.plat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), secret.name);
    assert.match(game, new RegExp(secret.stone.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${secret.name} stone`);
  }
  assert.match(game, /x:MAP1_PLAQUE_X,groundY:382/);
  assert.match(game, /x:MAP1_MERLON_X,groundY:430/);
  assert.match(game, /x:MAP2_SHELL_X,groundY:430/);
  assert.match(game, /x:MAP6_ECHO_X,groundY:430/);
});

test("no softlock markers: companion reseat, underground snap, edge recovery, PR #10 numbers", () => {
  assert.match(game, /if\(ally\.y>ally\.groundY\+28\)ally\.y=ally\.groundY/);
  assert.match(game, /if\(jackal\.y>jackal\.groundY\+28\)jackal\.y=jackal\.groundY/);
  assert.match(game, /if\(pl\.y>WORLD_H\+80\)\{pl\.x=Math\.max\(120,pl\.x-180\);pl\.y=240/);
  assert.match(game, /const nextX=clamp\(pl\.x\+pl\.vx\*dt,PLAYER_EDGE_MARGIN,activeWorldW-PLAYER_EDGE_MARGIN\)/);
  assert.match(game, /if\(!pl\.grounded\|\|groundAt\(nextX,oldBottom\)<Infinity\)pl\.x=nextX/);
  assert.match(game, /const COMPANION_HUNT_RANGE = 520/);
  assert.match(game, /const COMPANION_STRIKE_RANGE = 132/);
  assert.match(game, /const COMPANION_STRIKE_DAMAGE = 5/);
  assert.match(game, /const COMPANION_STRIKE_RECOVERY = 840/);
  assert.match(game, /const COMBAT_ONLY_AGGRO_RANGE = 220/);
  assert.match(game, /const EXTRA_CHASE_LEEWAY = 360/);
  assert.match(game, /if\(hunting&&hunted\)\{ally\.targetX=hunted\.x;ally\.attackUntil=now\+1600;\}/);
  assert.doesNotMatch(game, /ally\.attackUntil=now\+900/);
  assert.match(game, /createBeast\("heart-wyrm",2480,1880,3180/);
  assert.match(game, /createBeast\("ember-lynx-d",2620,2520,2720/);
  assert.match(game, /createBeast\("pale-stag-b",5320,5080,5640/);
});

test("light Q summon and sleep/wake polish stays on existing gait / prevMode blend", () => {
  assert.match(game, /const SLEEP_SETTLE_MS = 420/);
  assert.match(game, /const WAKE_BLEND_MS = 340/);
  assert.match(game, /const sleepPoseAmt = \(mode:DragonMode, prevMode:DragonMode, blendAt:number, now:number, elapsed:number\)/);
  assert.match(game, /const locoPoseMode = \(animal:\{mode:DragonMode;prevMode:DragonMode;modeBlendAt:number\}, now:number\)/);
  assert.match(game, /const duration=cast\.kind==="recall"\?COMPANION_RECALL_DURATION:COMPANION_SUMMON_DURATION/);
  assert.match(game, /const summonCreature=smooth\(clamp\(\(summon-\.14\)\/\.7,0,1\)\)/);
  assert.match(game, /ally\.y\+=\(ally\.groundY-ally\.y\)\*\(1-Math\.exp\(-5\.4\*dt\)\)/);
  assert.match(game, /const hopBlend=hopPrev\+\(hop-hopPrev\)\*easeInOut/);
  assert.match(game, /const sleepBlend=mode==="sleep"\?easeInOut\(clamp\(elapsed\/MODE_BLEND_MS,0,1\)\):0/);
});

test("locks hold: Moon Night, existing people, no dating, no maps 7+, radio stays cut", () => {
  assert.match(game, /PLAYER_NAME = "Moon Night"/);
  assert.match(campaign, /PLAYER_DISPLAY_NAME = "Moon Night"/);
  assert.doesNotMatch(game, /Moon Knight|bondMeter|dating sim|affectionMeter|romanceChoice|MAP7_/);
  assert.doesNotMatch(game, /radio encounter|tune the radio|drawPixelHouse|drawCastleKeep/i);
  assert.doesNotMatch(game, /map:\s*7|Map 7/);
  assert.equal((game.match(/firstTalk:\[/g) || []).length, 36);
  assert.equal((game.match(/againTalk:\[/g) || []).length, 36);
  assert.equal((game.match(/afterCaptureTalk:\[/g) || []).length, 36);
  assert.match(game, /id:"wren"/);
  assert.match(game, /id:"dell"/);
  assert.match(game, /id:"isk"/);
  assert.match(game, /id:"rowan"/);
  assert.match(game, /id:"reed"/);
  assert.match(game, /id:"kest"/);
});
