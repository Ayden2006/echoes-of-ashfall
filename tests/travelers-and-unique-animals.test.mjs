import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const game = await readFile(new URL("../app/game.tsx", import.meta.url), "utf8");
const campaign = await readFile(new URL("../lib/campaign.ts", import.meta.url), "utf8");

function npcBlock(id, map) {
  const re = new RegExp(`\\{id:"${id}",name:"[^"]+",map:${map},`);
  const at = game.search(re);
  assert.ok(at >= 0, `missing ${id} on map ${map}`);
  return game.slice(at, at + 3600);
}

test("named travelers reuse E-talk and change if you meet them again", () => {
  assert.match(game, /id:"reed"/);
  assert.match(game, /id:"kest"/);
  assert.match(game, /id:"calen"/);
  assert.match(game, /id:"sera"/);
  assert.match(game, /id:"bram"/);
  assert.match(game, /id:"orrin"/);
  assert.match(game, /id:"nia"/);
  assert.match(game, /id:"vess"/);
  assert.match(game, /id:"tamsin"/);
  assert.match(game, /id:"lira"/);
  assert.match(game, /id:"holt"/);
  assert.match(game, /id:"maer"/);
  assert.match(game, /id:"perrin"/);
  assert.match(game, /id:"wren"/);
  assert.match(game, /id:"dell"/);
  assert.match(game, /id:"isk"/);
  assert.match(game, /id:"rowan"/);
  assert.match(game, /id:"ryn"/);
  assert.match(game, /id:"edan"/);
  assert.match(game, /id:"hale"/);

  const calenCastle = npcBlock("calen", 1);
  const calenCliffs = npcBlock("calen", 4);
  const seraShore = npcBlock("sera", 2);
  const seraEmber = npcBlock("sera", 5);
  const bramHollow = npcBlock("bram", 3);
  const bramHeart = npcBlock("bram", 6);
  const orrinCastle = npcBlock("orrin", 1);
  const orrinCliffs = npcBlock("orrin", 4);
  const niaShore = npcBlock("nia", 2);
  const niaHeart = npcBlock("nia", 6);
  const vessHollow = npcBlock("vess", 3);
  const vessEmber = npcBlock("vess", 5);
  const tamsinCastle = npcBlock("tamsin", 1);
  const tamsinEmber = npcBlock("tamsin", 5);
  const liraShore = npcBlock("lira", 2);
  const liraCliffs = npcBlock("lira", 4);
  const holtHollow = npcBlock("holt", 3);
  const holtHeart = npcBlock("holt", 6);
  const maerCastle = npcBlock("maer", 1);
  const maerEmber = npcBlock("maer", 5);
  const perrinShore = npcBlock("perrin", 2);
  const perrinEmber = npcBlock("perrin", 5);
  const wrenCastle = npcBlock("wren", 1);
  const wrenCliffs = npcBlock("wren", 4);
  const dellShore = npcBlock("dell", 2);
  const dellHeart = npcBlock("dell", 6);
  const iskHollow = npcBlock("isk", 3);
  const iskEmber = npcBlock("isk", 5);
  const rowanCastle = npcBlock("rowan", 1);
  const rowanHeart = npcBlock("rowan", 6);
  const rynCliffs = npcBlock("ryn", 4);
  const rynEmber = npcBlock("ryn", 5);
  const edanHeart = npcBlock("edan", 6);
  const haleCliffs = npcBlock("hale", 4);
  const haleEmber = npcBlock("hale", 5);

  for (const block of [calenCastle, calenCliffs, seraShore, seraEmber, bramHollow, bramHeart, orrinCastle, orrinCliffs, niaShore, niaHeart, vessHollow, vessEmber, tamsinCastle, tamsinEmber, liraShore, liraCliffs, holtHollow, holtHeart, maerCastle, maerEmber, perrinShore, perrinEmber, wrenCastle, wrenCliffs, dellShore, dellHeart, iskHollow, iskEmber, rowanCastle, rowanHeart, rynCliffs, rynEmber, edanHeart, haleCliffs, haleEmber]) {
    assert.match(block, /firstTalk:\[/);
    assert.match(block, /againTalk:\[/);
    assert.match(block, /afterCaptureTalk:\[/);
    assert.match(block, /talkRadius:150/);
  }

  assert.match(calenCastle, /cardId:BABY_DRAGON_CARD\.id/);
  assert.match(calenCliffs, /We meet again/);
  assert.match(seraEmber, /We keep crossing roads/);
  assert.match(bramHeart, /We meet at the last echo/);
  assert.match(orrinCastle, /cardId:BABY_DRAGON_CARD\.id/);
  assert.match(orrinCliffs, /We meet again\. Castle rain, then cliff wind/);
  assert.match(niaHeart, /We keep meeting at the edge of the light/);
  assert.match(vessEmber, /We meet where the ash learned to wait/);
  assert.match(tamsinEmber, /We meet again\. Castle merlon, then kiln road/);
  assert.match(liraCliffs, /We meet again\. Shore dusk, then cliff wind/);
  assert.match(holtHeart, /We meet again\. Cairn twist, then heart/);
  assert.match(maerEmber, /We meet again\. Castle rain, then kiln road/);
  assert.match(perrinEmber, /We meet again\. Late shore, then kiln road/);
  assert.match(wrenCliffs, /We meet again\. Castle rain, then this cliff/);
  assert.match(dellHeart, /We meet again\. Shore dusk, then heart/);
  assert.match(iskEmber, /We meet again\. Cairn twist, then kiln heat/);
  assert.match(rowanHeart, /We meet again\. Castle rain, then heart/);
  assert.match(rynEmber, /We meet again\. Cliff wind, then kiln gate/);
  assert.match(edanHeart, /Press E at the altar\. The campaign ends when the signal rests/);
  assert.match(haleCliffs, /The wind forgets you between watches/);
  assert.match(haleCliffs, /cardId:PALE_STAG_CARD\.id/);
  assert.match(haleEmber, /We meet again\. Cliff quiet, then this kiln/);
  assert.match(haleEmber, /cardId:EMBER_LYNX_CARD\.id/);
  assert.match(liraShore, /cardId:SUNSET_JACKAL_CARD\.id/);
  assert.match(wrenCastle, /cardId:BABY_DRAGON_CARD\.id/);
  assert.match(dellShore, /cardId:SUNSET_JACKAL_CARD\.id/);
  assert.match(iskHollow, /cardId:CINDER_FOX_CARD\.id/);
  assert.match(rowanCastle, /cardId:BABY_DRAGON_CARD\.id/);
  assert.match(holtHollow, /cardId:CINDER_FOX_CARD\.id/);
  assert.match(maerCastle, /cardId:BABY_DRAGON_CARD\.id/);
  assert.match(perrinShore, /cardId:SUNSET_JACKAL_CARD\.id/);

  assert.match(game, /const npc=NPCS\.find\(n=>n\.map===map&&Math\.abs\(x-n\.x\)<n\.talkRadius\)/);
  assert.match(game, /const talkKey=npcTalkKey\(npc\)/);
  assert.match(game, /if\(!metNpcRef\.current\.has\(talkKey\)\)\{metNpcRef\.current\.add\(talkKey\);showDialogue\(npc\.firstTalk\);\}/);
  assert.match(game, /else if\(hasCard\) showDialogue\(npc\.afterCaptureTalk\)/);
  assert.match(game, /else showDialogue\(npc\.againTalk\)/);
});

test("Sera afterCapture treats any sunset jackal card, including PR 5 suffixes", () => {
  const seraShore = npcBlock("sera", 2);
  assert.match(seraShore, /cardId:SUNSET_JACKAL_CARD\.id/);
  assert.match(game, /const isSunsetJackalCardId = \(id:string\|null\) => Boolean\(id&&id\.startsWith\("sunset-jackal-card"\)\)/);
  assert.match(game, /npc\.cardId===SUNSET_JACKAL_CARD\.id\?isSunsetJackalCardId\(entry\.id\):entry\.id===npc\.cardId/);
  const fnMatch = game.match(/const isSunsetJackalCardId = \(id:string\|null\) => ([^;]+);/);
  assert.ok(fnMatch);
  const held = new Function("id", `return (${fnMatch[1]});`);
  assert.equal(held("sunset-jackal-card"), true);
  assert.equal(held("sunset-jackal-card-a"), true);
  assert.equal(held("sunset-jackal-card-b"), true);
  assert.equal(held("sunset-jackal-card-c"), true);
  assert.equal(held("cinder-fox-card"), false);
  assert.equal(held("ember-lynx-card"), false);
  assert.equal(held(null), false);
});

test("this is not a dating sim and adds no relationship engine", () => {
  assert.doesNotMatch(game, /bondMeter|affectionMeter|loveInterest|heartMeter|romanceChoice|dialogueChoice/);
  assert.doesNotMatch(campaign, /bondMeter|loveInterest|romanceChoice/);
  assert.match(game, /npcTalkKey=\(npc:\{id:string;map:MapId\}\)=>npc\.id\+":"\+npc\.map/);
  assert.match(game, /metNpcRef\.current\.has\(talkKey\)/);
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
  assert.match(game, /wildPackFor=\(map:MapId\)=>map===1\?roosts:map===2\?jackals:map===3\?foxes:map===4\?stags:map===5\?lynxes:map===6\?wyrmPack:null/);
  assert.match(game, /wildCardFor=\(map:MapId\)=>map===2\?SUNSET_JACKAL_CARD:map===3\?CINDER_FOX_CARD:map===4\?PALE_STAG_CARD:map===5\?EMBER_LYNX_CARD:map===6\?HEART_WYRM_CARD:null/);
  assert.match(game, /"Pick up "\+otherWildCard\.name\+" card"/);
  assert.match(game, /k==="q"&&!e\.repeat/);

  // Jackal card art is PR #5's slice — do not lock it to the baby-dragon PNG.
  assert.match(game, /id:"cinder-fox-card".*assetUrl\("\/cinder-fox-card\.svg"\)/);
  assert.match(game, /id:"pale-stag-card".*assetUrl\("\/pale-stag-card\.svg"\)/);
  assert.match(game, /id:"ember-lynx-card".*assetUrl\("\/ember-lynx-card\.svg"\)/);
  assert.match(game, /id:"heart-wyrm-card".*assetUrl\("\/heart-wyrm-card\.svg"\)/);
  assert.match(game, /id:"baby-dragon-card".*assetUrl\("\/baby-dragon-sprite-sheet\.png"\)/);
});

test("player is Moon Night, never Moon Knight, and Reed/Kest stay", () => {
  assert.match(game, /const PLAYER_NAME = "Moon Night"/);
  assert.doesNotMatch(game, /Moon Knight/);
  assert.match(game, /id:"reed",name:"Reed",map:5/);
  assert.match(game, /id:"kest",name:"Kest",map:6/);
  assert.match(game, /id:"orrin",name:"Orrin",map:1/);
  assert.match(game, /id:"orrin",name:"Orrin",map:4/);
  assert.match(game, /id:"nia",name:"Nia",map:2/);
  assert.match(game, /id:"nia",name:"Nia",map:6/);
  assert.match(game, /id:"vess",name:"Vess",map:3/);
  assert.match(game, /id:"vess",name:"Vess",map:5/);
  assert.match(game, /id:"tamsin",name:"Tamsin",map:1/);
  assert.match(game, /id:"tamsin",name:"Tamsin",map:5/);
  assert.match(game, /id:"lira",name:"Lira",map:2/);
  assert.match(game, /id:"lira",name:"Lira",map:4/);
  assert.match(game, /id:"holt",name:"Holt",map:3/);
  assert.match(game, /id:"holt",name:"Holt",map:6/);
  assert.match(game, /id:"maer",name:"Maer",map:1/);
  assert.match(game, /id:"maer",name:"Maer",map:5/);
  assert.match(game, /id:"perrin",name:"Perrin",map:2/);
  assert.match(game, /id:"perrin",name:"Perrin",map:5/);
  assert.match(game, /id:"wren",name:"Wren",map:1/);
  assert.match(game, /id:"wren",name:"Wren",map:4/);
  assert.match(game, /id:"dell",name:"Dell",map:2/);
  assert.match(game, /id:"dell",name:"Dell",map:6/);
  assert.match(game, /id:"isk",name:"Isk",map:3/);
  assert.match(game, /id:"isk",name:"Isk",map:5/);
  assert.match(game, /id:"rowan",name:"Rowan",map:1/);
  assert.match(game, /id:"rowan",name:"Rowan",map:6/);
  assert.match(game, /id:"ryn",name:"Ryn",map:4/);
  assert.match(game, /id:"ryn",name:"Ryn",map:5/);
  assert.match(game, /id:"edan",name:"Edan",map:6/);
  assert.match(game, /id:"hale",name:"Hale",map:4/);
  assert.match(game, /id:"hale",name:"Hale",map:5/);
});

test("E-talk still keys first/again/afterCapture per id:map with no extra engine", () => {
  const npcTalkKey = (npc) => npc.id + ":" + npc.map;
  const met = new Set();
  const inventory = [];
  const talk = (npc, heldIds) => {
    const talkKey = npcTalkKey(npc);
    const hasCard = heldIds.some((id) => npc.cardId === "sunset-jackal-card" ? id.startsWith("sunset-jackal-card") : id === npc.cardId);
    if (!met.has(talkKey)) { met.add(talkKey); return "first"; }
    if (hasCard) return "after";
    return "again";
  };
  const orrinCastle = { id: "orrin", map: 1, cardId: "baby-dragon-card" };
  const orrinCliffs = { id: "orrin", map: 4, cardId: "pale-stag-card" };
  const niaShore = { id: "nia", map: 2, cardId: "sunset-jackal-card" };
  const liraShore = { id: "lira", map: 2, cardId: "sunset-jackal-card" };
  const liraCliffs = { id: "lira", map: 4, cardId: "pale-stag-card" };
  const holtHollow = { id: "holt", map: 3, cardId: "cinder-fox-card" };
  const holtHeart = { id: "holt", map: 6, cardId: "heart-wyrm-card" };
  const wrenCastle = { id: "wren", map: 1, cardId: "baby-dragon-card" };
  const wrenCliffs = { id: "wren", map: 4, cardId: "pale-stag-card" };
  const dellShore = { id: "dell", map: 2, cardId: "sunset-jackal-card" };
  const dellHeart = { id: "dell", map: 6, cardId: "heart-wyrm-card" };
  const iskHollow = { id: "isk", map: 3, cardId: "cinder-fox-card" };
  const iskEmber = { id: "isk", map: 5, cardId: "ember-lynx-card" };
  const rowanCastle = { id: "rowan", map: 1, cardId: "baby-dragon-card" };
  const rowanHeart = { id: "rowan", map: 6, cardId: "heart-wyrm-card" };
  assert.equal(talk(orrinCastle, []), "first");
  assert.equal(talk(orrinCastle, []), "again");
  assert.equal(talk(orrinCastle, ["baby-dragon-card"]), "after");
  assert.equal(talk(orrinCliffs, ["baby-dragon-card"]), "first");
  assert.equal(talk(orrinCliffs, ["baby-dragon-card"]), "again");
  assert.equal(talk(orrinCliffs, ["baby-dragon-card", "pale-stag-card"]), "after");
  assert.equal(talk(niaShore, ["sunset-jackal-card-b"]), "first");
  assert.equal(talk(niaShore, ["sunset-jackal-card-b"]), "after");
  assert.equal(talk(liraShore, ["sunset-jackal-card-a"]), "first");
  assert.equal(talk(liraShore, ["sunset-jackal-card-a"]), "after");
  assert.equal(talk(liraCliffs, ["sunset-jackal-card-a"]), "first");
  assert.equal(talk(liraCliffs, ["sunset-jackal-card-a"]), "again");
  assert.equal(talk(liraCliffs, ["pale-stag-card"]), "after");
  assert.equal(talk(holtHollow, []), "first");
  assert.equal(talk(holtHeart, ["heart-wyrm-card"]), "first");
  assert.equal(talk(holtHeart, ["heart-wyrm-card"]), "after");
  assert.equal(talk(wrenCastle, []), "first");
  assert.equal(talk(wrenCastle, ["baby-dragon-card"]), "after");
  assert.equal(talk(wrenCliffs, ["baby-dragon-card"]), "first");
  assert.equal(talk(wrenCliffs, ["baby-dragon-card"]), "again");
  assert.equal(talk(wrenCliffs, ["pale-stag-card"]), "after");
  assert.equal(talk(dellShore, ["sunset-jackal-card-c"]), "first");
  assert.equal(talk(dellShore, ["sunset-jackal-card-c"]), "after");
  assert.equal(talk(dellHeart, []), "first");
  assert.equal(talk(dellHeart, ["heart-wyrm-card"]), "after");
  assert.equal(talk(iskHollow, []), "first");
  assert.equal(talk(iskEmber, ["ember-lynx-card"]), "first");
  assert.equal(talk(iskEmber, ["ember-lynx-card"]), "after");
  assert.equal(talk(rowanCastle, []), "first");
  assert.equal(talk(rowanHeart, ["heart-wyrm-card"]), "first");
  assert.equal(talk(rowanHeart, ["heart-wyrm-card"]), "after");
  const rynCliffs = { id: "ryn", map: 4, cardId: "pale-stag-card" };
  const rynEmber = { id: "ryn", map: 5, cardId: "ember-lynx-card" };
  const edanHeart = { id: "edan", map: 6, cardId: "heart-wyrm-card" };
  assert.equal(talk(rynCliffs, []), "first");
  assert.equal(talk(rynCliffs, ["pale-stag-card"]), "after");
  assert.equal(talk(rynEmber, ["pale-stag-card"]), "first");
  assert.equal(talk(rynEmber, ["pale-stag-card"]), "again");
  assert.equal(talk(rynEmber, ["ember-lynx-card"]), "after");
  assert.equal(talk(edanHeart, []), "first");
  assert.equal(talk(edanHeart, ["heart-wyrm-card"]), "after");
  const haleCliffs = { id: "hale", map: 4, cardId: "pale-stag-card" };
  const haleEmber = { id: "hale", map: 5, cardId: "ember-lynx-card" };
  assert.equal(talk(haleCliffs, []), "first");
  assert.equal(talk(haleCliffs, ["pale-stag-card"]), "after");
  assert.equal(talk(haleEmber, ["pale-stag-card"]), "first");
  assert.equal(talk(haleEmber, ["pale-stag-card"]), "again");
  assert.equal(talk(haleEmber, ["ember-lynx-card"]), "after");
  assert.equal(npcTalkKey(orrinCastle), "orrin:1");
  assert.equal(npcTalkKey(orrinCliffs), "orrin:4");
  assert.equal(npcTalkKey(liraShore), "lira:2");
  assert.equal(npcTalkKey(liraCliffs), "lira:4");
  assert.equal(npcTalkKey(holtHollow), "holt:3");
  assert.equal(npcTalkKey(holtHeart), "holt:6");
  assert.equal(npcTalkKey(wrenCastle), "wren:1");
  assert.equal(npcTalkKey(wrenCliffs), "wren:4");
  assert.equal(npcTalkKey(dellShore), "dell:2");
  assert.equal(npcTalkKey(dellHeart), "dell:6");
  assert.equal(npcTalkKey(iskHollow), "isk:3");
  assert.equal(npcTalkKey(iskEmber), "isk:5");
  assert.equal(npcTalkKey(rowanCastle), "rowan:1");
  assert.equal(npcTalkKey(rowanHeart), "rowan:6");
  assert.equal(npcTalkKey(rynCliffs), "ryn:4");
  assert.equal(npcTalkKey(rynEmber), "ryn:5");
  assert.equal(npcTalkKey(edanHeart), "edan:6");
  assert.equal(npcTalkKey(haleCliffs), "hale:4");
  assert.equal(npcTalkKey(haleEmber), "hale:5");
  assert.notEqual(npcTalkKey(orrinCastle), npcTalkKey(orrinCliffs));
  assert.notEqual(npcTalkKey(liraShore), npcTalkKey(liraCliffs));
  assert.notEqual(npcTalkKey(holtHollow), npcTalkKey(holtHeart));
  assert.notEqual(npcTalkKey(wrenCastle), npcTalkKey(wrenCliffs));
  assert.notEqual(npcTalkKey(dellShore), npcTalkKey(dellHeart));
  assert.notEqual(npcTalkKey(iskHollow), npcTalkKey(iskEmber));
  assert.notEqual(npcTalkKey(rowanCastle), npcTalkKey(rowanHeart));
  assert.notEqual(npcTalkKey(rynCliffs), npcTalkKey(rynEmber));
  assert.notEqual(npcTalkKey(haleCliffs), npcTalkKey(haleEmber));
});

test("new road people stand on existing maps without overlapping talks", () => {
  const placements = [
    { id: "calen", map: 1, x: 820 },
    { id: "orrin", map: 1, x: 2280 },
    { id: "sera", map: 2, x: 480 },
    { id: "nia", map: 2, x: 4360 },
    { id: "bram", map: 3, x: 480 },
    { id: "vess", map: 3, x: 5140 },
    { id: "orrin", map: 4, x: 650 },
    { id: "calen", map: 4, x: 3180 },
    { id: "reed", map: 5, x: 760 },
    { id: "vess", map: 5, x: 2960 },
    { id: "tamsin", map: 1, x: 3980 },
    { id: "tamsin", map: 5, x: 5000 },
    { id: "sera", map: 5, x: 5720 },
    { id: "kest", map: 6, x: 920 },
    { id: "bram", map: 6, x: 1480 },
    { id: "nia", map: 6, x: 3280 },
    { id: "lira", map: 2, x: 2480 },
    { id: "lira", map: 4, x: 4480 },
    { id: "holt", map: 3, x: 3800 },
    { id: "holt", map: 6, x: 3580 },
    { id: "maer", map: 1, x: 5480 },
    { id: "maer", map: 5, x: 3600 },
    { id: "perrin", map: 2, x: 4000 },
    { id: "perrin", map: 5, x: 3260 },
    { id: "wren", map: 1, x: 1200 },
    { id: "wren", map: 4, x: 5200 },
    { id: "dell", map: 2, x: 3680 },
    { id: "dell", map: 6, x: 4180 },
    { id: "isk", map: 3, x: 1820 },
    { id: "isk", map: 5, x: 1770 },
    { id: "rowan", map: 1, x: 4730 },
    { id: "rowan", map: 6, x: 3880 },
    { id: "ryn", map: 4, x: 5565 },
    { id: "ryn", map: 5, x: 5300 },
    { id: "edan", map: 6, x: 4900 },
    { id: "hale", map: 4, x: 4080 },
    { id: "hale", map: 5, x: 4040 },
  ];
  for (const npc of placements) {
    assert.match(game, new RegExp(`id:"${npc.id}",name:"[^"]+",map:${npc.map},x:${npc.x},talkRadius:150`));
  }
  const byMap = new Map();
  for (const npc of placements) {
    const row = byMap.get(npc.map) ?? [];
    row.push(npc);
    byMap.set(npc.map, row);
  }
  for (const [map, row] of byMap) {
    for (let i = 0; i < row.length; i++) {
      for (let j = i + 1; j < row.length; j++) {
        assert.ok(Math.abs(row[i].x - row[j].x) >= 300, `map ${map} talks overlap: ${row[i].id} and ${row[j].id}`);
      }
    }
  }

  const platforms = {
    1: game.match(/const map1Platforms: Platform\[\] = \[([\s\S]*?)\];/)[1],
    2: game.match(/const map2Platforms: Platform\[\] = \[([\s\S]*?)\];/)[1],
    3: game.match(/const map3Platforms: Platform\[\] = \[([\s\S]*?)\];/)[1],
    4: game.match(/const map4Platforms: Platform\[\] = \[([\s\S]*?)\];/)[1],
    5: game.match(/const map5Platforms: Platform\[\] = \[([\s\S]*?)\];/)[1],
    6: game.match(/const map6Platforms: Platform\[\] = \[([\s\S]*?)\];/)[1],
  };
  const parsePlatforms = (block) => [...block.matchAll(/\{x:(-?\d+),y:(\d+),w:(\d+),h:(\d+)\}/g)].map((m) => ({
    x: Number(m[1]), y: Number(m[2]), w: Number(m[3]), h: Number(m[4]),
  }));
  const newcomers = placements.filter((npc) => ["orrin", "nia", "vess", "tamsin", "lira", "holt", "maer", "perrin", "wren", "dell", "isk", "rowan", "ryn", "edan", "hale"].includes(npc.id));
  for (const npc of newcomers) {
    const ground = parsePlatforms(platforms[npc.map]).filter((p) => p.h > 80 && npc.x >= p.x && npc.x <= p.x + p.w);
    assert.ok(ground.length > 0, `${npc.id} on map ${npc.map} is not on solid ground at ${npc.x}`);
  }
});

test("late-map E-talk guides the finish and does not block portals or the altar", () => {
  assert.match(game, /The east gate heals you/);
  assert.match(game, /Press E at the heart altar/);
  assert.match(game, /That ends the campaign/);
  assert.match(game, /const talkTargetAt=\(map:MapId,x:number,footY:number\)=>\{/);
  assert.match(game, /if\(npc&&landmark\) return Math\.abs\(x-landmark\.x\)<=Math\.abs\(x-npc\.x\)/);
  assert.match(game, /const target=talkTargetAt\(map,x,player\.current\.y\+PH\)/);
  const reed = npcBlock("reed", 5);
  const kest = npcBlock("kest", 6);
  const tamsin = npcBlock("tamsin", 5);
  const dell = npcBlock("dell", 6);
  const rowan = npcBlock("rowan", 6);
  const nia = npcBlock("nia", 6);
  const holt = npcBlock("holt", 6);
  for (const block of [reed, kest, tamsin, dell, rowan, nia, holt]) {
    assert.match(block, /altar/i);
  }
  assert.match(reed, /east gate heals/);
  assert.match(kest, /That ends the campaign/);
  assert.match(npcBlock("isk", 5), /The east gate heals you/);
  assert.match(npcBlock("vess", 5), /The east gate heals you/);
  assert.match(npcBlock("maer", 5), /The east gate heals you/);
  assert.match(npcBlock("perrin", 5), /The east gate heals you/);
  assert.match(npcBlock("calen", 4), /The east gate heals you/);
  assert.match(npcBlock("orrin", 4), /The east gate heals you/);
  assert.match(npcBlock("lira", 4), /The east gate heals you/);
  assert.match(npcBlock("wren", 4), /The east gate heals you/);
  const people = [
    { map: 1, x: 820 }, { map: 1, x: 1200 }, { map: 1, x: 2280 }, { map: 1, x: 3980 }, { map: 1, x: 4730 }, { map: 1, x: 5480 },
    { map: 2, x: 480 }, { map: 2, x: 2480 }, { map: 2, x: 3680 }, { map: 2, x: 4000 }, { map: 2, x: 4360 },
    { map: 3, x: 480 }, { map: 3, x: 1820 }, { map: 3, x: 3800 }, { map: 3, x: 5140 },
    { map: 4, x: 650 }, { map: 4, x: 3180 }, { map: 4, x: 4080 }, { map: 4, x: 4480 }, { map: 4, x: 5200 }, { map: 4, x: 5565 },
    { map: 5, x: 760 }, { map: 5, x: 1770 }, { map: 5, x: 2960 }, { map: 5, x: 3260 }, { map: 5, x: 3600 }, { map: 5, x: 4040 }, { map: 5, x: 5000 }, { map: 5, x: 5300 }, { map: 5, x: 5720 },
    { map: 6, x: 920 }, { map: 6, x: 1480 }, { map: 6, x: 3280 }, { map: 6, x: 3580 }, { map: 6, x: 3880 }, { map: 6, x: 4180 }, { map: 6, x: 4900 },
  ];
  const gates = {
    1: [{ x: 7125, r: 145 }],
    2: [{ x: 160, r: 145 }, { x: 5325, r: 145 }],
    3: [{ x: 160, r: 145 }, { x: 5725, r: 145 }],
    4: [{ x: 160, r: 145 }, { x: 5925, r: 145 }],
    5: [{ x: 160, r: 145 }, { x: 6125, r: 145 }],
    6: [{ x: 160, r: 145 }, { x: 6470, r: 200 }],
  };
  for (const npc of people) {
    for (const gate of gates[npc.map]) {
      assert.ok(Math.abs(npc.x - gate.x) >= 150 + gate.r, `map ${npc.map} talk at ${npc.x} blocks gate ${gate.x}`);
    }
  }

  const lateGuides = [
    ["reed", 5], ["sera", 5], ["vess", 5], ["tamsin", 5], ["isk", 5], ["maer", 5], ["perrin", 5], ["hale", 5], ["ryn", 5],
    ["kest", 6], ["bram", 6], ["holt", 6], ["rowan", 6], ["nia", 6], ["dell", 6], ["edan", 6],
  ];
  for (const [id, map] of lateGuides) {
    const first = npcBlock(id, map);
    const firstTalk = first.slice(first.indexOf("firstTalk:["), first.indexOf("againTalk:["));
    assert.match(firstTalk, /the animals are the echo/i, `${id}:${map} firstTalk should name the echo twist`);
    assert.match(firstTalk, /Bind /, `${id}:${map} firstTalk should say to bind`);
    assert.match(firstTalk, /if you still need/, `${id}:${map} firstTalk should bind only if needed`);
    assert.match(firstTalk, /heart altar/, `${id}:${map} firstTalk should name the heart altar`);
    assert.match(firstTalk, /ends the campaign/, `${id}:${map} firstTalk should say the campaign ends`);
    assert.doesNotMatch(firstTalk, /Don't go in cold|Don't go into the heart cold|Bind one, then go east|Bind the wyrm, then go east|road goes dark|stuck|must capture|have to bind/i, `${id}:${map} firstTalk should not softlock a skipped bind`);
    if (map === 5) assert.match(firstTalk, /The east gate heals you/, `${id}:5 firstTalk should say the east gate heals`);
    else assert.match(firstTalk, /The gate behind you still heals/, `${id}:6 firstTalk should say the west gate still heals`);
    const echoHits = firstTalk.match(/the animals are the echo/gi) || [];
    const bindHits = firstTalk.match(/Bind /g) || [];
    const altarHits = firstTalk.match(/heart altar/g) || [];
    const endHits = firstTalk.match(/ends the campaign/g) || [];
    const healHits = firstTalk.match(map === 5 ? /The east gate heals you/g : /The gate behind you still heals/g) || [];
    assert.equal(echoHits.length, 1, `${id}:${map} firstTalk should say the echo once`);
    assert.equal(bindHits.length, 1, `${id}:${map} firstTalk should say bind once`);
    assert.ok(altarHits.length <= 1, `${id}:${map} firstTalk should not restack the altar`);
    assert.equal(endHits.length, 1, `${id}:${map} firstTalk should end the campaign once`);
    assert.equal(healHits.length, 1, `${id}:${map} firstTalk should name the heal gate once`);
  }

  const reedFirst = npcBlock("reed", 5);
  const kestFirst = npcBlock("kest", 6);
  const edanFirst = npcBlock("edan", 6);
  assert.match(reedFirst.slice(reedFirst.indexOf("firstTalk:["), reedFirst.indexOf("againTalk:[")), /Bind a lynx if you still need the heat/);
  assert.match(kestFirst.slice(kestFirst.indexOf("firstTalk:["), kestFirst.indexOf("againTalk:[")), /Bind the wyrm if you still need the pulse/);
  assert.match(edanFirst.slice(edanFirst.indexOf("firstTalk:["), edanFirst.indexOf("againTalk:[")), /Bind the wyrm if you still need the pulse/);
  for (const [id, map] of [["reed", 5], ["kest", 6], ["edan", 6], ["ryn", 4], ["ryn", 5], ["calen", 1], ["calen", 4]]) {
    assert.doesNotMatch(npcBlock(id, map), /Don't go in cold|Don't go into the heart cold|road goes dark|must capture|have to bind|\bstuck\b/i, `${id}:${map} should not imply a skipped bind locks the road`);
  }
});

test("early and mid-road firstTalk quietly teaches the road without map-1 ending dump", () => {
  const early = [
    ["calen", 1], ["wren", 1], ["orrin", 1], ["tamsin", 1], ["rowan", 1], ["maer", 1],
    ["sera", 2], ["lira", 2], ["dell", 2], ["perrin", 2], ["nia", 2],
    ["bram", 3], ["isk", 3], ["holt", 3], ["vess", 3],
    ["orrin", 4], ["calen", 4], ["hale", 4], ["lira", 4], ["wren", 4], ["ryn", 4],
  ];
  for (const [id, map] of early) {
    const block = npcBlock(id, map);
    const firstTalk = block.slice(block.indexOf("firstTalk:["), block.indexOf("againTalk:["));
    assert.match(firstTalk, /the animals are the echo/i, `${id}:${map} firstTalk should name the echo`);
    assert.match(firstTalk, /Bind /, `${id}:${map} firstTalk should say to bind`);
    assert.match(firstTalk, /then go east/, `${id}:${map} firstTalk should send the player east`);
    if (map <= 3) {
      assert.match(firstTalk, /The east portal heals you/, `${id}:${map} firstTalk should say the east portal heals`);
      assert.doesNotMatch(firstTalk, /ends the campaign|heart altar/, `${id}:${map} firstTalk should not dump the ending`);
    } else {
      assert.match(firstTalk, /The east gate heals you/, `${id}:${map} firstTalk should say the east gate heals`);
    }
  }
  const calenCastle = npcBlock("calen", 1);
  const calenFirst = calenCastle.slice(calenCastle.indexOf("firstTalk:["), calenCastle.indexOf("againTalk:["));
  assert.match(calenFirst, /press E, then Q/i);
  assert.doesNotMatch(calenFirst, /Reed|Kest|kiln|wyrm|altar/);
});

test("E-talk radii stay clear of high secrets and each other", () => {
  const npcs = [...game.matchAll(/\{id:"([^"]+)",name:"[^"]+",map:(\d+),x:(\d+),talkRadius:(\d+)/g)].map((m) => ({
    id: m[1], map: Number(m[2]), x: Number(m[3]), r: Number(m[4]),
  }));
  assert.equal(npcs.length, 37);
  for (const npc of npcs) assert.equal(npc.r, 150, `${npc.id}:${npc.map} talkRadius must stay 150`);

  const highSecrets = [
    { map: 1, id: "plaque", x: 2680, r: 120 },
    { map: 1, id: "merlon", x: 6520, r: 120 },
    { map: 2, id: "shell", x: 1515, r: 130 },
    { map: 2, id: "tide", x: 5180, r: 120 },
    { map: 3, id: "hollow", x: 1510, r: 120 },
    { map: 3, id: "nest", x: 4500, r: 120 },
    { map: 4, id: "lichen", x: 2580, r: 120 },
    { map: 5, id: "coal", x: 1480, r: 120 },
    { map: 6, id: "echo", x: 5920, r: 120 },
  ];
  for (const npc of npcs) {
    for (const secret of highSecrets.filter((mark) => mark.map === npc.map)) {
      assert.ok(
        Math.abs(npc.x - secret.x) >= npc.r + secret.r,
        `${npc.id} on map ${npc.map} at ${npc.x} blocks high secret ${secret.id} at ${secret.x}`
      );
    }
  }

  const byMap = new Map();
  for (const npc of npcs) {
    const row = byMap.get(npc.map) ?? [];
    row.push(npc);
    byMap.set(npc.map, row);
  }
  for (const [map, row] of byMap) {
    for (let i = 0; i < row.length; i++) {
      for (let j = i + 1; j < row.length; j++) {
        assert.ok(Math.abs(row[i].x - row[j].x) >= 300, `map ${map} talks overlap: ${row[i].id} and ${row[j].id}`);
      }
    }
  }

  const floorSecrets = [
    { map: 1, id: "groove", x: 3360, r: 130 },
    { map: 2, id: "post", x: 2050, r: 130 },
    { map: 3, id: "cairn", x: 2140, r: 130 },
    { map: 4, id: "notch", x: 980, r: 130 },
    { map: 4, id: "moonwell", x: 2360, r: 140 },
    { map: 5, id: "kiln", x: 2080, r: 140 },
    { map: 5, id: "bellows", x: 2680, r: 130 },
    { map: 6, id: "vein", x: 5620, r: 140 },
    { map: 6, id: "step", x: 1980, r: 130 },
  ];
  for (const npc of npcs) {
    for (const secret of floorSecrets.filter((mark) => mark.map === npc.map)) {
      assert.ok(
        Math.abs(npc.x - secret.x) >= npc.r + secret.r,
        `${npc.id} on map ${npc.map} at ${npc.x} blocks floor secret ${secret.id} at ${secret.x}`
      );
    }
  }

  const altarX = 6470;
  const altarR = 200;
  for (const npc of npcs.filter((person) => person.map === 6)) {
    assert.ok(
      Math.abs(npc.x - altarX) >= npc.r + altarR,
      `${npc.id} on map 6 at ${npc.x} sits in the altar interact range`
    );
  }

  const cardHunts = [
    { map: 1, id: "baby-dragon", min: 1475, max: 1990 },
    { map: 2, id: "jackal-a", min: 720, max: 1280 },
    { map: 2, id: "jackal-b", min: 1580, max: 2280 },
    { map: 2, id: "jackal-c", min: 2520, max: 3320 },
    { map: 3, id: "fox-a", min: 620, max: 1480 },
    { map: 3, id: "fox-b", min: 2100, max: 3300 },
    { map: 4, id: "stag-a", min: 1180, max: 2680 },
    { map: 5, id: "lynx-a", min: 980, max: 1680 },
    { map: 5, id: "lynx-b", min: 1960, max: 2480 },
    { map: 5, id: "lynx-c", min: 4160, max: 4980 },
    { map: 6, id: "heart-wyrm", min: 1880, max: 3180 },
  ];
  for (const npc of npcs) {
    for (const hunt of cardHunts.filter((pack) => pack.map === npc.map)) {
      assert.ok(
        npc.x < hunt.min || npc.x > hunt.max,
        `${npc.id} on map ${npc.map} at ${npc.x} sits in ${hunt.id} card-drop patrol ${hunt.min}-${hunt.max}`
      );
    }
  }
});

test("each map's againTalk quietly points to a nearby studyable with press E", () => {
  const againOf = (id, map) => {
    const block = npcBlock(id, map);
    return block.slice(block.indexOf("againTalk:["), block.indexOf("afterCaptureTalk:["));
  };
  const cues = [
    ["calen", 1, /rain-cut groove/, /Press E there/],
    ["wren", 1, /rain-cut groove/, /Press E there/],
    ["tamsin", 1, /merlon/, /Press E there/],
    ["maer", 1, /merlon/, /Press E there/],
    ["orrin", 1, /plaque higher up/, /Press E there/],
    ["sera", 2, /dusk-shell/, /Press E there/],
    ["lira", 2, /drowned post/, /Press E there/],
    ["perrin", 2, /tide-cut step/, /Press E there if the shore feels thin/],
    ["bram", 3, /cairn/, /Press E there if the stones feel thin/],
    ["vess", 3, /cairn/, /Press E there if the stones feel thin/],
    ["holt", 3, /split cairn/, /Press E there if the stones feel thin/],
    ["isk", 3, /foxfire hollow/, /Press E there/],
    ["orrin", 4, /cliff notch/, /Press E there/],
    ["calen", 4, /moonwell/, /Press E there if the pool feels thin/],
    ["reed", 5, /quiet kiln/, /Press E there/],
    ["isk", 5, /banked coal-bed/, /Press E there/],
    ["vess", 5, /Quiet bellows/, /Press E there/],
    ["hale", 5, /quiet kiln/, /Press E there/],
    ["sera", 5, /quiet kiln/, /Press E there if the heat feels thin/],
    ["tamsin", 5, /quiet kiln/, /Press E there if the fire feels thin/],
    ["maer", 5, /Quiet bellows/, /Press E there if the leftover fire feels thin/],
    ["perrin", 5, /Quiet bellows/, /Press E there if the heat feels thin/],
    ["edan", 6, /echo-stone/, /Press E there/],
    ["kest", 6, /first-step stone/, /Press E there if the pulse feels thin/],
    ["kest", 6, /heart altar/, /Press E at the heart altar/],
    ["edan", 6, /cooled vein/, /Press E at the cooled vein/],
    ["bram", 6, /echo-stone/, /Press E there if the leftover fire feels thin/],
    ["nia", 6, /echo-stone/, /Press E there if the last light feels thin/],
    ["holt", 6, /echo-stone/, /Press E there if the last stones feel thin/],
    ["dell", 6, /echo-stone/, /Press E there if the gold feels thin/],
    ["rowan", 6, /echo-stone/, /Press E there if the leftover road feels thin/],
  ];
  for (const [id, map, secret, press] of cues) {
    const again = againOf(id, map);
    assert.match(again, secret, `${id}:${map} againTalk should name the nearby studyable`);
    assert.match(again, press, `${id}:${map} againTalk should say to press E`);
    const named = [
      /rain-cut groove/i, /plaque/i, /merlon/i, /dusk-shell/i, /drowned post/i, /tide-cut step/i,
      /foxfire hollow/i, /split cairn|the cairn/i, /cliff notch/i, /moonwell/i,
      /quiet kiln/i, /coal-bed/i, /bellows/i, /echo-stone/i, /cooled vein/i, /first-step stone/i,
    ].filter((re) => re.test(again));
    assert.ok(named.length <= 2, `${id}:${map} againTalk should not dump every secret at once`);
  }

  assert.match(againOf("reed", 5), /Bind a lynx if you still need the heat/);
  assert.match(againOf("kest", 6), /Bind the wyrm if you still need the pulse/);
  assert.match(againOf("kest", 6), /first-step stone/);
  assert.match(againOf("kest", 6), /Press E there if the pulse feels thin/);
  assert.match(againOf("edan", 6), /Bind the wyrm if you still need the pulse/);
  assert.match(againOf("edan", 6), /Press E at the cooled vein/);
  assert.match(againOf("hale", 5), /The quiet kiln still sits west\. Press E there if the coals feel thin/);
  assert.match(againOf("sera", 5), /The quiet kiln still sits west\. Press E there if the heat feels thin/);
  assert.match(againOf("tamsin", 5), /The quiet kiln sits west\. Press E there if the fire feels thin/);
  assert.match(againOf("maer", 5), /Quiet bellows sit west\. Press E there if the leftover fire feels thin/);
  assert.match(againOf("perrin", 5), /Quiet bellows sit west\. Press E there if the heat feels thin/);
  assert.match(againOf("bram", 6), /An echo-stone sits farther east\. Press E there if the leftover fire feels thin/);
  assert.match(againOf("nia", 6), /An echo-stone still sits east\. Press E there if the last light feels thin/);
  assert.match(againOf("holt", 6), /An echo-stone sits east\. Press E there if the last stones feel thin/);
  assert.match(againOf("dell", 6), /An echo-stone sits east\. Press E there if the gold feels thin/);
  assert.match(againOf("rowan", 6), /An echo-stone still sits east\. Press E there if the leftover road feels thin/);
  assert.match(againOf("calen", 1), /Press E there if the road feels thin/);
  assert.match(againOf("wren", 1), /Press E there if the signal feels thin/);
  assert.match(againOf("tamsin", 1), /Press E there if the rain feels thin/);
  assert.match(againOf("maer", 1), /Press E there if the rain feels thin/);
  assert.match(againOf("orrin", 1), /Press E there if the rain feels thin/);
  assert.match(againOf("sera", 2), /Press E there if the gold feels thin/);
  assert.match(againOf("lira", 2), /Press E there if the light feels thin/);
  assert.match(againOf("perrin", 2), /Press E there if the shore feels thin/);
  assert.match(againOf("isk", 3), /Press E there if the ash feels thin/);
  assert.match(againOf("orrin", 4), /Press E there if the wind feels thin/);
  assert.doesNotMatch(againOf("bram", 3), /Press E on it/);
  assert.doesNotMatch(againOf("calen", 4), /ends the campaign|Bind the (stag|wyrm)|The east gate heals you/);
  assert.doesNotMatch(againOf("orrin", 4), /ends the campaign|Bind the (stag|wyrm)|The east gate heals you/);
  assert.doesNotMatch(againOf("isk", 5), /ends the campaign|Press E at the (heart )?altar|The east gate heals you/);
  assert.doesNotMatch(againOf("vess", 5), /ends the campaign|Press E at the (heart )?altar|The east gate heals you/);
  assert.doesNotMatch(againOf("hale", 5), /ends the campaign|Press E at the (heart )?altar|The east gate heals you/);
  assert.doesNotMatch(againOf("sera", 5), /ends the campaign|Press E at the (heart )?altar|The east gate heals you/);
  assert.doesNotMatch(againOf("tamsin", 5), /ends the campaign|Press E at the (heart )?altar|The east gate heals you/);
  assert.doesNotMatch(againOf("maer", 5), /ends the campaign|Press E at the (heart )?altar|The east gate heals you/);
  assert.doesNotMatch(againOf("perrin", 5), /ends the campaign|Press E at the (heart )?altar|The east gate heals you/);
  assert.doesNotMatch(againOf("bram", 6), /ends the campaign|Press E at the (heart )?altar|The east gate heals you|The gate behind you still heals/);
  assert.doesNotMatch(againOf("nia", 6), /ends the campaign|Press E at the (heart )?altar|The east gate heals you|The gate behind you still heals/);
  assert.doesNotMatch(againOf("holt", 6), /ends the campaign|Press E at the (heart )?altar|The east gate heals you|The gate behind you still heals/);
  assert.doesNotMatch(againOf("dell", 6), /ends the campaign|Press E at the (heart )?altar|The east gate heals you|The gate behind you still heals/);
  assert.doesNotMatch(againOf("rowan", 6), /ends the campaign|Press E at the (heart )?altar|The east gate heals you|The gate behind you still heals/);
});

test("full-road studyable-pointing againTalk on maps 1–6 still says Press E", () => {
  const againOf = (id, map) => {
    const block = npcBlock(id, map);
    return block.slice(block.indexOf("againTalk:["), block.indexOf("afterCaptureTalk:["));
  };
  const pointers = [
    [/rain-cut groove/i, "groove"],
    [/plaque/i, "plaque"],
    [/dusk-shell/i, "shell"],
    [/drowned post/i, "post"],
    [/\bsplit cairn\b|\bthe cairn\b/i, "cairn"],
    [/foxfire hollow/i, "foxfire"],
    [/cliff notch/i, "notch"],
    [/moonwell/i, "moonwell"],
    [/quiet kiln/i, "kiln"],
    [/banked coal-bed|coal-bed/i, "coal"],
    [/bellows/i, "bellows"],
    [/tide-cut step|first-step stone/i, "step"],
    [/cooled vein/i, "vein"],
    [/echo-stone/i, "echo"],
    [/heart altar|\bthe altar\b/i, "altar"],
  ];
  const npcStart = game.indexOf("const NPCS:Npc[] = [");
  const npcEnd = game.indexOf("];\nconst talkTargetAt=");
  assert.ok(npcStart >= 0 && npcEnd > npcStart, "NPC talk table should stay in game.tsx");
  const hits = [...game.slice(npcStart, npcEnd).matchAll(/\{id:"([^"]+)",name:"[^"]+",map:(\d+),/g)];
  assert.equal(hits.length, 37, "should still have 37 traveler talk tables");
  const found = new Set();
  const misses = [];
  for (const [, id, mapStr] of hits) {
    const map = Number(mapStr);
    assert.ok(map >= 1 && map <= 6, `${id}:${map} should stay on maps 1–6`);
    const again = againOf(id, map);
    const pointed = pointers.filter(([re]) => re.test(again));
    if (!pointed.length) continue;
    if (!/[Pp]ress E/.test(again)) misses.push(`${id}:${map}`);
    for (const [, name] of pointed) found.add(name);
  }
  assert.deepEqual(misses, [], "every studyable-pointing againTalk should say Press E");
  const needed = ["groove", "plaque", "shell", "post", "cairn", "foxfire", "notch", "moonwell", "kiln", "coal", "bellows", "step", "vein", "echo", "altar"];
  assert.deepEqual(needed.filter((name) => !found.has(name)), [], "maps 1–6 againTalk should still cover every studyable pointer");
});

test("maps 4–6 reunion againTalk remembers the last crossing without the finish dump", () => {
  const reunions = [
    ["calen", 4, /castle rain/i],
    ["orrin", 4, /Castle rain, then cliff wind/],
    ["lira", 4, /Shore dusk, then cliff wind/],
    ["wren", 4, /Castle rain, then this cliff/],
    ["sera", 5, /Shore dusk, then this kiln/],
    ["vess", 5, /Cairn twist, then kiln/],
    ["tamsin", 5, /Castle merlon, then kiln road/],
    ["maer", 5, /Castle rain, then kiln road/],
    ["perrin", 5, /Late shore, then kiln road/],
    ["isk", 5, /Cairn twist, then kiln heat/],
    ["ryn", 5, /Cliff wind, then kiln gate/],
    ["hale", 5, /Cliff quiet, then this kiln/],
    ["bram", 6, /Cairn twist, then this heart/],
    ["nia", 6, /Shore dusk, then this heart/],
    ["holt", 6, /Cairn twist, then heart/],
    ["dell", 6, /Shore dusk, then heart/],
    ["rowan", 6, /Castle rain, then heart/],
  ];
  const finishDump = /ends the campaign|Press E at the (heart )?altar|Bind the (stag|wyrm)|The east gate heals you|The gate behind you still heals/;
  for (const [id, map, crossing] of reunions) {
    const block = npcBlock(id, map);
    const again = block.slice(block.indexOf("againTalk:["), block.indexOf("afterCaptureTalk:["));
    assert.match(again, crossing, `${id}:${map} againTalk should remember the last crossing`);
    assert.doesNotMatch(again, finishDump, `${id}:${map} againTalk should not repeat the finish dump`);
  }
});

test("ending-stretch Kest, Edan, and Hale map5 talks keep one last-crossing and a clear altar end", () => {
  const firstOf = (id, map) => {
    const block = npcBlock(id, map);
    return block.slice(block.indexOf("firstTalk:["), block.indexOf("againTalk:["));
  };
  const againOf = (id, map) => {
    const block = npcBlock(id, map);
    return block.slice(block.indexOf("againTalk:["), block.indexOf("afterCaptureTalk:["));
  };
  const campaignDump = /spark, dusk|Castle rain, shore dusk, cairn|named the whole road/;
  const dating = /bondMeter|dating|affection|romance|love you|stay with me|walk out together/;

  assert.match(firstOf("kest", 6), /Rain, then this heart/);
  assert.match(firstOf("kest", 6), /Press E at the heart altar\. That ends the campaign/);
  assert.match(againOf("kest", 6), /Rain to this heart/);
  assert.match(againOf("kest", 6), /Press E at the heart altar\. That ends the campaign/);

  assert.match(firstOf("edan", 6), /He waited west\. I keep the last stone/);
  assert.match(firstOf("edan", 6), /Press E at the heart altar\. That ends the campaign/);
  assert.match(againOf("edan", 6), /last stone/);
  assert.match(againOf("edan", 6), /Press E at the altar\. The campaign ends when the signal rests/);

  assert.match(firstOf("hale", 5), /Cliff quiet, then this kiln/);
  assert.match(firstOf("hale", 5), /Press E at the heart altar\. That ends the campaign/);
  assert.match(againOf("hale", 5), /We meet again\. Cliff quiet, then this kiln/);
  assert.doesNotMatch(againOf("hale", 5), /ends the campaign|Press E at the (heart )?altar|Bind the (stag|wyrm)|The east gate heals you/);

  for (const [id, map] of [["kest", 6], ["edan", 6], ["hale", 5]]) {
    assert.doesNotMatch(firstOf(id, map), campaignDump, `${id}:${map} firstTalk should not dump the whole road`);
    assert.doesNotMatch(againOf(id, map), campaignDump, `${id}:${map} againTalk should not dump the whole road`);
    assert.doesNotMatch(firstOf(id, map), dating, `${id}:${map} firstTalk should stay off dating/bond`);
    assert.doesNotMatch(againOf(id, map), dating, `${id}:${map} againTalk should stay off dating/bond`);
    assert.match(npcBlock(id, map), /Moon Night/);
  }
});

test("Reed, Kest, Edan, Hale, Ryn, Dell, and Rowan again/afterCapture walk out as people without dating or dump", () => {
  const againOf = (id, map) => {
    const block = npcBlock(id, map);
    return block.slice(block.indexOf("againTalk:["), block.indexOf("afterCaptureTalk:["));
  };
  const afterOf = (id, map) => {
    const block = npcBlock(id, map);
    return block.slice(block.indexOf("afterCaptureTalk:["), block.indexOf("palette:"));
  };
  const talkLinesFrom = (src) => [...src.matchAll(/\{speaker:"([^"]+)",text:"((?:\\.|[^"\\])*)"\}/g)].map((m) => ({
    speaker: m[1],
    text: m[2],
  }));
  const dating = /bondMeter|dating|affection|romance|love you|stay with me|walk out together/;
  const campaignDump = /spark, dusk|Castle rain, shore dusk, cairn/;
  const softlock = /road goes dark|must capture|have to bind|Don't go in cold|Don't go into the heart cold|the echo dies|\bstuck\b/;
  const finishDump = /ends the campaign|Press E at the (heart )?altar|Bind the (stag|wyrm)|The east gate heals you|The gate behind you still heals/;

  assert.match(againOf("reed", 5), /When the kiln can rest, we walk out as people/);
  assert.match(afterOf("reed", 5), /When that kiln can rest, we walk out as people/);
  assert.match(againOf("kest", 6), /After that, we walk out as people/);
  assert.match(afterOf("kest", 6), /Come on\. We walk out as people/);
  assert.match(againOf("edan", 6), /When the signal rests, we walk out as people/);
  assert.match(afterOf("edan", 6), /Then we walk out as people\. The last stone can stay empty/);
  assert.match(againOf("hale", 5), /When this kiln can rest, we walk out as people/);
  assert.match(againOf("hale", 5), /We meet again\. Cliff quiet, then this kiln/);
  assert.match(againOf("hale", 5), /The quiet kiln still sits west\. Press E there if the coals feel thin/);
  assert.doesNotMatch(againOf("hale", 5), finishDump);
  assert.match(afterOf("hale", 5), /Then we walk out as people\. This stretch can stay quiet/);
  assert.match(afterOf("hale", 5), /You bound the coal shard\. That's kiln heat the heart can take/);
  assert.match(afterOf("ryn", 5), /Then we walk out as people\. I'll keep this last gate/);
  assert.match(afterOf("ryn", 5), /You bound the coal shard/);
  assert.doesNotMatch(againOf("ryn", 5), /we walk out as people/i);
  assert.match(afterOf("dell", 6), /Then we walk out as people\. The shore can go dark without taking us/);
  assert.match(afterOf("dell", 6), /You bound the last pulse/);
  assert.doesNotMatch(againOf("dell", 6), /we walk out as people/i);
  assert.doesNotMatch(againOf("dell", 6), finishDump);
  assert.match(afterOf("rowan", 6), /Then we walk out as people\. The leftover road can go quiet/);
  assert.match(afterOf("rowan", 6), /You bound the last pulse/);
  assert.doesNotMatch(againOf("rowan", 6), /we walk out as people/i);
  assert.doesNotMatch(againOf("rowan", 6), finishDump);

  for (const [id, map] of [["reed", 5], ["kest", 6], ["edan", 6], ["hale", 5]]) {
    for (const [label, talk] of [["again", againOf(id, map)], ["after", afterOf(id, map)]]) {
      assert.match(talk, /we walk out as people/i, `${id}:${map} ${label}Talk should walk out as people`);
      assert.doesNotMatch(talk, dating, `${id}:${map} ${label}Talk should stay off dating/bond`);
      assert.doesNotMatch(talk, campaignDump, `${id}:${map} ${label}Talk should not dump the whole road`);
      assert.doesNotMatch(talk, softlock, `${id}:${map} ${label}Talk should not softlock a skipped bind`);
      const lines = talkLinesFrom(talk);
      assert.deepEqual(lines.filter((line) => line.text.length > 110), [], `${id}:${map} ${label}Talk lines should stay at or under 110 characters`);
    }
    assert.match(npcBlock(id, map), /Moon Night/);
  }
  for (const [id, map, talk] of [["ryn", 5, afterOf("ryn", 5)], ["dell", 6, afterOf("dell", 6)], ["rowan", 6, afterOf("rowan", 6)]]) {
    assert.match(talk, /we walk out as people/i, `${id}:${map} afterTalk should walk out as people`);
    assert.doesNotMatch(talk, dating, `${id}:${map} afterTalk should stay off dating/bond`);
    assert.doesNotMatch(talk, campaignDump, `${id}:${map} afterTalk should not dump the whole road`);
    assert.doesNotMatch(talk, softlock, `${id}:${map} afterTalk should not softlock a skipped bind`);
    assert.doesNotMatch(talk, /walk out together/);
    assert.deepEqual(talkLinesFrom(talk).filter((line) => line.text.length > 110), [], `${id}:${map} afterTalk lines should stay at or under 110 characters`);
  }
});

test("firstTalk openings keep one distinct tell per traveler", () => {
  const openingOf = (id, map) => {
    const block = npcBlock(id, map);
    const firstTalk = block.slice(block.indexOf("firstTalk:["), block.indexOf("againTalk:["));
    const match = firstTalk.match(/\{speaker:"([^"]+)",text:"((?:\\.|[^"\\])*)"\}/);
    assert.ok(match, `${id}:${map} should open firstTalk with a speaker line`);
    assert.equal(match[1], id[0].toUpperCase() + id.slice(1), `${id}:${map} should open as themselves`);
    assert.ok(match[2].length <= 110, `${id}:${map} opening should stay readable`);
    return match[2];
  };

  const roster = [
    ["reed", 5, /coals.*bite|bite.*coals/i],
    ["kest", 6, /heard you in the signal/i],
    ["calen", 1, /rain since dusk/i],
    ["calen", 4, /cliff wind.*watch/i],
    ["sera", 2, /threes on the sand/i],
    ["sera", 5, /three on the shore/i],
    ["bram", 3, /ash in the lungs/i],
    ["bram", 6, /ash in the lungs/i],
    ["orrin", 1, /rain writes|copy it/i],
    ["orrin", 4, /writes in moonwater|copy that line/i],
    ["nia", 2, /light dies slow/i],
    ["nia", 6, /last light I followed/i],
    ["vess", 3, /ash in the writing|read the cairn/i],
    ["vess", 5, /read the ash/i],
    ["tamsin", 1, /east wall still watches|merlon/i],
    ["tamsin", 5, /merlon standing/i],
    ["lira", 2, /I count dusk/i],
    ["lira", 4, /I count this pool/i],
    ["holt", 3, /twist stays honest/i],
    ["holt", 6, /stay honest/i],
    ["maer", 1, /leftover rain|rain keeps walking/i],
    ["maer", 5, /leftover rain walked me/i],
    ["perrin", 2, /late sand|does not strand/i],
    ["perrin", 5, /late coals|nobody strands/i],
    ["wren", 1, /rain speaks if you stand still/i],
    ["wren", 4, /well still speaks if you stand still/i],
    ["dell", 2, /gold thins and then holds/i],
    ["dell", 6, /gold holds even here/i],
    ["isk", 3, /ash in the breath/i],
    ["isk", 5, /banked breath/i],
    ["rowan", 1, /leftover road/i],
    ["rowan", 6, /leftover road/i],
    ["ryn", 4, /keep this last cliff gate/i],
    ["ryn", 5, /still keep the gate/i],
    ["edan", 6, /wait by the last stone/i],
    ["hale", 4, /forgets you between watches/i],
    ["hale", 5, /kiln forgets the quiet cliff/i],
  ];

  const openings = [];
  for (const [id, map, tell] of roster) {
    const opening = openingOf(id, map);
    assert.match(opening, tell, `${id}:${map} opening should keep their tell`);
    assert.doesNotMatch(opening, /The \w+ ended\. The \w+ didn't/, `${id}:${map} should not reuse the ended/didn't template`);
    openings.push(opening);
  }

  assert.equal(new Set(openings).size, openings.length, "each firstTalk opening should be a distinct line");

  const tells = {
    reed: /bite/i,
    kest: /signal/i,
    calen: /watch|rain|wind/i,
    sera: /three/i,
    bram: /lungs/i,
    orrin: /writ|copy/i,
    nia: /light/i,
    vess: /read/i,
    tamsin: /wall|merlon/i,
    lira: /count/i,
    holt: /honest/i,
    maer: /leftover rain/i,
    perrin: /late |strand/i,
    wren: /stand still/i,
    dell: /holds/i,
    isk: /breath/i,
    rowan: /leftover road/i,
    ryn: /gate/i,
    edan: /last stone/i,
    hale: /forget/i,
  };
  for (const [id, tell] of Object.entries(tells)) {
    const theirs = roster.filter((row) => row[0] === id);
    for (const [name, map] of theirs) {
      assert.match(openingOf(name, map), tell, `${name}:${map} should keep the same tell`);
    }
  }
});

test("afterCaptureTalk treats bound animals as echo shards, not quarry", () => {
  const afterBlocks = [...game.matchAll(/afterCaptureTalk:\[([\s\S]*?)\],\n\s*palette:/g)].map((m) => m[1]);
  assert.equal(afterBlocks.length, 37);
  for (const block of afterBlocks) {
    assert.doesNotMatch(block, /\bhunt(?:ing|s)?\b|\bkill(?:ed|s|ing)?\b/i);
    assert.doesNotMatch(block, /Castle rain, shore|the animals are the echo —|Spark, dusk, leftover|cairn twist —/);
  }
  assert.match(game, /That dragon wasn't quarry\. It was the first spark of the signal/);
  assert.match(game, /the signal isn't quarry\. We're carrying it/);
  assert.match(game, /Shards, not quarry/);
  assert.match(game, /Each bound animal is a shard/);
});

test("afterCaptureTalk gives each map bind a distinct echo-shard flavor", () => {
  const afterOf = (id, map) => {
    const block = npcBlock(id, map);
    return block.slice(block.indexOf("afterCaptureTalk:["), block.indexOf("palette:"));
  };
  const roster = [
    [1, ["calen", "orrin", "tamsin", "maer", "wren", "rowan"], /first spark/i, /rain/i],
    [2, ["sera", "nia", "lira", "perrin", "dell"], /dusk/i, /dusk shard|dusk of the signal|took the dusk/i],
    [3, ["bram", "vess", "holt", "isk"], /leftover fire|foxfire|cairn/i, /leftover fire|foxfire/i],
    [4, ["calen", "orrin", "hale", "lira", "wren", "ryn"], /pool|moonwell/i, /pool|moonwell/i],
    [5, ["reed", "sera", "vess", "tamsin", "maer", "perrin", "isk", "ryn", "hale"], /kiln heat|last heat|coal shard|coal pelt/i, /heat|coal/i],
    [6, ["kest", "bram", "nia", "holt", "dell", "rowan", "edan"], /pulse/i, /last pulse|Heart Wyrm/i],
  ];
  const endingDump = /ends the campaign|Press E at the (heart )?altar/;
  const otherShards = {
    1: /dusk shard|leftover-fire shard|pool shard|coal shard|last pulse/,
    2: /first spark|leftover-fire shard|pool shard|coal shard|last pulse/,
    3: /first spark|dusk shard|pool shard|coal shard|last pulse/,
    4: /first spark|dusk shard|leftover-fire shard|coal shard|last pulse/,
    5: /first spark|dusk shard|pool shard|last pulse/,
    6: /first spark|dusk shard|leftover-fire shard|pool shard|coal shard/,
  };

  for (const [map, ids, flavor, shard] of roster) {
    for (const id of ids) {
      const after = afterOf(id, map);
      assert.match(after, flavor, `${id}:${map} afterCapture should keep this bind's flavor`);
      assert.match(after, shard, `${id}:${map} afterCapture should name this bind's shard`);
      assert.doesNotMatch(after, otherShards[map], `${id}:${map} afterCapture should not borrow other binds' shards`);
      if (map <= 4) {
        assert.doesNotMatch(after, endingDump, `${id}:${map} afterCapture should not dump the heart-altar ending`);
      }
    }
  }
});

test("Reed, Kest, and Hale afterCapture keep kiln heat and heart pulse on one road", () => {
  const afterOf = (id, map) => {
    const block = npcBlock(id, map);
    return block.slice(block.indexOf("afterCaptureTalk:["), block.indexOf("palette:"));
  };
  const talkLinesFrom = (src) => [...src.matchAll(/\{speaker:"([^"]+)",text:"((?:\\.|[^"\\])*)"\}/g)].map((m) => ({
    speaker: m[1],
    text: m[2],
  }));

  const reed = afterOf("reed", 5);
  const kest = afterOf("kest", 6);
  const haleKiln = afterOf("hale", 5);
  const haleCliff = afterOf("hale", 4);

  assert.match(reed, /That lynx was the last heat the echo could keep without going out/);
  assert.match(reed, /You are carrying kiln heat\. The heart can take that warmth/);
  assert.match(reed, /tell Kest I didn't quit the kiln/);
  assert.match(reed, /The east gate heals you\. Talk to Kest/);
  assert.doesNotMatch(reed, /pet|quit the fire|last pulse/);

  assert.match(kest, /The wyrm is the last pulse\. Rest it at the altar so Reed's kiln can rest/);
  assert.match(kest, /You named the whole road in shards\. The pulse is the last name/);
  assert.match(kest, /The road remembers us now, Moon Night/);
  assert.match(kest, /Then we walk it together/);
  assert.doesNotMatch(kest, /coal shard|kiln heat so the heart stays warm/);

  assert.match(haleKiln, /You bound the coal shard\. That's kiln heat the heart can take/);
  assert.match(haleKiln, /The wind can forget the cliff now\. The kiln heat remembers/);
  assert.match(haleKiln, /The east gate heals you\. Talk to Kest\. Press E at the heart altar/);
  assert.doesNotMatch(haleKiln, /last pulse|quit the fire/);

  assert.match(haleCliff, /You bound the pool shard/);
  assert.match(haleCliff, /Reed's kiln is through it/);
  assert.doesNotMatch(haleCliff, /ends the campaign|Press E at the \(heart \)?altar|last pulse|coal shard/);

  for (const [id, map, block] of [["reed", 5, reed], ["kest", 6, kest], ["hale", 5, haleKiln], ["hale", 4, haleCliff]]) {
    const lines = talkLinesFrom(block);
    assert.ok(lines.length >= 3, `${id}:${map} afterCapture should still have a short road`);
    const overlong = lines.filter((line) => line.text.length > 110);
    assert.deepEqual(overlong, [], `${id}:${map} afterCapture lines should stay at or under 110 characters`);
    assert.ok(lines.every((line) => line.speaker === "Moon Night" || line.speaker === id[0].toUpperCase() + id.slice(1)));
    assert.doesNotMatch(block, /bondMeter|dating|affection|romance|love you|stay with me|walk out together/);
  }
});
