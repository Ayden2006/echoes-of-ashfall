import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const game = await readFile(new URL("../app/game.tsx", import.meta.url), "utf8");
const campaign = await readFile(new URL("../lib/campaign.ts", import.meta.url), "utf8");

test("dragon wingbeats and jackal hops use restrained timing curves", () => {
  assert.match(game, /const DRAGON_FLAP_MS = 320/);
  assert.match(game, /const JACKAL_HOP_MS = 560/);
  assert.match(game, /const JACKAL_POUNCE_MS = 620/);
  assert.match(game, /const flapPhase = \(gait:number\)=>\{/);
  assert.match(game, /const flapFrame = \(gait:number, frames:number\)=>\{/);
  assert.match(game, /const hopArc = \(t:number, height:number\)=>\{/);
  assert.match(game, /else if\(dragon\.mode==="fly"\)index=flapFrame\(gait,frames\.length\)/);
  assert.match(game, /else if\(ally\.mode==="fly"\)index=flapFrame\(gait,frames\.length\)/);
  assert.match(game, /roost\.mode==="fly"\?flapFrame\(roost\.gait\|\|elapsed,frames\.length\)/);
  assert.match(game, /jackal\.leapUntil=now\+JACKAL_HOP_MS\+Math\.random\(\)\*80/);
  assert.match(game, /hopArc\(hopT,52\)/);
  assert.match(game, /hopArc\(lunge,22\)/);
  assert.match(game, /hopArc\(clamp\(\(now-ally\.modeStarted\)\/JACKAL_POUNCE_MS,0,1\),28\)/);
  assert.match(game, /flapPhase\(dragon\.gait\)\.lift\*12/);
  assert.match(game, /const pounce=attack>0\?hopArc\(attack,1\):0/);
});

test("eastern roads keep denser fog and motes on maps 1–6 without new systems", () => {
  assert.match(game, /const motes=Array\.from\(\{length:64\}/);
  assert.match(game, /if\(map===1\)\{[\s\S]*for\(let i=0;i<8;i\+\+\)\{const x=\(\(i\*210-parallax/);
  assert.match(game, /else if\(map===2\)\{[\s\S]*for\(let i=0;i<7;i\+\+\)\{const x=\(\(i\*230-parallax/);
  assert.doesNotMatch(game, /drawRegionalBackdropDepth=\(w:number,h:number,now:number,map:MapId\)=>\{\s*if\(map<3\)return/);
  assert.match(game, /for\(let i=0;i<5;i\+\+\)\{[\s\S]*rgba\(128,151,176/);
  assert.match(game, /for\(let i=0;i<42;i\+\+\)\{[\s\S]*ashX=/);
  assert.match(game, /for\(let i=0;i<36;i\+\+\)\{[\s\S]*mx=\(i\*271\)%MAP2_W/);
  assert.match(game, /for\(let i=0;i<32;i\+\+\)\{[\s\S]*mx=\(i\*263\)%MAP4_W/);
  assert.match(game, /for\(let i=0;i<40;i\+\+\)\{[\s\S]*MAP5_W/);
  assert.match(game, /for\(let i=0;i<40;i\+\+\)\{[\s\S]*MAP6_W/);
});

test("locks hold after flap and atmosphere polish", () => {
  assert.match(game, /PLAYER_NAME = "Moon Night"/);
  assert.match(campaign, /PLAYER_DISPLAY_NAME = "Moon Night"/);
  assert.doesNotMatch(game, /Moon Knight|bondMeter|dating sim|affectionMeter|romanceChoice|MAP7_/);
  assert.doesNotMatch(game, /radio encounter|tune the radio/i);
  assert.match(game, /const COMPANION_HUNT_RANGE = 520/);
  assert.match(game, /if\(hunting&&hunted\)\{ally\.targetX=hunted\.x;ally\.attackUntil=now\+1600;\}/);
  assert.equal((game.match(/firstTalk:\[/g) || []).length, 37);
  assert.match(game, /id:"lira"/);
  assert.match(game, /id:"holt"/);
  assert.match(game, /id:"wren"/);
  assert.match(game, /id:"dell"/);
  assert.match(game, /id:"isk"/);
  assert.match(game, /id:"rowan"/);
  assert.match(game, /id:"ryn"/);
  assert.match(game, /id:"edan"/);
  assert.match(game, /id:"hale"/);
  assert.match(game, /We meet again\. Castle merlon, then kiln road/);
});
