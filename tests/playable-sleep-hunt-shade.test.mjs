import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const game = await readFile(new URL("../app/game.tsx", import.meta.url), "utf8");
const campaign = await readFile(new URL("../lib/campaign.ts", import.meta.url), "utf8");
const art = await readFile(new URL("../ART_DIRECTION.md", import.meta.url), "utf8");

const easeInOut = (t) => t * t * (3 - 2 * t);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const SLEEP_SETTLE_MS = 420;
const WAKE_BLEND_MS = 340;
const sleepPoseAmt = (mode, prevMode, blendAt, now, elapsed) => {
  if (mode === "sleep") return easeInOut(clamp(elapsed / SLEEP_SETTLE_MS, 0, 1));
  if (prevMode === "sleep") return 1 - easeInOut(clamp((now - blendAt) / WAKE_BLEND_MS, 0, 1));
  return 0;
};
const curledSleep = (mode, sleepPose) => mode === "sleep" && sleepPose >= 0.72;
const idleBreathIndex = (elapsed) => {
  const phase = elapsed % 2900;
  return phase < 1550 ? 0 : phase < 2150 ? 1 : phase < 2500 ? 2 : 3;
};
const spriteWakeIndex = (mode, prevMode, blendAt, now, elapsed, early = 0.28, mid = 0.55, late = 0.8) => {
  if (mode !== "idle") return idleBreathIndex(elapsed);
  const wake = prevMode === "sleep" ? easeInOut(clamp((now - blendAt) / WAKE_BLEND_MS, 0, 1)) : 1;
  if (wake < early) return 3;
  if (wake < mid) return 2;
  if (wake < late) return 1;
  return idleBreathIndex(elapsed);
};

test("companion and dragon sleep→wake never holds a curl pose on maps 1–6", () => {
  assert.match(game, /const sleep=mode==="sleep"&&sleepPose>=0\.72; \/\/ curl only while asleep; sleep→wake uses sleepPoseAmt stand-up, no frozen curl frame/);
  assert.match(game, /const wake=dragon\.prevMode==="sleep"\?easeInOut\(clamp\(\(now-dragon\.modeBlendAt\)\/WAKE_BLEND_MS,0,1\)\):1/);
  assert.match(game, /const wake=ally\.prevMode==="sleep"\?easeInOut\(clamp\(\(now-ally\.modeBlendAt\)\/WAKE_BLEND_MS,0,1\)\):1/);
  assert.match(game, /else\{const phase=elapsed%2900;index=phase<1550\?0:phase<2150\?1:phase<2500\?2:3;\} \/\/ companion dragon idle uses stand-breath, not the curl-row 520ms cycle/);
  assert.match(game, /else if\(roost\.mode==="idle"&&roost\.prevMode==="sleep"\)\{/);
  assert.match(game, /else\{const phase=elapsed%2900;index=phase<1550\?0:phase<2150\?1:phase<2500\?2:3;\} \/\/ after sleep→wake, roost idle holds stand-breath instead of a frozen curl-row cycle/);
  assert.match(game, /else if\(\(roost\.mode==="idle"\|\|poseMode==="idle"\)&&roost\.prevMode!=="sleep"\)\{/);
  assert.doesNotMatch(game, /if\(ally\.mode==="idle"\)index=Math\.floor\(elapsed\/520\)%Math\.max\(1,frames\.length\)/);
  assert.match(game, /prevMode:jackal\.prevMode,modeBlendAt:jackal\.modeBlendAt/);
  assert.match(game, /prevMode:beast\.prevMode,modeBlendAt:beast\.modeBlendAt/);
  assert.match(game, /prevMode:ally\.prevMode,modeBlendAt:ally\.modeBlendAt/);
  assert.match(game, /drawPixelWyrm\(ally\.x,ally\.y\+summonLift-recallPull,ally\.groundY,ally\.facing,ally\.mode,elapsed,now,128\*spriteGrow,false,gait,ally\.prevMode,ally\.modeBlendAt\)/);

  const midWake = sleepPoseAmt("idle", "sleep", 0, 170, 170);
  assert.ok(midWake > 0 && midWake < 1);
  assert.equal(curledSleep("idle", midWake), false, "waking ground ally leaves the curl path");
  assert.equal(curledSleep("idle", 0.9), false);
  assert.equal(curledSleep("sleep", 0.9), true);

  const roostWake = spriteWakeIndex("idle", "sleep", 0, 340, 80, 0.3, 0.58, 0.82);
  assert.equal(roostWake, 0, "after WAKE_BLEND_MS a roost stands, it does not freeze on curl-row 2/3");
  assert.equal(spriteWakeIndex("idle", "sleep", 0, 80, 80, 0.3, 0.58, 0.82), 3);
  assert.equal(spriteWakeIndex("idle", "walk", 0, 200, 200), 0, "non-sleep idle stays on the stand breath");
  assert.equal(spriteWakeIndex("idle", "sleep", 0, 340, 80), 0, "companion dragon wake finishes on stand-breath");
  assert.ok(idleBreathIndex(0) < 2 && idleBreathIndex(1600) < 2, "stand-breath spends the first 2150ms off the curl row");
});

test("hunting ally still teleports when stuck and strikes inside PR #10 ranges", () => {
  assert.match(game, /const COMPANION_HUNT_RANGE = 520/);
  assert.match(game, /const COMPANION_STRIKE_RANGE = 132/);
  assert.match(game, /const COMPANION_STRIKE_DAMAGE = 5/);
  assert.match(game, /const COMPANION_STRIKE_RECOVERY = 840/);
  assert.match(game, /const COMPANION_TELEPORT_DISTANCE = 720/);
  assert.match(game, /const stayForHunt=hunted&&Math\.abs\(pl\.x-hunted\.x\)<COMPANION_HUNT_RANGE\+140&&Math\.abs\(ally\.x-hunted\.x\)<COMPANION_TELEPORT_DISTANCE/);
  assert.match(game, /if\(Math\.abs\(pl\.x-ally\.x\)>COMPANION_TELEPORT_DISTANCE&&!stayForHunt\)/);
  assert.match(game, /const huntSeat=hunting&&hunted&&"groundY" in hunted\?\(hunted as \{groundY:number\}\)\.groundY:playerGround/);
  assert.match(game, /if\(hunting&&hunted\)\{ally\.targetX=hunted\.x;ally\.attackUntil=now\+1600;\}/);
  assert.match(game, /if\(hunting&&strikeDistance<COMPANION_STRIKE_RANGE\)/);
  assert.match(game, /if\(map===1&&strike===dragon&&Math\.abs\(dragon\.x-ally\.x\)<COMPANION_STRIKE_RANGE\+20\)/);
  assert.match(game, /else if\(strike!==dragon&&Math\.abs\(strike\.x-ally\.x\)<COMPANION_STRIKE_RANGE\+18\)/);
  assert.match(game, /ally\.recallStarted=0;\n {14}const summonX=creatureEdgeAt\(map,pl\.x\+pl\.facing\*COMPANION_DEPLOY_DISTANCE\)/);
  assert.doesNotMatch(game, /ally\.attackUntil=now\+900/);

  const COMPANION_TELEPORT_DISTANCE = 720;
  const COMPANION_HUNT_RANGE = 520;
  const COMPANION_STRIKE_RANGE = 132;
  const stayForHunt = (plX, allyX, huntedX) =>
    Math.abs(plX - huntedX) < COMPANION_HUNT_RANGE + 140 && Math.abs(allyX - huntedX) < COMPANION_TELEPORT_DISTANCE;
  const shouldTeleport = (plX, allyX, huntedX) => Math.abs(plX - allyX) > COMPANION_TELEPORT_DISTANCE && !stayForHunt(plX, allyX, huntedX);
  const canStrike = (allyX, huntedX) => Math.abs(huntedX - allyX) < COMPANION_STRIKE_RANGE;

  assert.equal(shouldTeleport(2680, 2680 - 800, 2680), true, "ally stuck west of a perch still teleports into the hunt");
  assert.equal(shouldTeleport(2680, 2600, 2680), false, "ally already on the hunt leash does not teleport");
  assert.equal(shouldTeleport(400, 1300, 1800), true, "far follow without a nearby hunt still teleports");
  assert.equal(shouldTeleport(2140, 2140 - 900, 4520), true, "map 5 kiln-road ally stuck off the lynx still teleports");
  assert.equal(shouldTeleport(2480, 2480 - 860, 4400), true, "map 6 heart-road ally stuck off the pulse still teleports");
  assert.equal(canStrike(200, 200 + 120), true);
  assert.equal(canStrike(200, 200 + 140), false);
  assert.equal(COMPANION_HUNT_RANGE, 520);
  assert.equal(COMPANION_STRIKE_RANGE, 132);
});

test("late-map portal and studyable labels keep stroke contrast after lateMapContactShade", () => {
  assert.match(art, /Keep the heat local to coals, kiln mouths, and lynx-eye accents/);
  assert.match(art, /Keep the heart's glow local; do not wash the whole chamber in magenta/);
  assert.match(game, /const lateMapContactShade = \(map:MapId\) => map===5/);
  assert.match(game, /const drawLateStudyableTag=\(x:number,y:number,label:string\)=>\{/);
  assert.match(game, /const late=lateMapContactShade\(mapRef\.current\)/);
  assert.match(game, /ctx\.lineWidth=late\?4:3;ctx\.strokeStyle=late\?"rgba\(6,2,4,\.96\)":"rgba\(7,3,16,\.9\)";ctx\.strokeText\(label,x,y\)/);
  assert.match(game, /ctx\.lineWidth=late\?4:3;ctx\.strokeStyle=late\?"rgba\(6,2,4,\.96\)":"rgba\(7,3,16,\.9\)";ctx\.strokeText\("PRESS E",x,y\)/);
  assert.match(game, /const late=lateMapContactShade\(map\)/);
  assert.match(game, /ctx\.lineWidth=late\?5:4;ctx\.strokeStyle=late\?"rgba\(6,2,4,\.96\)":"rgba\(6,8,10,\.88\)";ctx\.strokeText\(label,cx,groundY-188\)/);
  assert.match(game, /ctx\.fillStyle=late\?"#fff6d2":"rgba\("\+portalColor\+","\+tagPulse\+"\)"/);
  assert.match(game, /ctx\.fillStyle=near\|\|late\?"#fff6d2":"rgba\("\+portalColor\+","\+\(\.55\+tagPulse\*\.25\)\+"\)"/);
  assert.match(game, /ctx\.strokeText\(bound\?"ALTAR EAST":"PULSE",x,groundY-28\)/);
  assert.match(game, /ctx\.fillStyle="#fff6d2";ctx\.fillText\(bound\?"ALTAR EAST":"PULSE",x,groundY-28\)/);
  assert.match(game, /EAST · HEART/);
  assert.match(game, /WEST · EMBER/);
  assert.match(game, /if\(labeled\)drawLateStudyableTag\(x,groundY-78\*scale,"KILN"\)/);
  assert.match(game, /drawLateStudyableTag\(x,groundY-36,"VEIN"\)/);
  assert.match(game, /drawLateStudyableTag\(x,groundY-36,"COAL"\)/);
  assert.match(game, /drawLateStudyableTag\(x,groundY-46,"BELLOWS"\)/);
  assert.match(game, /drawLateStudyableTag\(x,groundY-68,"ECHO"\)/);
  assert.match(game, /drawLateStudyableTag\(x,groundY-28,"STEP"\)/);
  assert.doesNotMatch(game, /ctx\.globalAlpha=\.34\+pulse\*\.2;ctx\.fillStyle="#ffc8a0"/);
});

test("locks hold: Moon Night, planted helpers, PR #10 numbers, Hale / kiln-pulse talk, no dating, no maps 7+", () => {
  assert.match(game, /PLAYER_NAME = "Moon Night"/);
  assert.match(campaign, /PLAYER_DISPLAY_NAME = "Moon Night"/);
  assert.match(game, /const plantedYAt=\(map:MapId,x:number\)=>\(surfaceYAt\(map,x,590\)\?\?590\)-PH/);
  assert.match(game, /const plantedFloorAt=\(map:MapId,x:number\)=>\{/);
  assert.match(game, /const keepCreatureOnRoad=\(creature:\{x:number;y:number;groundY:number\},map:MapId\)=>\{/);
  assert.match(game, /const idleSeat=!hunting\?plantedFloorAt\(map,ally\.x\):null/);
  assert.match(game, /const nextUsableLoadout=\(equipped:\(string\|null\)\[\],itemId:string,selected:number\)=>\{/);
  assert.match(game, /if\(already>=0\)return \{equipped:next,selected:already,replaced:null as string\|null\}/);
  assert.match(game, /const MAP6_PULSE_X = 4400/);
  assert.match(game, /\{id:"hale",name:"Hale",map:5,x:4040/);
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
