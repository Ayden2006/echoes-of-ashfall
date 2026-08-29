/**
 * Maps 5–6 later-act content for Game Builder 2.
 * Unique animals use the same E-pickup / Q-deploy card pattern as the dragon and jackals.
 * People use existing E-talk Line[] flow — not a dating sim.
 */
import type { Line, MapId } from "./campaign";

export type Platform = { x: number; y: number; w: number; h: number };
export type CardPalette = { dark: string; mid: string; accent: string; glow: string };
export type AnimalCard = {
  id: string;
  name: string;
  type: "animal-card";
  description: string;
  image: string;
  palette: CardPalette;
  maxHealth: number;
  attackDamage: number;
};
export type Person = {
  id: string;
  name: string;
  map: MapId;
  x: number;
  talkRadius: number;
  firstTalk: Line[];
  againTalk: Line[];
  afterBond: Line[];
};

export const MAP5_W = 4400;
export const MAP6_W = 4800;
export const MAP5_ENTRY_X = 105;
export const MAP5_EXIT_X = 4270;
export const MAP6_ENTRY_X = 105;

export const map5Platforms: Platform[] = [
  { x: 0, y: 590, w: 980, h: 180 },
  { x: 940, y: 565, w: 720, h: 200 },
  { x: 1620, y: 590, w: 780, h: 180 },
  { x: 2360, y: 545, w: 640, h: 220 },
  { x: 2960, y: 575, w: 700, h: 190 },
  { x: 3620, y: 555, w: 780, h: 210 },
  { x: 1180, y: 455, w: 160, h: 18 },
  { x: 2480, y: 430, w: 170, h: 18 },
  { x: 3340, y: 445, w: 150, h: 18 }
];

export const map6Platforms: Platform[] = [
  { x: 0, y: 590, w: 1100, h: 180 },
  { x: 1060, y: 560, w: 820, h: 210 },
  { x: 1840, y: 535, w: 900, h: 230 },
  { x: 2700, y: 560, w: 780, h: 210 },
  { x: 3440, y: 545, w: 1360, h: 220 },
  { x: 1520, y: 430, w: 180, h: 18 },
  { x: 2680, y: 415, w: 190, h: 18 },
  { x: 3920, y: 425, w: 200, h: 18 }
];

export const platformsForAct3 = (map: MapId): Platform[] | null => {
  if (map === 5) return map5Platforms;
  if (map === 6) return map6Platforms;
  return null;
};

export const EMBER_LYNX_MAX_HEALTH = 95;
export const EMBER_LYNX_ATTACK_DAMAGE = 10;
export const HEART_WYRM_MAX_HEALTH = 170;
export const HEART_WYRM_ATTACK_DAMAGE = 14;

export const EMBER_LYNX_CARD: AnimalCard = {
  id: "ember-lynx-card",
  name: "Ember Lynx",
  type: "animal-card",
  description: "A magical card holding the spirit of a coal-pelt lynx from The Quiet Ember.",
  image: "/baby-dragon-sprite-sheet.png",
  palette: { dark: "#1a0c08", mid: "#7a2e14", accent: "#e07030", glow: "#ffb060" }
  , maxHealth: EMBER_LYNX_MAX_HEALTH,
  attackDamage: EMBER_LYNX_ATTACK_DAMAGE
};

export const HEART_WYRM_CARD: AnimalCard = {
  id: "heart-wyrm-card",
  name: "Heart Wyrm",
  type: "animal-card",
  description: "A magical card holding the last pulse of Ashfall's Heart.",
  image: "/baby-dragon-sprite-sheet.png",
  palette: { dark: "#140816", mid: "#4a2048", accent: "#d45a6a", glow: "#ffc8a0" }
  , maxHealth: HEART_WYRM_MAX_HEALTH,
  attackDamage: HEART_WYRM_ATTACK_DAMAGE
};

export type Act3AnimalSeed = {
  id: string;
  map: MapId;
  x: number;
  patrolMin: number;
  patrolMax: number;
  card: AnimalCard;
  kind: "lynx" | "wyrm";
};

export const ACT3_ANIMALS: Act3AnimalSeed[] = [
  { id: "ember-lynx-a", map: 5, x: 1280, patrolMin: 980, patrolMax: 1680, card: EMBER_LYNX_CARD, kind: "lynx" },
  { id: "ember-lynx-b", map: 5, x: 3120, patrolMin: 2760, patrolMax: 3580, card: EMBER_LYNX_CARD, kind: "lynx" },
  { id: "heart-wyrm", map: 6, x: 2480, patrolMin: 1880, patrolMax: 3180, card: HEART_WYRM_CARD, kind: "wyrm" }
];

export const ACT3_PEOPLE: Person[] = [
  {
    id: "reed",
    name: "Reed",
    map: 5,
    x: 760,
    talkRadius: 150,
    firstTalk: [
      { speaker: "Reed", text: "Easy. The coals here bite if you rush them." },
      { speaker: "Moon Night", text: "I followed the signal from the moonwell." },
      { speaker: "Reed", text: "Then you're like me. I used to keep the castle kilns. Now I keep this quiet fire alive." },
      { speaker: "Reed", text: "The lynx wear the last heat. Bind one if you can. I'll be here when you come back." }
    ],
    againTalk: [
      { speaker: "Reed", text: "Still walking, Moon Night. The heart is east. Don't go in cold." }
    ],
    afterBond: [
      { speaker: "Reed", text: "You kept your word. If you reach the heart, tell Kest I didn't quit the fire." },
      { speaker: "Moon Night", text: "I will." }
    ]
  },
  {
    id: "kest",
    name: "Kest",
    map: 6,
    x: 920,
    talkRadius: 150,
    firstTalk: [
      { speaker: "Kest", text: "So the rain-walker made it. I heard you in the signal days ago." },
      { speaker: "Moon Night", text: "You walked this road ahead of me." },
      { speaker: "Kest", text: "Someone had to. The Heart Wyrm is the last pulse. I couldn't bind it alone." },
      { speaker: "Kest", text: "If we finish this, we walk out together. Not as ghosts. As people." }
    ],
    againTalk: [
      { speaker: "Kest", text: "I'm still here. The wyrm is farther in. I'm not leaving you to it." }
    ],
    afterBond: [
      { speaker: "Kest", text: "The signal is quiet. We can go home, Moon Night. The road remembers us now." },
      { speaker: "Moon Night", text: "Then we walk it together." }
    ]
  }
];

export const MAP5_PALETTE = {
  skyTop: "#140806",
  skyMid: "#3a1810",
  skyBot: "#1a0c0a",
  ground: "#2a1410",
  accent: "#e07030"
};

export const MAP6_PALETTE = {
  skyTop: "#120814",
  skyMid: "#3a2038",
  skyBot: "#241018",
  ground: "#2a1820",
  accent: "#d45a6a"
};

export const ENDING_LINES: Line[] = [
  { speaker: "Moon Night", text: "The echo is still. Ashfall keeps its heart, and I keep the road." },
  { speaker: "Kest", text: "Come on. Reed will want to know the kiln can rest." }
];
