import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const game = await readFile(new URL("../app/game.tsx", import.meta.url), "utf8");
const campaign = await readFile(new URL("../lib/campaign.ts", import.meta.url), "utf8");

function npcBlock(id, map) {
  const marker = `{id:"${id}",name:`;
  const indexes = [];
  for (let from = 0; from < game.length; ) {
    const at = game.indexOf(marker, from);
    if (at < 0) break;
    indexes.push(at);
    from = at + marker.length;
  }
  const block = indexes
    .map((at) => game.slice(at, at + 1600))
    .find((chunk) => chunk.includes(`map:${map},`));
  assert.ok(block, `missing ${id} on map ${map}`);
  return block;
}

test("named travelers reuse E-talk and change if you meet them again", () => {
  assert.match(game, /id:"reed"/);
  assert.match(game, /id:"kest"/);
  assert.match(game, /id:"calen"/);
  assert.match(game, /id:"sera"/);
  assert.match(game, /id:"bram"/);

  const calenCastle = npcBlock("calen", 1);
  const calenCliffs = npcBlock("calen", 4);
  const seraShore = npcBlock("sera", 2);
  const seraEmber = npcBlock("sera", 5);
  const bramHollow = npcBlock("bram", 3);
  const bramHeart = npcBlock("bram", 6);

  for (const block of [calenCastle, calenCliffs, seraShore, seraEmber, bramHollow, bramHeart]) {
    assert.match(block, /firstTalk:\[/);
    assert.match(block, /againTalk:\[/);
    assert.match(block, /afterCaptureTalk:\[/);
    assert.match(block, /talkRadius:150/);
  }

  assert.match(calenCastle, /cardId:BABY_DRAGON_CARD\.id/);
  assert.match(calenCliffs, /We meet again/);
  assert.match(seraEmber, /We keep crossing roads/);
  assert.match(bramHeart, /We meet at the last echo/);

  assert.match(game, /const npc=NPCS\.find\(n=>n\.map===map&&Math\.abs\(x-n\.x\)<n\.talkRadius\)/);
  assert.match(game, /if\(!metNpcRef\.current\.has\(npc\.id\)\)\{metNpcRef\.current\.add\(npc\.id\);showDialogue\(npc\.firstTalk\);\}/);
  assert.match(game, /else if\(hasCard\) showDialogue\(npc\.afterCaptureTalk\)/);
  assert.match(game, /else showDialogue\(npc\.againTalk\)/);
});

test("this is not a dating sim and adds no relationship engine", () => {
  assert.doesNotMatch(game, /bondMeter|affectionMeter|loveInterest|heartMeter|romanceChoice|dialogueChoice/);
  assert.doesNotMatch(campaign, /bondMeter|loveInterest|romanceChoice/);
  assert.match(game, /metNpcRef\.current\.has\(npc\.id\)/);
});

test("each map keeps a unique animal on the existing card + E/Q pattern", () => {
  assert.match(campaign, /animal: "Baby Dragon"/);
  assert.match(campaign, /animal: "Sunset Jackal"/);
  assert.match(campaign, /animal: "Cinder Fox"/);
  assert.match(campaign, /animal: "Pale Stag"/);
  assert.match(campaign, /animal: "Ember Lynx"/);
  assert.match(campaign, /animal: "Heart Wyrm"/);

  assert.match(game, /createJackal\("sunset-jackal-a"/);
  assert.match(game, /createBeast\("cinder-fox-a"/);
  assert.match(game, /createBeast\("pale-stag-a"/);
  assert.match(game, /createBeast\("ember-lynx-a"/);
  assert.match(game, /createBeast\("heart-wyrm"/);
  assert.match(game, /wildPackFor=\(map:MapId\)=>map===2\?jackals:map===3\?foxes:map===4\?stags:map===5\?lynxes:map===6\?wyrmPack:null/);
  assert.match(game, /wildCardFor=\(map:MapId\)=>map===2\?SUNSET_JACKAL_CARD:map===3\?CINDER_FOX_CARD:map===4\?PALE_STAG_CARD:map===5\?EMBER_LYNX_CARD:map===6\?HEART_WYRM_CARD:null/);
  assert.match(game, /"Pick up "\+otherWildCard\.name\+" card"/);
  assert.match(game, /k==="q"&&!e\.repeat/);

  assert.match(game, /id:"cinder-fox-card".*image:"\/cinder-fox-card\.svg"/);
  assert.match(game, /id:"pale-stag-card".*image:"\/pale-stag-card\.svg"/);
  assert.match(game, /id:"ember-lynx-card".*image:"\/ember-lynx-card\.svg"/);
  assert.match(game, /id:"heart-wyrm-card".*image:"\/heart-wyrm-card\.svg"/);
  assert.match(game, /id:"baby-dragon-card".*image:"\/baby-dragon-sprite-sheet\.png"/);
  assert.match(game, /id:"sunset-jackal-card".*image:"\/baby-dragon-sprite-sheet\.png"/);
});

test("player is Moon Night, never Moon Knight, and Reed/Kest stay", () => {
  assert.match(game, /const PLAYER_NAME = "Moon Night"/);
  assert.doesNotMatch(game, /Moon Knight/);
  assert.match(game, /id:"reed",name:"Reed",map:5/);
  assert.match(game, /id:"kest",name:"Kest",map:6/);
});
