# Echoes of Ashfall

A 2D story-action game starring Moon Night, built as a React canvas game with a layered 2D/3D visual style.

## Play / download

- **Play from source (this branch):** download the zip, then run locally:
  - Zip: https://github.com/Ayden2006/echoes-of-ashfall/archive/refs/heads/expand-story-campaign.zip
  - `npm ci` then `npm run dev`
- **GitHub Pages (after the Pages workflow publishes):** https://ayden2006.github.io/echoes-of-ashfall/
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
- `E`: interact with portals and pick up animal cards
- `Tab`: inventory
- `1`–`5`: select a usable card slot
- `Q`: deploy or recall the equipped animal companion

## Campaign (maps 1–4 playable)

Moon Night follows a fading signal through Ashfall. Maps 5–6 and the ending are reserved for Game Builder 2; Map 4's far gate is sealed.

- Map 1 — The Signal in the Rain (moonlit castle): Baby Dragon
- Map 2 — Sunset Shore (sunset beach): Sunset Jackals, east gate to Ash Hollow
- Map 3 — Ash Hollow (ember wood): Cinder Foxes
- Map 4 — Moonwell Cliffs: Pale Stag; path to maps 5–6 sealed
- Maps 5–6 — reserved (`lib/campaign.ts` MapId 5|6)

Moon Night has 100 health and 15 sword damage. Defeat an animal to form its magical card, press `E` to collect it, equip it, then press `Q` to deploy or recall the companion. The dragon and jackals keep chasing and attacking whoever hurt them until that target is defeated or escapes sight range. New animals use that same card + Q pattern.

## Main project files

- `app/game.tsx`: gameplay, physics, combat, maps, animation, and canvas rendering
- `lib/campaign.ts`: extensible story framework, objectives, dialogue, and map metadata
- `app/globals.css`: game page layout and interface styling
- `app/page.tsx`: page entry point
- `public/`: character, dragon, and backdrop artwork
- `ART_DIRECTION.md`: standing environment rule for every map

The player and dragon sprite sheets are already wired into `app/game.tsx`. Add new maps or creatures by keeping their state, animation frames, hit detection, and drawing logic grouped together in that file until the game becomes large enough to split into separate systems.
