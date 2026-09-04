import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const game = await readFile(new URL("../app/game.tsx", import.meta.url), "utf8");

test("Q-deployed companions hunt living hostiles instead of idling after a 900ms poke", () => {
  assert.match(game, /const COMPANION_HUNT_RANGE = 520/);
  assert.match(game, /const COMPANION_STRIKE_RANGE = 132/);
  assert.match(game, /const COMPANION_STRIKE_DAMAGE = 5/);
  assert.match(game, /const COMPANION_STRIKE_RECOVERY = 840/);
  assert.match(game, /const hunted=nearestHuntTarget\(ally\.x,mapHostiles,COMPANION_HUNT_RANGE\)/);
  assert.match(game, /if\(hunting&&hunted\)\{ally\.targetX=hunted\.x;ally\.attackUntil=now\+1600;\}/);
  assert.match(game, /if\(Math\.abs\(pl\.x-ally\.x\)>COMPANION_TELEPORT_DISTANCE&&!stayForHunt\)/);
  assert.match(game, /if\(hunting&&strikeDistance<COMPANION_STRIKE_RANGE\)/);
  assert.match(game, /dragon\.health=Math\.max\(0,dragon\.health-COMPANION_STRIKE_DAMAGE\)/);
  assert.match(game, /prey\.health=Math\.max\(0,prey\.health-COMPANION_STRIKE_DAMAGE\)/);
  assert.match(game, /if\(attackElapsed>COMPANION_STRIKE_RECOVERY\)/);
  assert.doesNotMatch(game, /ally\.attackUntil=now\+900/);
});

test("nearestHuntTarget picks the closest living animal, skips idle extras, and ignores the dead", () => {
  const COMBAT_ONLY_BEAST_IDS = new Set(["sunset-jackal-scout","ash-roost","cinder-fox-c","pale-stag-b","ember-lynx-d"]);
  const isCombatOnlyBeast = (id) => COMBAT_ONLY_BEAST_IDS.has(id);
  const nearestHuntTarget = (fromX, hostiles, range) => {
    let best = null, bestDist = range;
    for (const hostile of hostiles) {
      if (hostile.health <= 0) continue;
      if (hostile.id && isCombatOnlyBeast(hostile.id) && !hostile.angry) continue;
      const dist = Math.abs(hostile.x - fromX);
      if (dist <= bestDist) { best = hostile; bestDist = dist; }
    }
    return best;
  };
  assert.match(game, /if\(hostile\.health<=0\)continue;/);
  assert.match(game, /if\(hostile\.id&&isCombatOnlyBeast\(hostile\.id\)&&!hostile\.angry\)continue;/);
  assert.match(game, /if\(dist<=bestDist\)\{best=hostile;bestDist=dist;\}/);
  const pack = [
    { x: 400, health: 0, id: "sunset-jackal-a" },
    { x: 220, health: 40, id: "sunset-jackal-b" },
    { x: 90, health: 10, id: "sunset-jackal-scout", angry: false },
    { x: 800, health: 50, id: "sunset-jackal-c" },
  ];
  assert.equal(nearestHuntTarget(200, pack, 520).x, 220);
  assert.equal(nearestHuntTarget(2000, pack, 520), null);
  assert.equal(nearestHuntTarget(800, pack, 520).x, 800);
  assert.equal(nearestHuntTarget(100, pack, 520).x, 220);
  pack[2].angry = true;
  assert.equal(nearestHuntTarget(100, pack, 520).x, 90);
});

test("angry extras chase beyond their patrol box without crossing the whole map", () => {
  const EXTRA_CHASE_LEEWAY = 360;
  const chaseBounds = (angry, patrolMin, patrolMax, mapW) => angry ? { min: Math.max(48, patrolMin - EXTRA_CHASE_LEEWAY), max: Math.min(mapW - 48, patrolMax + EXTRA_CHASE_LEEWAY) } : { min: patrolMin, max: patrolMax };
  assert.match(game, /const EXTRA_CHASE_LEEWAY = 360/);
  assert.match(game, /angry\?\{min:Math\.max\(48,patrolMin-EXTRA_CHASE_LEEWAY\),max:Math\.min\(mapW-48,patrolMax\+EXTRA_CHASE_LEEWAY\)\}:\{min:patrolMin,max:patrolMax\}/);
  assert.deepEqual(chaseBounds(false, 2300, 2500, 3600), { min: 2300, max: 2500 });
  assert.deepEqual(chaseBounds(true, 2300, 2500, 3600), { min: 1940, max: 2860 });
  assert.match(game, /const move=chaseBounds\(jackal\.angry,jackal\.patrolMin,jackal\.patrolMax,worldWidthFor\(mapRef\.current\)\)/);
  assert.match(game, /isCombatOnlyBeast\(jackal\.id\)&&pl\.health>0&&playerDistance<COMBAT_ONLY_AGGRO_RANGE/);
  assert.match(game, /const COMBAT_ONLY_AGGRO_RANGE = 220/);
  assert.match(game, /createJackal\("sunset-jackal-scout",2400,2320,2480\)/);
  assert.match(game, /createBeast\("ash-roost",4380,4180,4560/);
  assert.match(game, /createBeast\("cinder-fox-c",1780,1600,1960/);
  assert.match(game, /createBeast\("pale-stag-b",3720,3480,4040/);
  assert.match(game, /createBeast\("ember-lynx-d",2620,2520,2720/);
});

test("lock holds: Moon Night, no romance, no maps 7+, extras stay combat-only", () => {
  assert.match(game, /PLAYER_NAME = "Moon Night"/);
  assert.doesNotMatch(game, /Moon Knight|bondMeter|dating sim|map:\s*7|MAP7_/);
  assert.match(game, /COMBAT_ONLY_BEAST_IDS = new Set\(\["sunset-jackal-scout","ash-roost","cinder-fox-c","pale-stag-b","ember-lynx-d"\]\)/);
  assert.match(game, /!isCombatOnlyBeast\(beast\.id\)/);
  assert.doesNotMatch(game, /sunset-jackal-card-d/);
  assert.match(game, /The signal is not a road\. It is the animals/);
});

test("active companions survive map portals without stale draw state", () => {
  assert.match(game, /if\(ally\.active&&ally\.itemId\)\{/);
  assert.match(game, /ally\.attackUntil=0;ally\.attackLanded=false;ally\.recallStarted=0;ally\.targetX=ally\.x/);
  assert.match(game, /if\(!ally\?\.active\|\|!ally\.itemId\|\|ally\.map!==mapRef\.current\)return/);
  assert.match(game, /const frame=frames\[index\]\?\?DRAGON_FRAMES\.idle\[0\]/);
  assert.match(game, /if\(!ally\?\.active\|\|!ally\.itemId\)return/);
  assert.match(game, /pl\.health=pl\.maxHealth;staminaRef\.current=MAX_STAMINA/);
});
