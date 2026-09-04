import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const game = await readFile(new URL("../app/game.tsx", import.meta.url), "utf8");
const campaign = await readFile(new URL("../lib/campaign.ts", import.meta.url), "utf8");

function npcBlock(id, map) {
  const re = new RegExp(`\\{id:"${id}",name:"[^"]+",map:${map},`);
  const at = game.search(re);
  assert.ok(at >= 0, `missing ${id} on map ${map}`);
  return game.slice(at, at + 2400);
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

  for (const block of [calenCastle, calenCliffs, seraShore, seraEmber, bramHollow, bramHeart, orrinCastle, orrinCliffs, niaShore, niaHeart, vessHollow, vessEmber, tamsinCastle, tamsinEmber, liraShore, liraCliffs, holtHollow, holtHeart, maerCastle, maerEmber, perrinShore, perrinEmber, wrenCastle, wrenCliffs, dellShore, dellHeart, iskHollow, iskEmber, rowanCastle, rowanHeart, rynCliffs, rynEmber, edanHeart]) {
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
  assert.notEqual(npcTalkKey(orrinCastle), npcTalkKey(orrinCliffs));
  assert.notEqual(npcTalkKey(liraShore), npcTalkKey(liraCliffs));
  assert.notEqual(npcTalkKey(holtHollow), npcTalkKey(holtHeart));
  assert.notEqual(npcTalkKey(wrenCastle), npcTalkKey(wrenCliffs));
  assert.notEqual(npcTalkKey(dellShore), npcTalkKey(dellHeart));
  assert.notEqual(npcTalkKey(iskHollow), npcTalkKey(iskEmber));
  assert.notEqual(npcTalkKey(rowanCastle), npcTalkKey(rowanHeart));
  assert.notEqual(npcTalkKey(rynCliffs), npcTalkKey(rynEmber));
});

test("new road people stand on existing maps without overlapping talks", () => {
  const placements = [
    { id: "calen", map: 1, x: 820 },
    { id: "orrin", map: 1, x: 2280 },
    { id: "sera", map: 2, x: 480 },
    { id: "nia", map: 2, x: 1180 },
    { id: "bram", map: 3, x: 480 },
    { id: "vess", map: 3, x: 5140 },
    { id: "orrin", map: 4, x: 1680 },
    { id: "calen", map: 4, x: 3180 },
    { id: "reed", map: 5, x: 760 },
    { id: "vess", map: 5, x: 2380 },
    { id: "tamsin", map: 1, x: 3980 },
    { id: "tamsin", map: 5, x: 4880 },
    { id: "sera", map: 5, x: 5720 },
    { id: "kest", map: 6, x: 920 },
    { id: "bram", map: 6, x: 1480 },
    { id: "nia", map: 6, x: 3280 },
    { id: "lira", map: 2, x: 2480 },
    { id: "lira", map: 4, x: 4480 },
    { id: "holt", map: 3, x: 2640 },
    { id: "holt", map: 6, x: 2260 },
    { id: "maer", map: 1, x: 5480 },
    { id: "maer", map: 5, x: 3600 },
    { id: "perrin", map: 2, x: 4000 },
    { id: "perrin", map: 5, x: 3080 },
    { id: "wren", map: 1, x: 1550 },
    { id: "wren", map: 4, x: 5200 },
    { id: "dell", map: 2, x: 3240 },
    { id: "dell", map: 6, x: 4180 },
    { id: "isk", map: 3, x: 1560 },
    { id: "isk", map: 5, x: 1570 },
    { id: "rowan", map: 1, x: 4730 },
    { id: "rowan", map: 6, x: 2770 },
    { id: "ryn", map: 4, x: 5565 },
    { id: "ryn", map: 5, x: 5300 },
    { id: "edan", map: 6, x: 4900 },
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
  const newcomers = placements.filter((npc) => ["orrin", "nia", "vess", "tamsin", "lira", "holt", "maer", "perrin", "wren", "dell", "isk", "rowan", "ryn", "edan"].includes(npc.id));
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
    { map: 1, x: 820 }, { map: 1, x: 1550 }, { map: 1, x: 2280 }, { map: 1, x: 3980 }, { map: 1, x: 4730 }, { map: 1, x: 5480 },
    { map: 2, x: 480 }, { map: 2, x: 1180 }, { map: 2, x: 2480 }, { map: 2, x: 3240 }, { map: 2, x: 4000 },
    { map: 3, x: 480 }, { map: 3, x: 1560 }, { map: 3, x: 2640 }, { map: 3, x: 5140 },
    { map: 4, x: 1680 }, { map: 4, x: 3180 }, { map: 4, x: 4480 }, { map: 4, x: 5200 }, { map: 4, x: 5565 },
    { map: 5, x: 760 }, { map: 5, x: 1570 }, { map: 5, x: 2380 }, { map: 5, x: 3080 }, { map: 5, x: 3600 }, { map: 5, x: 4880 }, { map: 5, x: 5300 }, { map: 5, x: 5720 },
    { map: 6, x: 920 }, { map: 6, x: 1480 }, { map: 6, x: 2260 }, { map: 6, x: 2770 }, { map: 6, x: 3280 }, { map: 6, x: 4180 }, { map: 6, x: 4900 },
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
});
