# Echoes of Ashfall

A 2D story-action game starring Moon Night, built as a React canvas game with a layered 2D/3D visual style.

## Play / download

- **Play in the browser:** https://ayden2006.github.io/echoes-of-ashfall/
- **Play from the published source (`main`):** download the zip, then run locally:
  - Zip: https://github.com/Ayden2006/echoes-of-ashfall/archive/refs/heads/main.zip
  - `npm ci` then `npm run dev`
- **Repo:** https://github.com/Ayden2006/echoes-of-ashfall

GitHub Pages serves a static Vite build of the same canvas game. Enable **Settings → Pages → GitHub Actions** once if the URL 404s; pushes to `main` publish it.

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
- `E`: interact with portals, talk to people, study landmarks (plaque, merlon, dusk-shell, tide-cut step, foxfire hollow, charred nest, moonwell, pale lichen, kiln, coal-bed, vein, echo-stone, altar), and pick up animal cards
- `Tab`: inventory
- `M`: open the Ashfall world map; unreached regions stay hidden until unlocked
- `1`–`5`: select a usable card slot
- `Q`: deploy or recall the equipped animal companion

## Campaign (maps 1–6 playable)

Moon Night follows a fading signal through Ashfall. The road runs castle → beach → hollow → cliffs → quiet ember → heart. Mid-road, a split cairn in Ash Hollow tells the twist: the animals are the echo, not just quarry on the way east.

- Map 1 — The Signal in the Rain (moonlit castle): Baby Dragon and an eastern roostling; Calen, Wren, Orrin, Tamsin, Rowan, and Maer talk if you press `E`; a high rain-worn plaque and a rain-cut groove can be studied with `E`
- Map 2 — Sunset Shore (sunset beach): Sunset Jackals (including a road scout); Sera talks near the west sand, Lira mid-beach, Dell and Perrin on the later gold, Nia on the last gold; a dusk-shell on a mid-beach ledge and a drowned signal-post can be studied with `E`
- Map 3 — Ash Hollow (ember wood): Cinder Foxes; Bram talks near the west ash, Isk on the early leftover heat, Holt on the later cairn road, Vess near the east gate; a foxfire hollow on a stepped ledge and the split cairn can be studied with `E`
- Map 4 — Moonwell Cliffs: Pale Stag; Orrin stands on the west cliff; Calen can be met again by the well road; Lira can be met again on the later cliff; Wren can be met again on the far cliff; Ryn keeps the last gate and says it heals; a cliff notch and the moonwell can be studied with `E`; far gate opens into The Quiet Ember
- Map 5 — The Quiet Ember (kiln terrace): Ember Lynx; Reed talks if you press `E`; Isk can be met again on the early coals; Vess can be met again by the kiln road; Perrin and Maer can be met again on the mid coals; Tamsin can be met again on the later coals; Ryn can be met again before the east gate; Sera can be met again near the east gate; the quiet kiln, a banked coal-bed, and quiet bellows can be studied with `E`
- Map 6 — Ashfall's Heart (inner chamber): Heart Wyrm; Kest talks if you press `E`; Bram can be met again; Holt can be met again on the cairn road's last stretch; Rowan can be met again on the leftover castle road; Nia can be met again east of the wyrm; Dell can be met again on the last gold; Edan keeps the last stretch to the altar; a first-step stone, a cooled vein, an echo-stone, and the Ashfall Heart Altar all use `E` (the altar ends the campaign)

Maps 1–6 use a longer east-west road with extra roam space between hunts and gates. Maps 2 and 3 use multi-height terrain instead of a single flat strip, ground animals track the terrain surface they stand on, later maps use layered regional backdrops, and the world map only reveals regions the player has unlocked.

Moon Night has 100 health and 15 sword damage. Defeat an animal to form its magical card, press `E` to collect it, equip it, then press `Q` to deploy or recall the companion. A deployed companion hunts nearby hostile animals on the current map and keeps attacking until they fall or leave sight, without picking idle extra fights. Extra combat-only animals (scout, roostling, third fox, second stag, fourth lynx) stay in their stretch of the road instead of stacking into every nearby bind, and they do not drop cards. Portals restore health so a new map starts playable. Every unique animal uses that same card + Q pattern.

Named travelers and knights stand on the road and talk if you press `E` — the same talk used by Reed and Kest. First words, a later talk, and talk after you bind that map's animal all change. Early and mid-road first talks quietly teach the same three beats: the animals are the echo, bind then go east, and portals heal. Map 1 keeps that teaching short and does not dump the heart-altar ending. After-capture and reunion lines name shared history across the road (castle rain → shore dusk → cairn twist (animals are the echo) → kiln heat → heart altar) and treat bound animals as signal shards. Late-map talks tell you the east gate heals, Kest waits in the heart, and pressing `E` at the altar ends the campaign. Meet Calen, Sera, Bram, Orrin, Nia, Vess, Tamsin, Lira, Holt, Maer, Perrin, Wren, Dell, Isk, Rowan, Ryn, or Edan again farther east and they remember the last crossing. This is not a dating sim: there are no bond meters, romance choices, or extra relationship systems.

## Main project files

- `app/game.tsx`: gameplay, physics, combat, maps, animation, world-map UI, and canvas rendering
- `lib/campaign.ts`: story framework, objectives, dialogue, and map metadata
- `app/globals.css`: game page layout and interface styling
- `app/page.tsx`: page entry point
- `public/`: character, dragon, and backdrop artwork
- `ART_DIRECTION.md`: standing environment rule for every map

The player and dragon sprite sheets are already wired into `app/game.tsx`. Add new maps or creatures by keeping their state, animation frames, hit detection, and drawing logic grouped together in that file until the game becomes large enough to split into separate systems.
