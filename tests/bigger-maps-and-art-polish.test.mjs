import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const game = await readFile(new URL("../app/game.tsx", import.meta.url), "utf8");
const campaign = await readFile(new URL("../lib/campaign.ts", import.meta.url), "utf8");

const TARGETS = {
  1: { width: [6800, 7200], old: 5200 },
  2: { width: [5000, 5400], old: 3600 },
  3: { width: [5600, 6000], old: 4000 },
  4: { width: [5800, 6200], old: 4200 },
  5: { width: [6000, 6400], old: 4400 },
  6: { width: [6400, 6800], old: 4800 },
};

function parseConst(name) {
  const match = game.match(new RegExp(`const ${name} = (-?\\d+)`));
  assert.ok(match, `missing ${name}`);
  return Number(match[1]);
}

function parseCampaignWidth(id) {
  const match = campaign.match(new RegExp(`id: ${id},[\\s\\S]*?width: (\\d+)`));
  assert.ok(match, `campaign map ${id} width`);
  return Number(match[1]);
}

function parseCampaignExit(id) {
  const block = campaign.match(new RegExp(`id: ${id},[\\s\\S]*?exitPortalX: ([^\\n]+)`));
  assert.ok(block, `campaign map ${id} exit`);
  return block[1].trim() === "null" ? null : Number(block[1]);
}

function parsePlatformBlock(name) {
  const match = game.match(new RegExp(`const ${name}: Platform\\[\\] = \\[([\\s\\S]*?)\\];`));
  assert.ok(match, `missing ${name}`);
  const plats = [...match[1].matchAll(/\{x:(-?\d+),y:(-?\d+),w:(-?\d+),h:(-?\d+)\}/g)].map((m) => ({
    x: Number(m[1]), y: Number(m[2]), w: Number(m[3]), h: Number(m[4]),
  }));
  assert.ok(plats.length > 0, `${name} should list platforms`);
  return plats;
}

function groundCoverage(plats, width) {
  const strips = plats.filter((p) => p.h > 80).sort((a, b) => a.x - b.x);
  let x = 0;
  for (const p of strips) {
    if (p.x > x + 1) return { ok: false, gapAt: x, next: p.x, coveredTo: x };
    x = Math.max(x, p.x + p.w);
  }
  return { ok: x >= width - 1, coveredTo: x };
}

test("maps 1–6 are bigger roam spaces with east portals near the new edges", () => {
  const widths = {
    1: parseConst("MAP1_W"),
    2: parseConst("MAP2_W"),
    3: parseConst("MAP3_W"),
    4: parseConst("MAP4_W"),
    5: parseConst("MAP5_W"),
    6: parseConst("MAP6_W"),
  };
  const portals = {
    1: parseConst("MAP1_PORTAL_X"),
    2: parseConst("MAP2_EXIT_X"),
    3: parseConst("MAP3_EXIT_X"),
    4: parseConst("MAP4_EXIT_X"),
    5: parseConst("MAP5_EXIT_X"),
  };

  for (const id of [1, 2, 3, 4, 5, 6]) {
    const width = parseCampaignWidth(id);
    const [lo, hi] = TARGETS[id].width;
    assert.equal(width, widths[id]);
    assert.ok(width >= lo && width <= hi, `map ${id} width ${width} should be ${lo}–${hi}`);
    assert.ok(width > TARGETS[id].old, `map ${id} should grow past ${TARGETS[id].old}`);
  }

  assert.equal(parseCampaignExit(1), portals[1]);
  assert.equal(parseCampaignExit(2), portals[2]);
  assert.equal(parseCampaignExit(3), portals[3]);
  assert.equal(parseCampaignExit(4), portals[4]);
  assert.equal(parseCampaignExit(5), portals[5]);
  assert.equal(parseCampaignExit(6), null);

  for (const id of [1, 2, 3, 4, 5]) {
    const margin = widths[id] - portals[id];
    assert.ok(margin >= 100 && margin <= 180, `map ${id} portal margin ${margin} should sit near the east edge`);
  }

  const heartX = parseConst("MAP6_HEART_X");
  const heartMargin = widths[6] - heartX;
  assert.ok(heartMargin >= 100 && heartMargin <= 180, `map 6 heart margin ${heartMargin}`);
  assert.equal(parseConst("MAP2_PORTAL_X"), 105);
  assert.equal(parseConst("MAP3_ENTRY_X"), 105);
});

test("new eastern ground is walkable and existing secret ledges stay in place", () => {
  const blocks = {
    1: parsePlatformBlock("map1Platforms"),
    2: parsePlatformBlock("map2Platforms"),
    3: parsePlatformBlock("map3Platforms"),
    4: parsePlatformBlock("map4Platforms"),
    5: parsePlatformBlock("map5Platforms"),
    6: parsePlatformBlock("map6Platforms"),
  };
  const widths = {
    1: parseConst("MAP1_W"),
    2: parseConst("MAP2_W"),
    3: parseConst("MAP3_W"),
    4: parseConst("MAP4_W"),
    5: parseConst("MAP5_W"),
    6: parseConst("MAP6_W"),
  };

  for (const id of [1, 2, 3, 4, 5, 6]) {
    const cover = groundCoverage(blocks[id], widths[id]);
    assert.ok(cover.ok, `map ${id} ground should cover 0–${widths[id]} (coveredTo=${cover.coveredTo}, gapAt=${cover.gapAt})`);
    assert.ok(blocks[id].some((p) => p.h > 80 && p.x + p.w > TARGETS[id].old), `map ${id} should add ground in the new east`);
    assert.ok(blocks[id].some((p) => p.h <= 24 && p.x > TARGETS[id].old), `map ${id} should add mid-height ledges in the new stretch`);
  }

  assert.match(game, /\{x:1418,y:498,w:160,h:18\}/);
  assert.match(game, /\{x:1515,y:430,w:155,h:18\}/);
  assert.match(game, /\{x:1510,y:418,w:200,h:18\}/);
  assert.match(game, /\{x:1480,y:440,w:170,h:18\}/);
  assert.match(game, /\{x:4120,y:430,w:180,h:18\}/);
  assert.match(game, /\{x:4520,y:430,w:170,h:18\}/);
  assert.match(game, /\{x:3380,y:432,w:160,h:18\}/);
  assert.match(game, /\{x:2580,y:440,w:170,h:18\}/);
});

test("spawn helpers and camera still use the live map widths", () => {
  const map1W = parseCampaignWidth(1);
  const map5W = parseCampaignWidth(5);
  assert.match(campaign, /if \(from === null\) return 230;/);
  assert.match(campaign, /if \(data\.prevMap === from\) return 340;/);
  assert.match(campaign, /if \(data\.nextMap === from\) return Math\.max\(240, data\.width - 340\);/);
  assert.equal(map1W - 340, 6660);
  assert.equal(map5W - 340, 5860);
  assert.match(game, /if\(map===1\) return \{x:MAP1_W-340,y:483,facing:-1 as 1\|-1\}/);
  assert.match(game, /return \{x:Math\.max\(240,worldWidthFor\(map\)-340\),y:498,facing:-1 as 1\|-1\}/);
  assert.match(game, /pl\.x=clamp\(pl\.x\+pl\.vx\*dt,24,activeWorldW-24\)/);
  assert.match(game, /const cameraTarget=clamp\(pl\.x-w\/scale\*\.38,0,Math\.max\(0,activeWorldW-w\/scale\)\)/);
  assert.doesNotMatch(game, /x:4860/);
});

test("packs are re-spaced across the wider maps and extras stay in gaps", () => {
  assert.match(game, /createJackal\("sunset-jackal-a",1100,780,1520\)/);
  assert.match(game, /createJackal\("sunset-jackal-b",2480,1980,2920\)/);
  assert.match(game, /createJackal\("sunset-jackal-scout",3300,3160,3420\)/);
  assert.match(game, /createJackal\("sunset-jackal-c",4100,3560,4820\)/);
  assert.match(game, /createBeast\("ash-roost",6000,5780,6320/);
  assert.match(game, /createBeast\("cinder-fox-a",1100,700,1780/);
  assert.match(game, /createBeast\("cinder-fox-c",2360,2120,2580/);
  assert.match(game, /createBeast\("cinder-fox-b",3900,3000,5100/);
  assert.match(game, /createBeast\("pale-stag-a",2100,1280,3380/);
  assert.match(game, /createBeast\("pale-stag-b",4980,4680,5460/);
  assert.match(game, /createBeast\("ember-lynx-d",3620,3440,3800/);
  assert.match(game, /createBeast\("ember-lynx-c",4700,4040,5600/);
  assert.match(game, /createBeast\("heart-wyrm",3400,2400,4600/);
  assert.match(game, /const DRAGON_CHASE_MAX = 5600/);
  assert.match(game, /const EXTRA_CHASE_LEEWAY = 360/);
  assert.match(game, /const COMPANION_HUNT_RANGE = 520/);
  assert.match(game, /pl\.health=pl\.maxHealth;staminaRef\.current=MAX_STAMINA/);
});

test("ART_DIRECTION volume polish stays 2D pixel-art, not a 3D rebuild", () => {
  assert.match(game, /const mapLightFor = \(map:MapId\):MapLight/);
  assert.match(game, /const paintSpriteVolume=/);
  assert.match(game, /volumeCtx\.globalCompositeOperation="source-atop"/);
  assert.match(game, /paintSpriteVolume\(knight,/);
  assert.match(game, /paintSpriteVolume\(dragonImage,/);
  assert.match(game, /const light=mapLightFor\(mapRef\.current\)/);
  assert.match(game, /ctx\.fillStyle="rgba\(0,0,0,\.2\)";ctx\.beginPath\(\);ctx\.ellipse\(1,-1,bodyW\*\.62,bodyH\*\.42/);
  assert.match(game, /const cloak=ctx\.createLinearGradient\(light\.fromLeft\?-16:16/);
  assert.match(game, /const capEdge=map===1\?"#141c28"/);
  assert.match(game, /const idleBob=pl\.grounded&&Math\.abs\(pl\.vx\)<28/);
  assert.doesNotMatch(game, /WebGL|THREE\.|three\.js|new THREE/);
  assert.doesNotMatch(game, /gltf|GLTFLoader|babylon/i);
});

test("locks held: Moon Night, no romance, Map 1 radio/buildings stay cut, people/E-talk untouched", () => {
  assert.match(game, /const PLAYER_NAME = "Moon Night"/);
  assert.match(campaign, /PLAYER_DISPLAY_NAME = "Moon Night"/);
  assert.doesNotMatch(game, /Moon Knight/);
  assert.doesNotMatch(campaign, /Moon Knight/);
  assert.doesNotMatch(game, /bondMeter|affectionMeter|loveInterest|heartMeter|romanceChoice|dialogueChoice|dating sim/);
  assert.doesNotMatch(campaign, /bondMeter|loveInterest|romanceChoice/);
  assert.doesNotMatch(game, /radio encounter|The radio |tune the radio|listen to the radio|drawBuilding|restoreRadio/i);
  assert.doesNotMatch(campaign, /radio encounter|tune the radio/i);
  assert.doesNotMatch(game, /map:\s*7|Map 7|MAP7_/);

  const npcIds = [...game.matchAll(/\{id:"(reed|kest|calen|sera|bram)",name:"[^"]+",map:(\d+)/g)].map((m) => `${m[1]}:${m[2]}`);
  assert.deepEqual(npcIds, ["reed:5", "kest:6", "calen:1", "calen:4", "sera:2", "sera:5", "bram:3", "bram:6"]);
  assert.equal([...game.matchAll(/firstTalk:\[/g)].length, 8);
  assert.equal([...game.matchAll(/againTalk:\[/g)].length, 8);
  assert.equal([...game.matchAll(/afterCaptureTalk:\[/g)].length, 8);
  assert.match(game, /I left the castle rain for this watch/);
  assert.match(game, /We keep crossing roads/);
  assert.match(game, /We meet at the last echo/);
  assert.match(game, /k==="q"&&!e\.repeat/);
  assert.match(game, /"Pick up "\+otherWildCard\.name\+" card"/);
});
