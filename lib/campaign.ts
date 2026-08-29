/**
 * Echoes of Ashfall campaign framework.
 * Maps 1–4 are playable. Maps 5–6 are reserved for Game Builder 2.
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
  { speaker: "Moon Night", text: "I will follow the echo through castle, shore, ash, and moonwell." },
  { speaker: "Moon Night", text: "If an animal falls, its spirit becomes a card. Equip it, then press Q." }
];

export const CAMPAIGN_MAPS: Record<MapId, CampaignMap> = {
  1: {
    id: 1,
    name: "The Signal in the Rain",
    chapter: "Chapter I",
    width: 5200,
    playable: true,
    objective: "Find the baby dragon in the rain, then take the far-right portal.",
    intro: [
      { speaker: "Moon Night", text: "Moonlit stone. A young ash dragon hunts these ruins." },
      { speaker: "Moon Night", text: "Defeat it, take its card, then follow the signal east." }
    ],
    entryPortalX: 105,
    exitPortalX: 5070,
    nextMap: 2,
    prevMap: null,
    animal: "Baby Dragon"
  },
  2: {
    id: 2,
    name: "Sunset Shore",
    chapter: "Chapter II",
    width: 3600,
    playable: true,
    objective: "Track the three Sunset Jackals, then take the eastern portal to Ash Hollow.",
    intro: [
      { speaker: "Moon Night", text: "The shore burns gold. Jackals keep this dusk." },
      { speaker: "Moon Night", text: "Three of them. Bind one, then push east before the light dies." }
    ],
    entryPortalX: 105,
    exitPortalX: 3470,
    nextMap: 3,
    prevMap: 1,
    animal: "Sunset Jackal"
  },
  3: {
    id: 3,
    name: "Ash Hollow",
    chapter: "Chapter III",
    width: 4000,
    playable: true,
    objective: "Bind a Cinder Fox in the hollow, then reach the moonwell gate.",
    intro: [
      { speaker: "Moon Night", text: "The first fall still smolders here. Foxfire moves between the trunks." },
      { speaker: "Moon Night", text: "A Cinder Fox can walk the ash with me if I earn its card." }
    ],
    entryPortalX: 105,
    exitPortalX: 3870,
    nextMap: 4,
    prevMap: 2,
    animal: "Cinder Fox"
  },
  4: {
    id: 4,
    name: "Moonwell Cliffs",
    chapter: "Chapter IV",
    width: 4200,
    playable: true,
    objective: "Face the Pale Stag. The path to Maps 5 and 6 is still sealed.",
    intro: [
      { speaker: "Moon Night", text: "The moonwell pools the signal, but the far gate is sealed." },
      { speaker: "Moon Night", text: "A Pale Stag keeps this cliff. Maps 5 and 6 still wait beyond." }
    ],
    entryPortalX: 105,
    exitPortalX: 4070,
    nextMap: 5,
    prevMap: 3,
    animal: "Pale Stag"
  },
  5: {
    id: 5,
    name: "The Quiet Ember",
    chapter: "Chapter V",
    width: 4400,
    playable: false,
    objective: "Reserved for Game Builder 2.",
    intro: [{ speaker: "Moon Night", text: "The path continues, but it is not open yet." }],
    entryPortalX: 105,
    exitPortalX: 4270,
    nextMap: 6,
    prevMap: 4,
    animal: ""
  },
  6: {
    id: 6,
    name: "Ashfall's Heart",
    chapter: "Chapter VI",
    width: 4800,
    playable: false,
    objective: "Reserved for Game Builder 2 — campaign ending.",
    intro: [{ speaker: "Moon Night", text: "The last echo is still unwritten." }],
    entryPortalX: 105,
    exitPortalX: null,
    nextMap: null,
    prevMap: 5,
    animal: ""
  }
};

export const PLAYABLE_MAPS: MapId[] = [1, 2, 3, 4];
export const SEALED_GATE_LINES: Line[] = [
  { speaker: "Moon Night", text: "The gate answers, but Maps 5 and 6 are not open yet." },
  { speaker: "Moon Night", text: "The signal still runs ahead. I will return when the path is ready." }
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
