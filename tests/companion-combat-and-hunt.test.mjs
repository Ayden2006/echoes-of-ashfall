import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const game = await readFile(new URL("../app/game.tsx", import.meta.url), "utf8");

test("Q-deployed companions hunt living hostiles instead of idling after a 900ms poke", () => {
  assert.match(game, /const COMPANION_HUNT_RANGE = 680/);
  assert.match(game, /const COMPANION_STRIKE_RANGE = 132/);
  assert.match(game, /const COMPANION_STRIKE_DAMAGE = 8/);
  assert.match(game, /const hunted=nearestHuntTarget\(ally\.x,mapHostiles,COMPANION_HUNT_RANGE\)/);
  assert.match(game, /if\(hunting&&hunted\)\{ally\.targetX=hunted\.x;ally\.attackUntil=now\+1600;\}/);
  assert.match(game, /if\(Math\.abs\(pl\.x-ally\.x\)>COMPANION_TELEPORT_DISTANCE&&!stayForHunt\)/);
  assert.match(game, /if\(hunting&&strikeDistance<COMPANION_STRIKE_RANGE\)/);
  assert.match(game, /dragon\.health=Math\.max\(0,dragon\.health-COMPANION_STRIKE_DAMAGE\)/);
  assert.match(game, /prey\.health=Math\.max\(0,prey\.health-COMPANION_STRIKE_DAMAGE\)/);
  assert.doesNotMatch(game, /ally\.attackUntil=now\+900/);
});

test("nearestHuntTarget picks the closest living animal and ignores the dead", () => {
  const nearestHuntTarget = (fromX, hostiles, range) => {
    let best = null, bestDist = range;
    for (const hostile of hostiles) {
      if (hostile.health <= 0) continue;
      const dist = Math.abs(hostile.x - fromX);
      if (dist <= bestDist) { best = hostile; bestDist = dist; }
    }
    return best;
  };
  assert.match(game, /if\(hostile\.health<=0\)continue;/);
  assert.match(game, /if\(dist<=bestDist\)\{best=hostile;bestDist=dist;\}/);
  const pack = [
    { x: 400, health: 0 },
    { x: 220, health: 40 },
    { x: 90, health: 10 },
    { x: 800, health: 50 },
  ];
  assert.equal(nearestHuntTarget(200, pack, 680).x, 220);
  assert.equal(nearestHuntTarget(2000, pack, 680), null);
  assert.equal(nearestHuntTarget(800, pack, 680).x, 800);
});

test("angry extras chase beyond their patrol box, same as bindable animals", () => {
  const chaseBounds = (angry, patrolMin, patrolMax, mapW) => angry ? { min: 48, max: mapW - 48 } : { min: patrolMin, max: patrolMax };
  assert.match(game, /angry\?\{min:48,max:mapW-48\}:\{min:patrolMin,max:patrolMax\}/);
  assert.deepEqual(chaseBounds(false, 2300, 2500, 3600), { min: 2300, max: 2500 });
  assert.deepEqual(chaseBounds(true, 2300, 2500, 3600), { min: 48, max: 3552 });
  assert.match(game, /const move=chaseBounds\(jackal\.angry,jackal\.patrolMin,jackal\.patrolMax,worldWidthFor\(mapRef\.current\)\)/);
  assert.match(game, /isCombatOnlyBeast\(jackal\.id\)&&pl\.health>0&&playerDistance<COMBAT_ONLY_AGGRO_RANGE/);
  assert.match(game, /createJackal\("sunset-jackal-scout",2400,2080,2740\)/);
  assert.match(game, /createBeast\("ash-roost",3820,3280,4560/);
  assert.match(game, /createBeast\("cinder-fox-c",1780,1360,2280/);
  assert.match(game, /createBeast\("pale-stag-b",3600,3040,4040/);
  assert.match(game, /createBeast\("ember-lynx-d",1820,1480,2360/);
});

test("lock holds: Moon Night, no romance, no maps 7+, extras stay combat-only", () => {
  assert.match(game, /PLAYER_NAME = "Moon Night"/);
  assert.doesNotMatch(game, /Moon Knight|bondMeter|dating sim|map:\s*7|MAP7_/);
  assert.match(game, /COMBAT_ONLY_BEAST_IDS = new Set\(\["sunset-jackal-scout","ash-roost","cinder-fox-c","pale-stag-b","ember-lynx-d"\]\)/);
  assert.match(game, /!isCombatOnlyBeast\(beast\.id\)/);
  assert.doesNotMatch(game, /sunset-jackal-card-d/);
  assert.match(game, /The signal is not a road\. It is the animals/);
});
