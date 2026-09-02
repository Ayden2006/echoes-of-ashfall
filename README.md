# Echoes of Ashfall

A 2D story-action game starring Moon Night, built as a React canvas game with a layered 2D/3D visual style.

## Play / download

- **Play from the published source (`main`):** download the zip, then run locally:
  - Zip: https://github.com/Ayden2006/echoes-of-ashfall/archive/refs/heads/main.zip
  - `npm ci` then `npm run dev`
- **Repo:** https://github.com/Ayden2006/echoes-of-ashfall

Requirements for a local run:

- Node.js 22.13 or newer
- npm

To verify a production build:

```bash
npm run build
```

## Controls

- `A` / `D` or arrow keys: move
- `Shift`: run
- `Space`: jump and double jump
- `S` or down arrow: crouch
- Tap `S` while moving: slide; faster entry speed creates a longer, faster slide
- Left mouse button: sword attack toward the cursor
- `E`: interact with portals, talk to people, study landmarks (plaque, dusk-shell, foxfire hollow, moonwell, kiln, coal-bed, vein, echo-stone, altar), and pick up animal cards
- `Tab`: inventory
- `M`: open the Ashfall world map; unreached regions stay hidden until unlocked
- `1`–`5`: select a usable card slot
- `Q`: deploy or recall the equipped animal companion

## Campaign (maps 1–6 playable)

Moon Night follows a fading signal through Ashfall. The road runs castle → beach → hollow → cliffs → quiet ember → heart.

- Map 1 — The Signal in the Rain (moonlit castle): Baby Dragon and an eastern roostling; Calen talks if you press `E`; a high rain-worn plaque can be studied with `E`
- Map 2 — Sunset Shore (sunset beach): Sunset Jackals (including a road scout); Sera talks if you press `E`; a dusk-shell on a mid-beach ledge (step up from the sand) can be studied with `E`
- Map 3 — Ash Hollow (ember wood): Cinder Foxes; Bram talks if you press `E`; a foxfire hollow on a stepped ledge can be studied with `E`
- Map 4 — Moonwell Cliffs: Pale Stag; Calen can be met again; the moonwell can be studied with `E`; far gate opens into The Quiet Ember
- Map 5 — The Quiet Ember (kiln terrace): Ember Lynx; Reed talks if you press `E`; Sera can be met again; the quiet kiln and a banked coal-bed can be studied with `E`
- Map 6 — Ashfall's Heart (inner chamber): Heart Wyrm; Kest talks if you press `E`; Bram can be met again; a cooled vein, an echo-stone, and the Ashfall Heart Altar all use `E` (the altar ends the campaign)

Maps 2 and 3 use multi-height terrain instead of a single flat strip, ground animals track the terrain surface they stand on, later maps use layered regional backdrops, and the world map only reveals regions the player has unlocked.

Moon Night has 100 health and 15 sword damage. Defeat an animal to form its magical card, press `E` to collect it, equip it, then press `Q` to deploy or recall the companion. Animals keep chasing and attacking whoever hurt them until that target is defeated or escapes sight range. Every unique animal uses that same card + Q pattern.

Named travelers and knights stand on the road and talk if you press `E` — the same talk used by Reed and Kest. First words, a later talk, and talk after you bind that map's animal all change. Meet Calen, Sera, or Bram again farther east and they remember the last crossing. This is not a dating sim: there are no bond meters, romance choices, or extra relationship systems.

## Main project files

- `app/game.tsx`: gameplay, physics, combat, maps, animation, world-map UI, and canvas rendering
- `lib/campaign.ts`: story framework, objectives, dialogue, and map metadata
- `app/globals.css`: game page layout and interface styling
- `app/page.tsx`: page entry point
- `public/`: character, dragon, and backdrop artwork
- `ART_DIRECTION.md`: standing environment rule for every map

The player and dragon sprite sheets are already wired into `app/game.tsx`. Add new maps or creatures by keeping their state, animation frames, hit detection, and drawing logic grouped together in that file until the game becomes large enough to split into separate systems.
