import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const game = await readFile(new URL("../app/game.tsx", import.meta.url), "utf8");
const campaign = await readFile(new URL("../lib/campaign.ts", import.meta.url), "utf8");

const talkLinesFrom = (src) => [...src.matchAll(/\{(?:speaker|"speaker"):\s*"([^"]+)",\s*(?:text|"text"):\s*"((?:\\.|[^"\\])*)"\s*\}/g)].map((m) => ({
  speaker: m[1],
  text: m[2].replace(/\\"/g, '"'),
}));

const num = (re, label) => {
  const match = game.match(re);
  assert.ok(match, `missing ${label}`);
  return Number(match[1]);
};

const npcStart = game.indexOf("const NPCS:Npc[] = [");
const npcEnd = game.indexOf("];\nconst talkTargetAt=");
assert.ok(npcStart >= 0 && npcEnd > npcStart, "NPC talk table should stay in game.tsx");
const npcTable = game.slice(npcStart, npcEnd);

const sliceTalk = (block, from, to) => {
  const start = block.indexOf(from);
  const end = block.indexOf(to);
  assert.ok(start >= 0 && end > start, `missing ${from} .. ${to}`);
  return block.slice(start, end);
};

const npcs = [...npcTable.matchAll(/\{id:"([^"]+)",name:"([^"]+)",map:(\d+),x:(\d+),talkRadius:(\d+)/g)].map((m, index) => {
  const next = npcTable.indexOf("\n  {id:", m.index + 1);
  const block = npcTable.slice(m.index, next === -1 ? npcTable.length : next);
  return {
    id: m[1],
    name: m[2],
    map: Number(m[3]),
    x: Number(m[4]),
    r: Number(m[5]),
    block,
    firstTalk: sliceTalk(block, "firstTalk:[", "againTalk:["),
    againTalk: sliceTalk(block, "againTalk:[", "afterCaptureTalk:["),
    afterCaptureTalk: sliceTalk(block, "afterCaptureTalk:[", "palette:"),
    index,
  };
});

const ALLOWED = new Set([
  "Moon Night", "Reed", "Kest", "Calen", "Sera", "Bram", "Orrin", "Nia", "Vess",
  "Tamsin", "Lira", "Holt", "Maer", "Perrin", "Wren", "Dell", "Isk", "Rowan", "Ryn", "Edan", "Hale",
]);
const SOFTLOCK = /road goes dark|must capture|have to bind|Don't go in cold|Don't go into the heart cold|the echo dies|\bstuck\b|you must bind|can't leave without|won't open until you bind/i;
const FINISH_DUMP = /ends the campaign|Press E at the (heart )?altar|Bind the (stag|wyrm)|The east gate heals you|The gate behind you still heals/;
const CINEMATIC = /each was a shard of the same fading call/;
const STUDYABLES = {
  1: [
    [/rain-cut groove/i, "groove"],
    [/\bplaque\b/i, "plaque"],
    [/\bmerlon\b/i, "merlon"],
  ],
  2: [
    [/dusk-shell/i, "shell"],
    [/drowned post/i, "post"],
    [/tide-cut step/i, "tide"],
  ],
  3: [
    [/foxfire hollow/i, "foxfire"],
    [/\bsplit cairn\b|\bthe cairn\b/i, "cairn"],
    [/charred nest/i, "nest"],
  ],
  4: [
    [/moonwell/i, "moonwell"],
    [/cliff notch/i, "notch"],
    [/pale lichen/i, "lichen"],
  ],
  5: [
    [/quiet kiln/i, "kiln"],
    [/banked coal-bed|coal-bed/i, "coal"],
    [/\bbellows\b/i, "bellows"],
  ],
  6: [
    [/first-step stone/i, "step"],
    [/cooled vein/i, "vein"],
    [/echo-stone/i, "echo"],
    [/heart altar|\bthe altar\b/i, "altar"],
  ],
};

test("E-talk stays Moon Night, never Moon Knight, on maps 1–6 only", () => {
  const walkTalk = [
    game.slice(game.indexOf("const CAMPAIGN_OPENING"), game.indexOf("type LandmarkKind")),
    npcTable,
    campaign.slice(campaign.indexOf("export const CAMPAIGN_OPENING"), campaign.indexOf("export const PLAYABLE_MAPS")),
  ].join("\n");
  assert.match(game, /PLAYER_NAME = "Moon Night"/);
  assert.match(campaign, /PLAYER_DISPLAY_NAME = "Moon Night"/);
  assert.match(walkTalk, /speaker:"Moon Night"|speaker: "Moon Night"/);
  assert.doesNotMatch(walkTalk, /Moon Knight/);
  assert.doesNotMatch(walkTalk, /\b[Kk]nights?\b/);
  assert.doesNotMatch(game, /Moon Knight|bondMeter|dating sim|affectionMeter|romanceChoice|MAP7_|map:\s*7/);
  assert.doesNotMatch(campaign, /Moon Knight|bondMeter|dating sim|MAP7_/);
  assert.equal(npcs.length, 37, "Hale roster should stay on the existing 37 talk tables");
  assert.ok(npcs.every((npc) => npc.map >= 1 && npc.map <= 6));
  const speakers = talkLinesFrom(walkTalk).filter((line) => !CINEMATIC.test(line.text));
  assert.ok(speakers.every((line) => line.speaker === "Moon Night" || ALLOWED.has(line.speaker)));
  assert.ok(speakers.some((line) => line.speaker === "Moon Night"));
  assert.ok(speakers.every((line) => line.speaker !== "Moon Knight"));
});

test("every walk-talk speaker line stays at or under 110 characters", () => {
  const walkTalk = [
    game.slice(game.indexOf("const CAMPAIGN_OPENING"), game.indexOf("type LandmarkKind")),
    npcTable,
    campaign.slice(campaign.indexOf("export const CAMPAIGN_OPENING"), campaign.indexOf("export const PLAYABLE_MAPS")),
  ].join("\n");
  const lines = talkLinesFrom(walkTalk).filter((line) => !CINEMATIC.test(line.text));
  assert.ok(lines.length >= 330, "walk talk should still cover opening, maps, people, and studyables");
  const overlong = lines.filter((line) => line.text.length > 110).map((line) => `${line.speaker}: ${line.text} (${line.text.length})`);
  assert.deepEqual(overlong, [], "each speaker line should stay at or under 110 characters");
});

test("late bind talk soft-lands with if you still need and no MUST-capture phrases", () => {
  for (const npc of npcs) {
    for (const [label, talk] of [["first", npc.firstTalk], ["again", npc.againTalk], ["after", npc.afterCaptureTalk]]) {
      assert.doesNotMatch(talk, SOFTLOCK, `${npc.id}:${npc.map} ${label}Talk should not softlock a skipped bind`);
    }
    if (npc.map >= 5 && /Bind /.test(npc.firstTalk)) {
      assert.match(npc.firstTalk, /if you still need/, `${npc.id}:${npc.map} firstTalk should bind only if needed`);
    }
  }
  for (const [id, map] of [["reed", 5], ["kest", 6], ["hale", 5], ["hale", 4], ["edan", 6], ["ryn", 4]]) {
    const npc = npcs.find((person) => person.id === id && person.map === map);
    assert.ok(npc, `${id}:${map} should stay on the road`);
    assert.match(npc.firstTalk, /if you still need/, `${id}:${map} firstTalk should keep the soft landing`);
  }
  const reed = npcs.find((npc) => npc.id === "reed" && npc.map === 5);
  const kest = npcs.find((npc) => npc.id === "kest" && npc.map === 6);
  const haleKiln = npcs.find((npc) => npc.id === "hale" && npc.map === 5);
  assert.match(reed.againTalk, /Bind a lynx if you still need the heat/);
  assert.match(kest.againTalk, /Bind the wyrm if you still need the pulse/);
  assert.match(haleKiln.firstTalk, /Bind a lynx if you still need the heat/);
});

test("same-map studyable-pointing againTalk still says Press E", () => {
  const misses = [];
  const found = new Set();
  for (const npc of npcs) {
    const pointers = STUDYABLES[npc.map].filter(([re]) => re.test(npc.againTalk));
    if (!pointers.length) continue;
    if (!/[Pp]ress E/.test(npc.againTalk)) misses.push(`${npc.id}:${npc.map}`);
    for (const [, name] of pointers) found.add(`${npc.map}:${name}`);
  }
  assert.deepEqual(misses, [], "every same-map studyable pointer should say Press E");
  for (const needed of ["1:groove", "1:plaque", "1:merlon", "2:shell", "2:post", "2:tide", "3:cairn", "3:foxfire", "4:notch", "4:moonwell", "5:kiln", "5:coal", "5:bellows", "6:step", "6:vein", "6:echo", "6:altar"]) {
    assert.ok(found.has(needed), `maps 1–6 againTalk should still cover ${needed}`);
  }
});

test("Reed, Kest, and Hale keep kiln heat talking to the heart pulse", () => {
  const reed = npcs.find((npc) => npc.id === "reed" && npc.map === 5);
  const kest = npcs.find((npc) => npc.id === "kest" && npc.map === 6);
  const haleKiln = npcs.find((npc) => npc.id === "hale" && npc.map === 5);
  const haleCliff = npcs.find((npc) => npc.id === "hale" && npc.map === 4);
  assert.ok(reed && kest && haleKiln && haleCliff, "Reed/Kest/Hale kiln-pulse roster should stay present");

  assert.match(reed.afterCaptureTalk, /That lynx was the last heat the echo could keep without going out/);
  assert.match(reed.afterCaptureTalk, /You are carrying kiln heat\. The heart can take that warmth/);
  assert.match(reed.afterCaptureTalk, /tell Kest I didn't quit the kiln/);
  assert.match(reed.afterCaptureTalk, /The east gate heals you\. Talk to Kest/);
  assert.doesNotMatch(reed.afterCaptureTalk, /pet|quit the fire|last pulse/);

  assert.match(kest.afterCaptureTalk, /The wyrm is the last pulse\. Rest it at the altar so Reed's kiln can rest/);
  assert.match(kest.afterCaptureTalk, /You named the whole road in shards\. The pulse is the last name/);
  assert.match(kest.afterCaptureTalk, /The road remembers us now, Moon Night/);
  assert.doesNotMatch(kest.afterCaptureTalk, /coal shard|kiln heat so the heart stays warm/);

  assert.match(haleKiln.afterCaptureTalk, /You bound the coal shard\. That's kiln heat the heart can take/);
  assert.match(haleKiln.afterCaptureTalk, /The wind can forget the cliff now\. The kiln heat remembers/);
  assert.match(haleKiln.afterCaptureTalk, /The east gate heals you\. Talk to Kest\. Press E at the heart altar/);
  assert.doesNotMatch(haleKiln.afterCaptureTalk, /last pulse|quit the fire/);

  assert.match(haleCliff.afterCaptureTalk, /You bound the pool shard/);
  assert.match(haleCliff.afterCaptureTalk, /Reed's kiln is through it/);
  assert.doesNotMatch(haleCliff.afterCaptureTalk, /ends the campaign|Press E at the (heart )?altar|last pulse|coal shard/);

  for (const npc of [reed, kest, haleKiln, haleCliff]) {
    const lines = talkLinesFrom(npc.afterCaptureTalk);
    assert.ok(lines.length >= 3, `${npc.id}:${npc.map} afterCapture should still have a short road`);
    assert.deepEqual(lines.filter((line) => line.text.length > 110), []);
    assert.ok(lines.every((line) => line.speaker === "Moon Night" || line.speaker === npc.name));
    assert.doesNotMatch(npc.afterCaptureTalk, /bondMeter|dating|affection|romance|love you|stay with me|walk out together/);
  }
});

test("reunion againTalk remembers the last crossing without the finish dump", () => {
  const later = new Map();
  for (const npc of npcs) {
    const prev = later.get(npc.id);
    if (!prev || npc.map > prev.map) later.set(npc.id, npc);
  }
  const reunions = [...later.values()].filter((npc) => npcs.some((other) => other.id === npc.id && other.map < npc.map));
  assert.ok(reunions.some((npc) => npc.id === "hale" && npc.map === 5), "Hale kiln reunion should stay on the roster");
  const crossings = {
    "calen:4": /castle rain/i,
    "orrin:4": /Castle rain, then cliff wind/,
    "lira:4": /Shore dusk, then cliff wind/,
    "wren:4": /Castle rain, then this cliff/,
    "sera:5": /Shore dusk, then this kiln/,
    "vess:5": /Cairn twist, then kiln/,
    "tamsin:5": /Castle merlon, then kiln road/,
    "maer:5": /Castle rain, then kiln road/,
    "perrin:5": /Late shore, then kiln road/,
    "isk:5": /Cairn twist, then kiln heat/,
    "ryn:5": /Cliff wind, then kiln gate/,
    "hale:5": /Cliff quiet, then this kiln/,
    "bram:6": /Cairn twist, then this heart/,
    "nia:6": /Shore dusk, then this heart/,
    "holt:6": /Cairn twist, then heart/,
    "dell:6": /Shore dusk, then heart/,
    "rowan:6": /Castle rain, then heart/,
  };
  assert.equal(reunions.length, Object.keys(crossings).length, "every later appearance should stay a reunion");
  for (const npc of reunions) {
    const crossing = crossings[`${npc.id}:${npc.map}`];
    assert.ok(crossing, `${npc.id}:${npc.map} should stay a known reunion`);
    assert.match(npc.againTalk, crossing, `${npc.id}:${npc.map} againTalk should remember the last crossing`);
    assert.doesNotMatch(npc.againTalk, FINISH_DUMP, `${npc.id}:${npc.map} againTalk should not repeat the finish dump`);
  }
});

test("Hale stays on the map 4–5 roster with first/again/afterCapture", () => {
  const haleCliffs = npcs.find((npc) => npc.id === "hale" && npc.map === 4);
  const haleKiln = npcs.find((npc) => npc.id === "hale" && npc.map === 5);
  assert.ok(haleCliffs && haleKiln, "Hale should stand on maps 4 and 5");
  assert.equal(haleCliffs.x, 4080);
  assert.equal(haleKiln.x, 4040);
  assert.match(haleCliffs.firstTalk, /The wind forgets you between watches/);
  assert.match(haleCliffs.block, /cardId:PALE_STAG_CARD\.id/);
  assert.match(haleKiln.againTalk, /We meet again\. Cliff quiet, then this kiln/);
  assert.match(haleKiln.block, /cardId:EMBER_LYNX_CARD\.id/);
  assert.match(game, /id:"hale",name:"Hale",map:4/);
  assert.match(game, /id:"hale",name:"Hale",map:5/);
  assert.equal(npcs.filter((npc) => npc.id === "hale").length, 2);
});

test("talk clearance stays 300px apart and clear of altar 200px, portals, and card-drop interiors", () => {
  assert.equal(npcs.length, 37);
  for (const npc of npcs) assert.equal(npc.r, 150, `${npc.id}:${npc.map} talkRadius must stay 150`);

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

  const altarX = num(/const MAP6_HEART_X = (\d+)/, "MAP6_HEART_X");
  const altarR = num(/const ALTAR_INTERACT_RANGE = (\d+)/, "ALTAR_INTERACT_RANGE");
  assert.equal(altarR, 200);
  for (const npc of npcs.filter((person) => person.map === 6)) {
    assert.ok(Math.abs(npc.x - altarX) >= npc.r + altarR, `${npc.id} on map 6 at ${npc.x} sits in the altar interact range`);
  }

  const portalR = num(/const PORTAL_PROMPT_RANGE = (\d+)/, "PORTAL_PROMPT_RANGE");
  const portals = [
    { map: 1, x: num(/const MAP1_PORTAL_X = (\d+)/, "MAP1_PORTAL_X") },
    { map: 2, x: num(/const MAP2_PORTAL_X = (\d+)/, "MAP2_PORTAL_X") },
    { map: 2, x: num(/const MAP2_EXIT_X = (\d+)/, "MAP2_EXIT_X") },
    { map: 3, x: num(/const MAP3_ENTRY_X = (\d+)/, "MAP3_ENTRY_X") },
    { map: 3, x: num(/const MAP3_EXIT_X = (\d+)/, "MAP3_EXIT_X") },
    { map: 4, x: num(/const MAP4_ENTRY_X = (\d+)/, "MAP4_ENTRY_X") },
    { map: 4, x: num(/const MAP4_EXIT_X = (\d+)/, "MAP4_EXIT_X") },
    { map: 5, x: num(/const MAP5_ENTRY_X = (\d+)/, "MAP5_ENTRY_X") },
    { map: 5, x: num(/const MAP5_EXIT_X = (\d+)/, "MAP5_EXIT_X") },
    { map: 6, x: num(/const MAP6_ENTRY_X = (\d+)/, "MAP6_ENTRY_X") },
  ];
  for (const npc of npcs) {
    for (const portal of portals.filter((gate) => gate.map === npc.map)) {
      const center = portal.x + 55;
      assert.ok(
        Math.abs(npc.x - center) >= npc.r + portalR,
        `${npc.id} on map ${npc.map} at ${npc.x} blocks portal ${portal.x}`
      );
    }
  }

  const combatOnly = [...game.match(/COMBAT_ONLY_BEAST_IDS = new Set\(\[([^\]]+)\]\)/)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(combatOnly.length >= 5);
  const hunts = [
    { map: 1, id: "baby-dragon", min: num(/const DRAGON_PATROL_MIN = (\d+)/, "DRAGON_PATROL_MIN"), max: num(/const DRAGON_PATROL_MAX = (\d+)/, "DRAGON_PATROL_MAX") },
  ];
  const packMap = { "sunset-jackal": 2, "cinder-fox": 3, "pale-stag": 4, "ember-lynx": 5, "heart-wyrm": 6 };
  for (const match of game.matchAll(/create(?:Jackal|Beast)\("([^"]+)",\d+,(\d+),(\d+)/g)) {
    const id = match[1];
    if (combatOnly.includes(id)) continue;
    const kind = Object.keys(packMap).find((prefix) => id.startsWith(prefix));
    if (!kind) continue;
    hunts.push({ map: packMap[kind], id, min: Number(match[2]), max: Number(match[3]) });
  }
  assert.ok(hunts.length >= 11, "card-drop interiors should still cover the unique-animal patrols");
  for (const npc of npcs) {
    for (const hunt of hunts.filter((pack) => pack.map === npc.map)) {
      assert.ok(
        npc.x < hunt.min || npc.x > hunt.max,
        `${npc.id} on map ${npc.map} at ${npc.x} sits in ${hunt.id} card-drop patrol ${hunt.min}-${hunt.max}`
      );
    }
  }
});

test("Reed, Kest, Edan, Hale, and Ryn again/afterCapture walk out as people without dating or dump", () => {
  const reed = npcs.find((npc) => npc.id === "reed" && npc.map === 5);
  const kest = npcs.find((npc) => npc.id === "kest" && npc.map === 6);
  const edan = npcs.find((npc) => npc.id === "edan" && npc.map === 6);
  const haleKiln = npcs.find((npc) => npc.id === "hale" && npc.map === 5);
  const rynKiln = npcs.find((npc) => npc.id === "ryn" && npc.map === 5);
  assert.ok(reed && kest && edan && haleKiln && rynKiln, "Reed/Kest/Edan/Hale/Ryn walk-out roster should stay present");

  const dating = /bondMeter|dating|affection|romance|love you|stay with me|walk out together/;
  const campaignDump = /spark, dusk|Castle rain, shore dusk, cairn/;
  const WALK_OUT = /we walk out as people/i;

  assert.match(reed.againTalk, WALK_OUT);
  assert.match(reed.againTalk, /When the kiln can rest, we walk out as people/);
  assert.match(reed.againTalk, /Bind a lynx if you still need the heat/);
  assert.match(reed.againTalk, /quiet kiln/);
  assert.match(reed.againTalk, /[Pp]ress E/);
  assert.match(reed.afterCaptureTalk, /When that kiln can rest, we walk out as people/);
  assert.match(reed.afterCaptureTalk, /tell Kest I didn't quit the kiln/);
  assert.match(reed.afterCaptureTalk, /The east gate heals you\. Talk to Kest/);
  assert.doesNotMatch(reed.afterCaptureTalk, /pet|quit the fire|last pulse/);

  assert.match(kest.againTalk, WALK_OUT);
  assert.match(kest.againTalk, /After that, we walk out as people/);
  assert.match(kest.againTalk, /Bind the wyrm if you still need the pulse/);
  assert.match(kest.againTalk, /first-step stone/);
  assert.match(kest.againTalk, /Press E there if the pulse feels thin/);
  assert.match(kest.againTalk, /Press E at the heart altar\. That ends the campaign/);
  assert.match(kest.afterCaptureTalk, /Come on\. We walk out as people/);
  assert.match(kest.afterCaptureTalk, /The road remembers us now, Moon Night/);
  assert.match(kest.afterCaptureTalk, /Then we walk it together/);
  assert.match(kest.afterCaptureTalk, /Rest it at the altar so Reed's kiln can rest/);
  assert.doesNotMatch(kest.afterCaptureTalk, /coal shard|kiln heat so the heart stays warm/);

  assert.match(edan.againTalk, WALK_OUT);
  assert.match(edan.againTalk, /When the signal rests, we walk out as people/);
  assert.match(edan.againTalk, /last stone/);
  assert.match(edan.againTalk, /Press E at the altar\. The campaign ends when the signal rests/);
  assert.match(edan.againTalk, /Press E at the cooled vein/);
  assert.match(edan.againTalk, /echo-stone/);
  assert.match(edan.againTalk, /Bind the wyrm if you still need the pulse/);
  assert.match(edan.afterCaptureTalk, /Then we walk out as people/);
  assert.match(edan.afterCaptureTalk, /You bound the last pulse/);
  assert.match(edan.afterCaptureTalk, /Press E at the heart altar\. That ends the campaign/);

  assert.match(haleKiln.againTalk, WALK_OUT);
  assert.match(haleKiln.againTalk, /When this kiln can rest, we walk out as people/);
  assert.match(haleKiln.againTalk, /We meet again\. Cliff quiet, then this kiln/);
  assert.match(haleKiln.againTalk, /The quiet kiln still sits west/);
  assert.match(haleKiln.againTalk, /Press E there if the coals feel thin/);
  assert.doesNotMatch(haleKiln.againTalk, FINISH_DUMP);
  assert.match(haleKiln.afterCaptureTalk, /Then we walk out as people\. This stretch can stay quiet/);
  assert.match(haleKiln.afterCaptureTalk, /You bound the coal shard\. That's kiln heat the heart can take/);
  assert.match(haleKiln.afterCaptureTalk, /The wind can forget the cliff now\. The kiln heat remembers/);
  assert.match(haleKiln.afterCaptureTalk, /The east gate heals you\. Talk to Kest\. Press E at the heart altar/);
  assert.doesNotMatch(haleKiln.afterCaptureTalk, /last pulse|quit the fire/);

  assert.match(rynKiln.afterCaptureTalk, WALK_OUT);
  assert.match(rynKiln.afterCaptureTalk, /Then we walk out as people\. I'll keep this last gate/);
  assert.match(rynKiln.afterCaptureTalk, /You bound the coal shard/);
  assert.match(rynKiln.afterCaptureTalk, /The east gate heals you\. Press E at the heart altar/);
  assert.doesNotMatch(rynKiln.againTalk, WALK_OUT);
  assert.doesNotMatch(rynKiln.againTalk, FINISH_DUMP);

  for (const npc of [reed, kest, edan, haleKiln, rynKiln]) {
    const talks = npc.id === "ryn"
      ? [["after", npc.afterCaptureTalk]]
      : [["again", npc.againTalk], ["after", npc.afterCaptureTalk]];
    for (const [label, talk] of talks) {
      const lines = talkLinesFrom(talk);
      assert.deepEqual(lines.filter((line) => line.text.length > 110), [], `${npc.id}:${npc.map} ${label}Talk lines should stay at or under 110 characters`);
      assert.doesNotMatch(talk, dating, `${npc.id}:${npc.map} ${label}Talk should stay off dating/bond`);
      assert.doesNotMatch(talk, SOFTLOCK, `${npc.id}:${npc.map} ${label}Talk should not softlock a skipped bind`);
      assert.doesNotMatch(talk, campaignDump, `${npc.id}:${npc.map} ${label}Talk should not dump the whole road`);
      assert.ok(lines.every((line) => line.speaker === "Moon Night" || line.speaker === npc.name));
    }
  }
});

test("Map 1 buildings/radio stay cut and no new travelers or dating engine appear", () => {
  assert.match(game, /1:\{name:"The Signal in the Rain"/);
  assert.doesNotMatch(game, /radio encounter|The radio |tune the radio|listen to the radio/i);
  assert.doesNotMatch(campaign, /radio encounter|tune the radio/i);
  assert.doesNotMatch(game, /bondMeter|affectionMeter|loveInterest|heartMeter|romanceChoice|dialogueChoice/);
  const names = new Set(npcs.map((npc) => npc.id));
  assert.deepEqual([...names].sort(), [...ALLOWED].filter((name) => name !== "Moon Night").map((name) => name.toLowerCase()).sort());
  assert.equal((game.match(/againTalk:\[/g) || []).length, 37);
});
