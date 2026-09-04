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

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const PH = 92;
const maps = {
  1: { w: 7200, plats: extractPlatforms("map1Platforms") },
  2: { w: 5400, plats: extractPlatforms("map2Platforms") },
  3: { w: 5800, plats: extractPlatforms("map3Platforms") },
  4: { w: 6000, plats: extractPlatforms("map4Platforms") },
  5: { w: 6200, plats: extractPlatforms("map5Platforms") },
  6: { w: 6600, plats: extractPlatforms("map6Platforms") },
};

const plantedFloorAt = (plats, width, x) => {
  let px = clamp(x, 48, width - 48);
  const hit = (nx) => surfaceAt(plats, nx);
  if (hit(px) != null) return { x: px, groundY: hit(px) };
  for (let d = 8; d <= 420; d += 8) {
    if (px - d >= 48 && hit(px - d) != null) return { x: px - d, groundY: hit(px - d) };
    if (px + d <= width - 48 && hit(px + d) != null) return { x: px + d, groundY: hit(px + d) };
  }
  return { x: px, groundY: hit(px) ?? 590 };
};

const applyJump = (jumpsLeft) => {
  if (jumpsLeft <= 0) return { jumpsLeft, grounded: false, vy: 0, didJump: false };
  const secondJump = jumpsLeft === 1;
  return { jumpsLeft: jumpsLeft - 1, grounded: false, vy: secondJump ? -465 : -500, didJump: true };
};

const canStartSlide = (grounded, vx) => grounded && Math.abs(vx) > 55;

test("portal enter and companion summon/recall still use the existing tone helper", () => {
  const enterMap = game.match(/const enterMap = useCallback\(\(map:MapId, from:MapId\|null=mapRef\.current\) => \{[\s\S]*?\},\[showDialogue,tone\]\);/);
  assert.ok(enterMap, "enterMap callback should stay intact");
  assert.match(enterMap[0], /tone\(610,\.25,\.028\);window\.setTimeout\(\(\)=>tone\(360,\.2,\.02\),100\); \/\/ portal enter tone still fires after companion reseat/);
  assert.match(enterMap[0], /portalFlashUntil\.current=performance\.now\(\)\+430; \/\/ portal flash still fires after companion reseat/);

  assert.match(game, /const tone = useCallback\(\(freq:number,duration=\.12,volume=\.024\) => \{/);
  assert.match(game, /osc\.type="sine"; osc\.frequency\.setValueAtTime\(freq,audio\.currentTime\)/);
  assert.doesNotMatch(game, /webkitAudioContext|Howl\(|Tone\.js|createBufferSource/);
  assert.equal((game.match(/new AudioContext\(\)/g) || []).length, 1, "only the existing startGame AudioContext stays");

  assert.match(game, /companionCastRef\.current=\{started:now,kind:"recall",direction\};pl\.facing=direction;tone\(470,\.16,\.022\);window\.setTimeout\(\(\)=>tone\(280,\.22,\.024\),180\);window\.setTimeout\(\(\)=>tone\(135,\.34,\.022\),610\)/);
  assert.equal((game.match(/tone\(330,\.18,\.024\);window\.setTimeout\(\(\)=>tone\(620,\.22,\.022\),170\);window\.setTimeout\(\(\)=>tone\(940,\.28,\.02\),420\)/g) || []).length, 2, "fresh summon and Q-during-recall reseat both fire the summon triad");
});

test("Space double-jump and S crouch/slide stay fair after planted floors", () => {
  assert.match(game, /if \(\(k==="w"\|\|k==="arrowup"\|\|k===" "\)&&!e\.repeat\) jumpQueued\.current=true/);
  assert.match(game, /if \(\(k==="s"\|\|k==="arrowdown"\)&&!e\.repeat\) slideQueued\.current=true/);
  assert.match(game, /<span><b>W \/ Space ×2<\/b> Double jump<\/span><span><b>S<\/b> Crouch \/ slide<\/span>/);
  assert.match(game, /if\(jump&&pl\.jumpsLeft>0\)\{\n {10}const secondJump=pl\.jumpsLeft===1;\n {10}pl\.vy=secondJump\?-465:-500;pl\.grounded=false;pl\.jumpsLeft-=1;pl\.crouched=false;pl\.sliding=false;slideUntil\.current=0;didJump=true/);
  assert.match(game, /if\(wasGrounded&&!didJump&&!pl\.grounded\)pl\.jumpsLeft=Math\.min\(pl\.jumpsLeft,1\)/);
  assert.match(game, /if\(wantsSlide&&pl\.grounded&&Math\.abs\(pl\.vx\)>55\)\{/);
  assert.match(game, /pl\.sliding=pl\.grounded&&now<slideUntil\.current/);
  assert.match(game, /pl\.crouched=pl\.grounded&&Boolean\(down\)&&!pl\.sliding/);
  assert.match(game, /if\(pl\.y>WORLD_H\+80\)\{const floor=plantedFloorAt\(map,Math\.max\(120,pl\.x-180\)\);pl\.x=floor\.x;pl\.y=plantedYAt\(map,floor\.x\);pl\.vy=0;pl\.grounded=true;pl\.jumpsLeft=2;pl\.crouched=false;pl\.sliding=false;slideUntil\.current=0;\}/);
  assert.doesNotMatch(game, /coyoteTime|ledgeForgiv|tripleJump|jumpsLeft\s*=\s*3/);

  const recoverXs = [
    { map: 1, x: 7200 },
    { map: 2, x: 5400 },
    { map: 3, x: 5800 },
    { map: 4, x: 6000 },
    { map: 5, x: 6200 },
    { map: 6, x: 8000 },
  ];
  for (const scene of recoverXs) {
    const map = maps[scene.map];
    assert.deepEqual(walkableGaps(map.plats, map.w), [], `map ${scene.map} stays gapless for jump\/slide`);
    const floor = plantedFloorAt(map.plats, map.w, Math.max(120, scene.x - 180));
    assert.notEqual(surfaceAt(map.plats, floor.x), null, `map ${scene.map} void recover still plants`);
    assert.equal(floor.groundY - PH + PH, floor.groundY);
    let hops = applyJump(2);
    assert.equal(hops.vy, -500);
    assert.equal(hops.jumpsLeft, 1);
    hops = applyJump(hops.jumpsLeft);
    assert.equal(hops.vy, -465);
    assert.equal(hops.jumpsLeft, 0);
    assert.equal(applyJump(0).didJump, false, "no third jump after a planted recover");
    assert.equal(canStartSlide(true, 220), true);
    assert.equal(canStartSlide(true, 40), false, "slow walk still crouches instead of sliding");
    assert.equal(canStartSlide(false, 220), false, "airborne S cannot start a slide");
  }
});

test("west/east portal labels and PRESS E keep cream fill after the #48/#50 late stroke", () => {
  assert.match(game, /const PORTAL_PROMPT_RANGE = 145/);
  assert.match(game, /const nearPortalAt = \(x:number, portalX:number\) => Math\.abs\(x-\(portalX\+55\)\)<PORTAL_PROMPT_RANGE/);
  assert.match(game, /const lateMapContactShade = \(map:MapId\) => map===5/);
  assert.match(game, /const drawPortal=\(x:number,groundY:number,now:number,map:MapId,colorOverride\?:string,label\?:string\)=>\{/);
  assert.match(game, /ctx\.lineWidth=late\?5:4;ctx\.strokeStyle=late\?"rgba\(6,2,4,\.96\)":"rgba\(6,8,10,\.88\)";ctx\.strokeText\(label,cx,groundY-188\)/);
  assert.match(game, /ctx\.fillStyle="#fff6d2";ctx\.fillText\(label,cx,groundY-188\); \/\/ early-map west\/east tags keep cream fill after #48\/#50 late stroke/);
  assert.match(game, /ctx\.strokeText\("PRESS E",cx,groundY-174\)/);
  assert.match(game, /ctx\.fillStyle="#fff6d2";ctx\.fillText\("PRESS E",cx,groundY-174\)/);
  assert.doesNotMatch(game, /ctx\.fillStyle=late\?"#fff6d2":"rgba\("\+portalColor\+","\+tagPulse\+"\)"/);
  assert.doesNotMatch(game, /ctx\.fillStyle=near\|\|late\?"#fff6d2"/);

  const labels = [
    ["EAST · SHORE", 1],
    ["WEST · RAIN", 2],
    ["EAST · HOLLOW", 2],
    ["WEST · SHORE", 3],
    ["EAST · CLIFFS", 3],
    ["WEST · HOLLOW", 4],
    ["EAST · EMBER", 4],
    ["WEST · CLIFFS", 5],
    ["EAST · HEART", 5],
    ["WEST · EMBER", 6],
  ];
  for (const [label] of labels) {
    assert.match(game, new RegExp(label.replace(/[·]/g, "·")));
  }
  assert.match(game, /if\(map===1&&nearPortalAt\(x,MAP1_PORTAL_X\)\) enterMap\(2,1\)/);
  assert.match(game, /else if\(map===6&&nearPortalAt\(x,MAP6_ENTRY_X\)\) enterMap\(5,6\)/);
});

test("locks hold: Moon Night, planted helpers, PR #10 numbers, talk tables, no dating, no maps 7+", () => {
  assert.match(game, /PLAYER_NAME = "Moon Night"/);
  assert.match(campaign, /PLAYER_DISPLAY_NAME = "Moon Night"/);
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);
  assert.match(game, /const keepCreatureOnRoad=\(creature:\{x:number;y:number;groundY:number\},map:MapId\)=>\{/);
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
