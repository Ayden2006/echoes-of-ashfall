import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const game = await readFile(new URL("../app/game.tsx", import.meta.url), "utf8");
const campaign = await readFile(new URL("../lib/campaign.ts", import.meta.url), "utf8");

test("animals keep a continuous gait clock and blend modes instead of snapping Y", () => {
  assert.match(game, /gait:number; prevMode:DragonMode; modeBlendAt:number/);
  assert.match(game, /const tickAnimalGait = \(animal:\{gait:number\}, dt:number\)=>\{animal\.gait=\(animal\.gait\|\|0\)\+dt\*1000;\}/);
  assert.match(game, /const rememberModeChange = \(animal:\{mode:DragonMode;prevMode:DragonMode;modeBlendAt:number\}, mode:DragonMode, now:number\)=>\{/);
  assert.match(game, /const MODE_BLEND_MS = 260/);
  assert.match(game, /tickAnimalGait\(dragon,dt\)/);
  assert.match(game, /tickAnimalGait\(jackal,dt\)/);
  assert.match(game, /tickAnimalGait\(ally,dt\)/);
  assert.match(game, /rememberModeChange\(dragon,mode,now\)/);
  assert.match(game, /rememberModeChange\(jackal,nextMode,now\)/);
  assert.match(game, /rememberModeChange\(ally,mode,now\)/);
  assert.doesNotMatch(game, /if\(mode==="idle"\|\|mode==="walk"\|\|mode==="run"\|\|mode==="sleep"\)dragon\.y=dragon\.groundY/);
  assert.doesNotMatch(game, /if\(nextMode==="idle"\|\|nextMode==="walk"\|\|nextMode==="run"\|\|nextMode==="sleep"\)jackal\.y=jackal\.groundY/);
  assert.doesNotMatch(game, /if\(mode==="fly"\)dragon\.y=Math\.min\(dragon\.y,dragon\.groundY-42\)/);
  assert.doesNotMatch(game, /if\(nextMode==="fly"\)jackal\.y=Math\.min\(jackal\.y,jackal\.groundY/);
});

test("walk/run/fly/sleep/leap/pounce use gait or eased pose, and Q deploy still eases", () => {
  assert.match(game, /else if\(dragon\.mode==="walk"\)index=Math\.floor\(gait\/220\)%frames\.length/);
  assert.match(game, /else if\(dragon\.mode==="run"\)index=Math\.floor\(gait\/95\)%frames\.length/);
  assert.match(game, /else if\(dragon\.mode==="fly"\)index=flapFrame\(gait,frames\.length\)/);
  assert.match(game, /else if\(ally\.mode==="walk"\)index=Math\.floor\(gait\/180\)%/);
  assert.match(game, /else if\(ally\.mode==="run"\)index=Math\.floor\(gait\/100\)%/);
  assert.match(game, /else if\(ally\.mode==="fly"\)index=flapFrame\(gait,frames\.length\)/);
  assert.match(game, /const sleepBlend=mode==="sleep"\?easeInOut\(clamp\(elapsed\/MODE_BLEND_MS,0,1\)\):0/);
  assert.match(game, /const leap=air/);
  assert.match(game, /const flyAmt=clamp\(\(groundY-y\)\/90,0,1\)/);
  assert.match(game, /startJackalLeap\(jackal,now\)/);
  assert.match(game, /const nextMode=!canFly&&mode==="fly"\?"run":mode/);
  assert.match(game, /if\(nextMode==="sleep"\|\|nextMode==="attack"\)\{jackal\.leapUntil=0/);
  assert.match(game, /const summonLift=\(1-summonCreature\)\*34,recallPull=\(1-recallCreature\)\*30/);
  assert.match(game, /ally\.prevMode="idle";ally\.modeBlendAt=now;ally\.gait=0;ally\.mode="idle"/);
  assert.match(game, /const hop=groundAlly&&distance>190\?Math\.abs\(Math\.sin\(ally\.gait\*\.008\)\)\*38:0/);
});

test("eastern roam stretches get more map-local scenery without restoring Map 1 buildings", () => {
  assert.match(game, /const props=\[380,760,1110,1490,1810,2190,2570,2940,3310,3710,4100,4510,4780,4980,5150,5420,5580,5860,6040,6280,6460,6640,6820,6980\]/);
  assert.doesNotMatch(game, /drawRegionalScenery=\(now:number,viewW:number,map:MapId\)=>\{\s*if\(map===1\)return/);
  assert.match(game, /if\(map===1\)\{if\(i%3===0\)\{ctx\.strokeStyle="rgba\(61,82,96,\.82\)"/);
  assert.match(game, /for\(let i=0;i<24;i\+\+\)\{\s*const tx=180\+i\*270/);
  assert.match(game, /for\(let i=0;i<17;i\+\+\)\{\s*const tx=240\+i\*430/);
  assert.doesNotMatch(game, /radio encounter|tune the radio|listen to the radio/i);
  assert.doesNotMatch(game, /drawPixelHouse|drawCastleKeep|restore the radio/i);
});

test("locks hold: Moon Night, no people-talk edits, no dating, no maps 7+, PR #10 combat feel", () => {
  assert.match(game, /PLAYER_NAME = "Moon Night"/);
  assert.match(campaign, /PLAYER_DISPLAY_NAME = "Moon Night"/);
  assert.doesNotMatch(game, /Moon Knight|bondMeter|dating sim|affectionMeter|romanceChoice/);
  assert.doesNotMatch(game, /map:\s*7|Map 7|MAP7_/);
  assert.match(game, /const COMPANION_HUNT_RANGE = 520/);
  assert.match(game, /const COMPANION_STRIKE_RANGE = 132/);
  assert.match(game, /const COMPANION_STRIKE_DAMAGE = 5/);
  assert.match(game, /const COMPANION_STRIKE_RECOVERY = 840/);
  assert.match(game, /const EXTRA_CHASE_LEEWAY = 360/);
  assert.match(game, /const COMBAT_ONLY_AGGRO_RANGE = 220/);
  assert.match(game, /if\(hunting&&hunted\)\{ally\.targetX=hunted\.x;ally\.attackUntil=now\+1600;\}/);
  assert.doesNotMatch(game, /ally\.attackUntil=now\+900/);
  assert.equal((game.match(/firstTalk:\[/g) || []).length, 32);
  assert.equal((game.match(/againTalk:\[/g) || []).length, 32);
  assert.equal((game.match(/afterCaptureTalk:\[/g) || []).length, 32);
  assert.match(game, /id:"tamsin"/);
  assert.match(game, /id:"lira"/);
  assert.match(game, /id:"holt"/);
  assert.match(game, /id:"maer"/);
  assert.match(game, /id:"perrin"/);
  assert.match(game, /id:"wren"/);
  assert.match(game, /id:"dell"/);
  assert.match(game, /id:"isk"/);
  assert.match(game, /id:"rowan"/);
  assert.match(game, /We meet again\. Castle merlon, then kiln road/);
  assert.match(game, /id:"reed"/);
  assert.match(game, /id:"kest"/);
  assert.match(game, /id:"orrin"/);
  assert.match(game, /id:"nia"/);
  assert.match(game, /id:"vess"/);
});
