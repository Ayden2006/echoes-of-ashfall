# Echoes of Ashfall

A 2D story-action game starring Moon Night, built as a React canvas game with a layered 2D/3D visual style.

## Run the game locally

Requirements:

- Node.js 22.13 or newer
- npm

From the project folder:

```bash
npm ci
npm run dev
```

Use the local address shown in the terminal. To verify a production build:

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

## Current game content

- Map 1: moonlit castle world
- Map 2: sunset beach world
- Moon Night: 100 health, 15 sword damage
- Baby dragon: 150 health, 10 attack damage, passive roaming, sleeping, flying, and persistent retaliation after being attacked
- Sunset Jackals: three animals on Map 2, 70 health, 8 attack damage, idle / walk / run / leap / sleep / pounce animations, and the same card capture + Q deploy / recall system as the dragon

The dragon and jackals keep chasing and attacking whoever hurt them until that target is defeated or escapes sight range. Defeat an animal to form its magical card, press `E` to collect it, equip it, then press `Q` to deploy or recall the companion.

## Main project files

- `app/game.tsx`: gameplay, physics, combat, maps, animation, and canvas rendering
- `app/globals.css`: game page layout and interface styling
- `app/page.tsx`: page entry point
- `public/`: character, dragon, and backdrop artwork

The player and dragon sprite sheets are already wired into `app/game.tsx`. Add new maps or creatures by keeping their state, animation frames, hit detection, and drawing logic grouped together in that file until the game becomes large enough to split into separate systems.
