/**
 * Echoes of Ashfall campaign framework.
 * Maps 1–6 are playable. The road runs castle → beach → hollow → cliffs → quiet ember → heart.
 */
export type MapId = 1 | 2 | 3 | 4 | 5 | 6;
export type Line = { speaker: string; text: string };

export type CampaignMap = {
  id: MapId;
  name: string;
  chapter: string;
  width: number;
  playable: boolean;
  objective: string;
  intro: Line[];
  entryPortalX: number;
  exitPortalX: number | null;
  nextMap: MapId | null;
  prevMap: MapId | null;
  animal: string;
};

export const WORLD_H = 720;
export const PLAYER_DISPLAY_NAME = "Moon Night";

export const CAMPAIGN_OPENING: Line[] = [
  { speaker: "Moon Night", text: "The rain carries a signal. Something in Ashfall is still calling." },
  { speaker: "Moon Night", text: "I will follow the echo through castle, shore, ash, moonwell, quiet ember, and heart." },
  { speaker: "Moon Night", text: "If an animal falls, its spirit becomes a card. Equip it, then press Q." }
];

export const CAMPAIGN_MAPS: Record<MapId, CampaignMap> = {
  1: {
    id: 1,
    name: "The Signal in the Rain",
    chapter: "Chapter I",
    width: 7200,
    playable: true,
    objective: "Find the baby dragon in the rain, then take the far-right portal.",
    intro: [
      { speaker: "Moon Night", text: "Moonlit stone. A young ash dragon hunts these ruins." },
      { speaker: "Moon Night", text: "The rain is not just weather. The echo is already in the walls." },
      { speaker: "Moon Night", text: "Defeat the dragon, take its card, then follow the signal east." }
    ],
    entryPortalX: 105,
    exitPortalX: 7070,
    nextMap: 2,
    prevMap: null,
    animal: "Baby Dragon"
  },
  2: {
    id: 2,
    name: "Sunset Shore",
    chapter: "Chapter II",
    width: 5400,
    playable: true,
    objective: "Track the three Sunset Jackals, then take the eastern portal to Ash Hollow.",
    intro: [
      { speaker: "Moon Night", text: "The shore burns gold. Jackals keep this dusk." },
      { speaker: "Moon Night", text: "If the castle spark was the first note, this hunt is the dusk of it." },
      { speaker: "Moon Night", text: "Bind one, then push east before the light dies." }
    ],
    entryPortalX: 105,
    exitPortalX: 5270,
    nextMap: 3,
    prevMap: 1,
    animal: "Sunset Jackal"
  },
  3: {
    id: 3,
    name: "Ash Hollow",
    chapter: "Chapter III",
    width: 5800,
    playable: true,
    objective: "Bind a Cinder Fox in the hollow, then reach the moonwell gate.",
    intro: [
      { speaker: "Moon Night", text: "The first fall still smolders here. Foxfire moves between the trunks." },
      { speaker: "Moon Night", text: "The signal feels closer to the animals than to the east gate." },
      { speaker: "Moon Night", text: "A Cinder Fox can walk the ash with me if I earn its card." }
    ],
    entryPortalX: 105,
    exitPortalX: 5670,
    nextMap: 4,
    prevMap: 2,
    animal: "Cinder Fox"
  },
  4: {
    id: 4,
    name: "Moonwell Cliffs",
    chapter: "Chapter IV",
    width: 6000,
    playable: true,
    objective: "Face the Pale Stag, then take the far gate into The Quiet Ember.",
    intro: [
      { speaker: "Moon Night", text: "The moonwell pools the signal. The far gate is open now." },
      { speaker: "Moon Night", text: "If the hollow told the truth, the stag is holding what I already carry." },
      { speaker: "Moon Night", text: "A Pale Stag keeps this cliff. East is The Quiet Ember." }
    ],
    entryPortalX: 105,
    exitPortalX: 5870,
    nextMap: 5,
    prevMap: 3,
    animal: "Pale Stag"
  },
  5: {
    id: 5,
    name: "The Quiet Ember",
    chapter: "Chapter V",
    width: 6200,
    playable: true,
    objective: "Talk to Reed, bind an Ember Lynx, then take the healing east gate to the heart altar.",
    intro: [
      { speaker: "Moon Night", text: "The fire here does not roar. It waits." },
      { speaker: "Moon Night", text: "Lynx-shaped coals hunt the dark. Reed keeps the kiln; press E to hear him." },
      { speaker: "Moon Night", text: "Bind a lynx if you still need the heat. The east gate heals you. The heart altar ends it." }
    ],
    entryPortalX: 105,
    exitPortalX: 6070,
    nextMap: 6,
    prevMap: 4,
    animal: "Ember Lynx"
  },
  6: {
    id: 6,
    name: "Ashfall's Heart",
    chapter: "Chapter VI",
    width: 6600,
    playable: true,
    objective: "Speak with Kest, bind the Heart Wyrm, then press E at the altar to end the campaign.",
    intro: [
      { speaker: "Moon Night", text: "This is the last echo. The heart of Ashfall still beats." },
      { speaker: "Moon Night", text: "Kest walked this road ahead of me. The Heart Wyrm is the pulse we came to still." },
      { speaker: "Moon Night", text: "Talk to Kest. Bind the wyrm if you still need the pulse. Press E at the heart altar. That ends the campaign." }
    ],
    entryPortalX: 105,
    exitPortalX: null,
    nextMap: null,
    prevMap: 5,
    animal: "Heart Wyrm"
  }
};

export const PLAYABLE_MAPS: MapId[] = [1, 2, 3, 4, 5, 6];
export const SEALED_GATE_LINES: Line[] = [
  { speaker: "Moon Night", text: "The gate answers. The Quiet Ember is open east of the moonwell." }
];

export const CAMPAIGN_ENDING: Line[] = [
  { speaker: "Moon Night", text: "The cards go still against the stone. Dragon, jackal, fox, stag, lynx, wyrm — each was a shard of the same fading call." },
  { speaker: "Moon Night", text: "I did not chase a signal east. I carried it. The echo is still because it has a place to rest." },
  { speaker: "Kest", text: "You brought the road home. Ashfall keeps its heart." },
  { speaker: "Moon Night", text: "The echo is still. I keep the road." },
  { speaker: "Kest", text: "Come on. Reed will want to know the kiln can rest. We walk out as people." }
];

export function isPlayableMap(map: MapId): boolean {
  return CAMPAIGN_MAPS[map].playable;
}

export function worldWidthFor(map: MapId): number {
  return CAMPAIGN_MAPS[map].width;
}

export function mapNameFor(map: MapId): string {
  return CAMPAIGN_MAPS[map].name;
}

export function objectiveFor(map: MapId): string {
  return CAMPAIGN_MAPS[map].objective;
}

export function spawnXFor(map: MapId, from: MapId | null): number {
  const data = CAMPAIGN_MAPS[map];
  if (from === null) return 230;
  if (data.prevMap === from) return 340;
  if (data.nextMap === from) return Math.max(240, data.width - 340);
  return 340;
}

export function spawnFacingFor(map: MapId, from: MapId | null): 1 | -1 {
  if (from !== null && CAMPAIGN_MAPS[map].nextMap === from) return -1;
  return 1;
}
