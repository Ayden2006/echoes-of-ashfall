/**
 * Maps 5–6 later-act campaign data, animals, story, and draw/combat helpers.
 * Unique animals use the same E-pickup / Q-deploy card pattern as dragon and jackals.
 * Reuses /baby-dragon-sprite-sheet.png with ash / ember palettes — no new PNGs.
 */

export type MapId = 1 | 2 | 3 | 4 | 5 | 6;
export type Line = { speaker: string; text: string };
export type Platform = { x: number; y: number; w: number; h: number };
export type CardPalette = { dark: string; mid: string; accent: string; glow: string };
export type InventoryItem = {
  id: string;
  name: string;
  type: "animal-card" | "item";
  description: string;
  image: string;
  palette: CardPalette;
};
export type DragonMode = "idle" | "walk" | "run" | "fly" | "sleep" | "attack";
export type DragonFrame = { x: number; y: number; w: number; h: number; anchorX: number; anchorY: number };

export type PackAnimal = {
  id: string;
  x: number;
  y: number;
  groundY: number;
  vx: number;
  facing: 1 | -1;
  mode: DragonMode;
  modeStarted: number;
  modeUntil: number;
  health: number;
  maxHealth: number;
  attackDamage: number;
  lastPlayerAttack: number;
  attackLanded: boolean;
  hurtStarted: number;
  hurtUntil: number;
  hitDirection: 1 | -1;
  lastDamage: number;
  angry: boolean;
  landing: boolean;
  targetX: number;
  awarenessUntil: number;
  patrolMin: number;
  patrolMax: number;
  howlUntil: number;
};

export const MAP5_W = 4400;
export const MAP6_W = 4800;
export const MAP5_ENTRY_X = 105;
export const MAP5_EXIT_X = 4270;
export const MAP6_ENTRY_X = 105;

export const WARG_MAX_HEALTH = 110;
export const WARG_ATTACK_DAMAGE = 12;
export const WARG_SIGHT_RANGE = 640;
export const WARG_ATTACK_RANGE = 124;
export const WARG_RENDER_SIZE = 100;
export const WARG_HOWL_MS = 780;

export const WYRM_MAX_HEALTH = 160;
export const WYRM_ATTACK_DAMAGE = 14;
export const WYRM_SIGHT_RANGE = 740;
export const WYRM_ATTACK_RANGE = 140;
export const WYRM_RENDER_SIZE = 148;
export const WYRM_CELL = 256;

export const ASH_WARG_CARD: InventoryItem = {
  id: "ash-warg-card",
  name: "Ash Warg",
  type: "animal-card",
  description: "A magical card holding a castle hound that ran the ash after the fall.",
  image: "/baby-dragon-sprite-sheet.png",
  palette: { dark: "#1a1814", mid: "#6a6358", accent: "#8a3a32", glow: "#e8dcc8" }
};

export const EMBER_WYRLING_CARD: InventoryItem = {
  id: "ember-wyrmling-card",
  name: "Ember Wyrmling",
  type: "animal-card",
  description: "A magical card holding the last heat at the heart of Ashfall.",
  image: "/baby-dragon-sprite-sheet.png",
  palette: { dark: "#1a0c08", mid: "#7a2a14", accent: "#e07030", glow: "#ffc078" }
};

export const map5Platforms: Platform[] = [
  { x: 0, y: 590, w: 980, h: 180 },
  { x: 940, y: 565, w: 760, h: 205 },
  { x: 1660, y: 590, w: 820, h: 180 },
  { x: 2440, y: 545, w: 700, h: 225 },
  { x: 3100, y: 575, w: 720, h: 195 },
  { x: 3780, y: 555, w: 620, h: 215 },
  { x: 1120, y: 455, w: 170, h: 18 },
  { x: 2520, y: 430, w: 180, h: 18 },
  { x: 3460, y: 445, w: 160, h: 18 }
];

export const map6Platforms: Platform[] = [
  { x: 0, y: 590, w: 1200, h: 180 },
  { x: 1160, y: 560, w: 900, h: 210 },
  { x: 2020, y: 535, w: 980, h: 235 },
  { x: 2960, y: 560, w: 860, h: 210 },
  { x: 3780, y: 545, w: 1020, h: 225 },
  { x: 1580, y: 430, w: 190, h: 18 },
  { x: 2780, y: 415, w: 200, h: 18 },
  { x: 3980, y: 425, w: 180, h: 18 }
];

export const MAP4_UNSEALED = {
  name: "Moonwell Cliffs",
  objective: "Face the Pale Stag, then take the far gate into Ashfall Crater.",
  intro: [
    { speaker: "Moon Night", text: "The moonwell still holds. The far gate is open now." },
    { speaker: "Moon Night", text: "Ashfall Crater waits east of the cliffs." }
  ]
};

export const MAP5_STORY = {
  name: "Ashfall Crater",
  objective: "The ash wargs were castle hounds. Bind one, then descend to the heart.",
  intro: [
    { speaker: "Moon Night", text: "Pale ash. Ruined stone. Sickly moonlight on the crater rim." },
    { speaker: "Moon Night", text: "These wargs were castle hounds before the ash. They still hunt as a pack." },
    { speaker: "Moon Night", text: "They howl first. Then they rush. Earn a card, then take the east gate." }
  ]
};

export const MAP6_STORY = {
  name: "Heart of Ash",
  objective: "Face the Ember Wyrmling. Moon Night still has a road home.",
  intro: [
    { speaker: "Moon Night", text: "The heart still burns, but it is not a grave." },
    { speaker: "Moon Night", text: "One wyrmling keeps the last heat. Bind it if you must." },
    { speaker: "Moon Night", text: "When this is done, the road home is still there. West, through the ash, under the same moon." }
  ]
};

export const MAP6_ENDING: Line[] = [
  { speaker: "Moon Night", text: "The echo quiets. Ashfall keeps its heart." },
  { speaker: "Moon Night", text: "I still have a road home. The moon did not forget the way." }
];

export function laterActCardKind(id: string | null): "warg" | "wyrm" | null {
  if (id === ASH_WARG_CARD.id) return "warg";
  if (id === EMBER_WYRLING_CARD.id) return "wyrm";
  return null;
}

export function laterActCardStats(id: string | null): { hp: number; ground: boolean; kind: string } | null {
  if (id === ASH_WARG_CARD.id) return { hp: WARG_MAX_HEALTH, ground: true, kind: "warg" };
  if (id === EMBER_WYRLING_CARD.id) return { hp: WYRM_MAX_HEALTH, ground: false, kind: "wyrm" };
  return null;
}

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

export function createAshWargs(now: number): PackAnimal[] {
  const make = (id: string, x: number, patrolMin: number, patrolMax: number): PackAnimal => ({
    id,
    x,
    y: 590,
    groundY: 590,
    vx: 0,
    facing: 1,
    mode: "idle",
    modeStarted: now,
    modeUntil: now + 1800 + Math.random() * 1600,
    health: WARG_MAX_HEALTH,
    maxHealth: WARG_MAX_HEALTH,
    attackDamage: WARG_ATTACK_DAMAGE,
    lastPlayerAttack: -1,
    attackLanded: false,
    hurtStarted: 0,
    hurtUntil: 0,
    hitDirection: 1,
    lastDamage: 0,
    angry: false,
    landing: false,
    targetX: x + 70,
    awarenessUntil: 0,
    patrolMin,
    patrolMax,
    howlUntil: 0
  });
  return [
    make("ash-warg-a", 1420, 980, 1980),
    make("ash-warg-b", 3120, 2680, 3720)
  ];
}

export function createEmberWyrmling(now: number): PackAnimal {
  return {
    id: "ember-wyrmling",
    x: 2460,
    y: 535,
    groundY: 535,
    vx: 0,
    facing: 1,
    mode: "idle",
    modeStarted: now,
    modeUntil: now + 2400,
    health: WYRM_MAX_HEALTH,
    maxHealth: WYRM_MAX_HEALTH,
    attackDamage: WYRM_ATTACK_DAMAGE,
    lastPlayerAttack: -1,
    attackLanded: false,
    hurtStarted: 0,
    hurtUntil: 0,
    hitDirection: 1,
    lastDamage: 0,
    angry: false,
    landing: false,
    targetX: 2680,
    awarenessUntil: 0,
    patrolMin: 1680,
    patrolMax: 3380,
    howlUntil: 0
  };
}

export type LaterActHooks = {
  dt: number;
  now: number;
  map: number;
  started: boolean;
  player: { x: number; y: number; vx: number; health: number };
  PH: number;
  swingStarted: number;
  swingUntil: number;
  swingDamage: number;
  swingAngle: number;
  playerRespawnAt: number;
  setPlayerHealth: (hp: number) => void;
  setPlayerHurtUntil: (n: number) => void;
  setPlayerRespawnAt: (n: number) => void;
  companionAttack: (x: number, now: number) => void;
  tone: (freq: number, duration?: number, volume?: number) => void;
};

const beginMode = (a: PackAnimal, mode: DragonMode, now: number, duration: number) => {
  a.mode = mode;
  a.modeStarted = now;
  a.modeUntil = now + duration;
  a.landing = false;
  if (mode === "fly") a.y = Math.min(a.y, a.groundY - 42);
  if (mode === "attack") a.y = Math.min(a.y, a.groundY - 18);
  if (mode === "idle" || mode === "walk" || mode === "run" || mode === "sleep") a.y = a.groundY;
  if (mode === "idle" || mode === "sleep") a.vx *= 0.5;
  if (mode === "attack") a.vx *= 0.22;
};

const beginTravel = (a: PackAnimal, mode: "walk" | "run" | "fly", now: number, duration: number, targetX: number) => {
  a.targetX = clamp(targetX, a.patrolMin, a.patrolMax);
  beginMode(a, mode, now, duration);
  a.facing = a.targetX >= a.x ? 1 : -1;
};

const packHowl = (pack: PackAnimal[], now: number) => {
  for (const a of pack) {
    if (a.health <= 0) continue;
    a.howlUntil = now + WARG_HOWL_MS;
    a.awarenessUntil = now + 4200;
    beginMode(a, "idle", now, WARG_HOWL_MS);
  }
};

const hitWithSword = (a: PackAnimal, hooks: LaterActHooks, sightY: number) => {
  const pl = hooks.player;
  const swingProgress = (hooks.now - hooks.swingStarted) / 360;
  if (!(hooks.swingDamage > 0 && hooks.swingUntil > hooks.now && swingProgress > 0.14 && swingProgress < 0.9 && a.lastPlayerAttack !== hooks.swingStarted)) return;
  const targetAngle = Math.atan2(sightY - (pl.y + 38), a.x - pl.x);
  const angleDifference = Math.atan2(Math.sin(targetAngle - hooks.swingAngle), Math.cos(targetAngle - hooks.swingAngle));
  const distance = Math.hypot(a.x - pl.x, sightY - (pl.y + 38));
  if (distance < 168 && Math.abs(angleDifference) < 0.9) {
    a.lastPlayerAttack = hooks.swingStarted;
    hooks.companionAttack(a.x, hooks.now);
    a.health = Math.max(0, a.health - hooks.swingDamage);
    a.hurtStarted = hooks.now;
    a.hurtUntil = hooks.now + 480;
    a.hitDirection = a.x >= pl.x ? 1 : -1;
    a.lastDamage = hooks.swingDamage;
    if (a.health === 0) {
      a.angry = false;
      a.awarenessUntil = 0;
      a.attackLanded = true;
      a.vx *= 0.25;
      beginMode(a, "sleep", hooks.now, 999999999);
      hooks.tone(80, 0.24, 0.036);
      return;
    }
    a.angry = true;
    a.howlUntil = 0;
    a.awarenessUntil = hooks.now + 7000;
    if (a.mode !== "attack") {
      a.facing = pl.x >= a.x ? 1 : -1;
      a.attackLanded = false;
      beginMode(a, "attack", hooks.now, 920);
    }
    hooks.tone(110, 0.08, 0.03);
  }
};

export function updateAshWargs(pack: PackAnimal[], hooks: LaterActHooks) {
  if (!hooks.started || hooks.map !== 5) return;
  const pl = hooks.player;
  const now = hooks.now;
  const dt = hooks.dt;
  for (const warg of pack) {
    if (warg.health <= 0) {
      warg.angry = false;
      warg.vx += (0 - warg.vx) * (1 - Math.exp(-7 * dt));
      warg.x += warg.vx * dt;
      warg.y += (warg.groundY - warg.y) * (1 - Math.exp(-8 * dt));
      continue;
    }
    hitWithSword(warg, hooks, warg.mode === "fly" ? warg.y - 18 : warg.y - 28);
    if (warg.health <= 0) {
      packHowl(
        pack.filter((other) => other !== warg),
        now
      );
      continue;
    }
    const playerDistance = Math.abs(pl.x - warg.x);
    const sightDistance = Math.hypot(pl.x - warg.x, pl.y + hooks.PH * 0.45 - (warg.y - 24));
    if (warg.angry && (pl.health <= 0 || sightDistance > WARG_SIGHT_RANGE)) {
      warg.angry = false;
      if (warg.mode !== "attack") beginMode(warg, "idle", now, 1400);
    }
    if (!warg.angry && warg.howlUntil === 0 && playerDistance < 420 && pl.health > 0) {
      packHowl(pack, now);
      warg.facing = pl.x >= warg.x ? 1 : -1;
    }
    if (warg.howlUntil > 0) {
      warg.facing = pl.x >= warg.x ? 1 : -1;
      warg.vx += (0 - warg.vx) * (1 - Math.exp(-8 * dt));
      if (now >= warg.howlUntil) {
        warg.howlUntil = 0;
        warg.angry = true;
        warg.awarenessUntil = now + 8000;
        beginTravel(warg, "run", now, 900, pl.x);
      }
      continue;
    }
    if (warg.mode === "attack") {
      if (playerDistance > 16) warg.facing = pl.x >= warg.x ? 1 : -1;
      warg.vx += (0 - warg.vx) * (1 - Math.exp(-9 * dt));
      const lunge = clamp((now - warg.modeStarted - 280) / 220, 0, 1);
      warg.x += warg.facing * lunge * 96 * dt * 3.2;
      warg.y += (warg.groundY - 8 - Math.sin(lunge * Math.PI) * 16 - warg.y) * (1 - Math.exp(-10 * dt));
      if (!warg.attackLanded && now - warg.modeStarted > 420) {
        const forward = (pl.x - warg.x) * warg.facing;
        const vertical = Math.abs(pl.y + 42 - warg.y);
        if (forward > -10 && forward < 124 && vertical < 100 && hooks.playerRespawnAt === 0) {
          hooks.setPlayerHealth(Math.max(0, pl.health - warg.attackDamage));
          hooks.setPlayerHurtUntil(now + 340);
          hooks.companionAttack(warg.x, now);
          if (pl.health - warg.attackDamage <= 0) {
            warg.angry = false;
            hooks.setPlayerRespawnAt(now + 950);
          }
          hooks.tone(74, 0.18, 0.032);
        }
        warg.attackLanded = true;
      }
      if (now >= warg.modeUntil) {
        if (warg.angry && pl.health > 0 && sightDistance <= WARG_SIGHT_RANGE) {
          if (playerDistance <= WARG_ATTACK_RANGE + 12) {
            warg.facing = pl.x >= warg.x ? 1 : -1;
            warg.attackLanded = false;
            beginMode(warg, "attack", now, 920);
          } else {
            warg.targetX = clamp(pl.x, warg.patrolMin, warg.patrolMax);
            beginMode(warg, "run", now, 800);
            warg.facing = pl.x >= warg.x ? 1 : -1;
          }
        } else {
          warg.angry = false;
          beginMode(warg, "idle", now, 1200);
        }
      }
      continue;
    }
    if (warg.angry) {
      if (playerDistance > 16) warg.facing = pl.x >= warg.x ? 1 : -1;
      if (playerDistance <= WARG_ATTACK_RANGE) {
        warg.attackLanded = false;
        beginMode(warg, "attack", now, 920);
        continue;
      }
      warg.targetX = clamp(pl.x, warg.patrolMin, warg.patrolMax);
      if (warg.mode !== "run" && warg.mode !== "fly") beginMode(warg, "run", now, 800);
      else warg.modeUntil = now + 800;
    } else if (now >= warg.modeUntil) {
      const roll = Math.random();
      const randomTarget = warg.patrolMin + 20 + Math.random() * (warg.patrolMax - warg.patrolMin - 40);
      if (roll < 0.34) beginMode(warg, "idle", now, 1600 + Math.random() * 1400);
      else if (roll < 0.7) beginTravel(warg, "walk", now, 1800, randomTarget);
      else if (roll < 0.88) beginTravel(warg, "run", now, 900, randomTarget);
      else beginMode(warg, "sleep", now, 3600);
    }
    if (warg.mode === "walk" || warg.mode === "run" || warg.mode === "fly") {
      const distanceToTarget = warg.targetX - warg.x;
      if (Math.abs(distanceToTarget) > 14) warg.facing = distanceToTarget >= 0 ? 1 : -1;
      if (warg.mode !== "fly" && Math.abs(distanceToTarget) < 12) {
        if (warg.angry) warg.vx += (0 - warg.vx) * (1 - Math.exp(-7 * dt));
        else beginMode(warg, "idle", now, 1100);
      } else {
        const speed = warg.mode === "walk" ? 52 : warg.mode === "run" ? (warg.angry ? 176 : 132) : 96;
        warg.vx += (warg.facing * speed - warg.vx) * (1 - Math.exp(-(warg.mode === "run" ? 6 : 4) * dt));
        warg.x += warg.vx * dt;
        if (warg.x <= warg.patrolMin) {
          warg.x = warg.patrolMin;
          warg.targetX = warg.patrolMax;
          warg.facing = 1;
        }
        if (warg.x >= warg.patrolMax) {
          warg.x = warg.patrolMax;
          warg.targetX = warg.patrolMin;
          warg.facing = -1;
        }
        warg.y += (warg.groundY - warg.y) * (1 - Math.exp(-10 * dt));
      }
    } else {
      warg.vx += (0 - warg.vx) * (1 - Math.exp(-8 * dt));
      warg.y += (warg.groundY - warg.y) * (1 - Math.exp(-12 * dt));
    }
  }
}

export function updateEmberWyrmling(wyrm: PackAnimal, hooks: LaterActHooks) {
  if (!hooks.started || hooks.map !== 6) return;
  const pl = hooks.player;
  const now = hooks.now;
  const dt = hooks.dt;
  if (wyrm.health <= 0) {
    wyrm.angry = false;
    wyrm.vx += (0 - wyrm.vx) * (1 - Math.exp(-7 * dt));
    wyrm.x += wyrm.vx * dt;
    wyrm.y += (wyrm.groundY - wyrm.y) * (1 - Math.exp(-8 * dt));
    return;
  }
  hitWithSword(wyrm, hooks, wyrm.mode === "fly" || wyrm.mode === "attack" ? wyrm.y : wyrm.y - 54);
  if (wyrm.health <= 0) return;
  const playerDistance = Math.abs(pl.x - wyrm.x);
  const sightDistance = Math.hypot(pl.x - wyrm.x, pl.y + hooks.PH * 0.45 - (wyrm.y - 48));
  if (wyrm.angry && (pl.health <= 0 || sightDistance > WYRM_SIGHT_RANGE)) {
    wyrm.angry = false;
    if (wyrm.mode !== "attack") beginMode(wyrm, "idle", now, 1600);
  }
  if (wyrm.mode === "attack") {
    if (playerDistance > 20) wyrm.facing = pl.x >= wyrm.x ? 1 : -1;
    wyrm.vx += (0 - wyrm.vx) * (1 - Math.exp(-9 * dt));
    const attackY = wyrm.groundY - 54 + Math.sin((now - wyrm.modeStarted) * 0.012) * 3;
    wyrm.y += (attackY - wyrm.y) * (1 - Math.exp(-9 * dt));
    if (!wyrm.attackLanded && now - wyrm.modeStarted > 560) {
      const forward = (pl.x - wyrm.x) * wyrm.facing;
      const vertical = Math.abs(pl.y + 42 - wyrm.y);
      if (forward > -12 && forward < 135 && vertical < 112 && hooks.playerRespawnAt === 0) {
        hooks.setPlayerHealth(Math.max(0, pl.health - wyrm.attackDamage));
        hooks.setPlayerHurtUntil(now + 360);
        hooks.companionAttack(wyrm.x, now);
        if (pl.health - wyrm.attackDamage <= 0) {
          wyrm.angry = false;
          hooks.setPlayerRespawnAt(now + 950);
        }
        hooks.tone(68, 0.2, 0.036);
      }
      wyrm.attackLanded = true;
    }
    if (now >= wyrm.modeUntil) {
      if (wyrm.angry && pl.health > 0 && sightDistance <= WYRM_SIGHT_RANGE) {
        if (playerDistance <= WYRM_ATTACK_RANGE + 18) {
          wyrm.facing = pl.x >= wyrm.x ? 1 : -1;
          wyrm.attackLanded = false;
          beginMode(wyrm, "attack", now, 1080);
        } else {
          wyrm.targetX = clamp(pl.x, wyrm.patrolMin, wyrm.patrolMax);
          beginMode(wyrm, "run", now, 900);
          wyrm.facing = pl.x >= wyrm.x ? 1 : -1;
        }
      } else {
        wyrm.angry = false;
        beginMode(wyrm, "idle", now, 1400);
      }
    }
    return;
  }
  if (wyrm.angry) {
    if (playerDistance > 20) wyrm.facing = pl.x >= wyrm.x ? 1 : -1;
    if (playerDistance <= WYRM_ATTACK_RANGE) {
      wyrm.attackLanded = false;
      beginMode(wyrm, "attack", now, 1080);
      return;
    }
    wyrm.targetX = clamp(pl.x, wyrm.patrolMin, wyrm.patrolMax);
    if (wyrm.mode !== "run" && wyrm.mode !== "fly") beginMode(wyrm, playerDistance > 280 ? "fly" : "run", now, 900);
    else wyrm.modeUntil = now + 900;
  } else if (wyrm.mode === "fly" && now >= wyrm.modeUntil) {
    if (!wyrm.landing) {
      wyrm.landing = true;
      wyrm.modeUntil = now + 760;
    } else beginMode(wyrm, "idle", now, 1500);
  } else if (now >= wyrm.modeUntil) {
    const roll = Math.random();
    const randomTarget = wyrm.patrolMin + 40 + Math.random() * (wyrm.patrolMax - wyrm.patrolMin - 80);
    if (roll < 0.3) beginMode(wyrm, "idle", now, 1800);
    else if (roll < 0.55) beginTravel(wyrm, "walk", now, 2200, randomTarget);
    else if (roll < 0.75) beginTravel(wyrm, "run", now, 1100, randomTarget);
    else beginTravel(wyrm, "fly", now, 2400, randomTarget);
  }
  if (wyrm.mode === "walk" || wyrm.mode === "run" || wyrm.mode === "fly") {
    const distanceToTarget = wyrm.targetX - wyrm.x;
    if (Math.abs(distanceToTarget) > 18) wyrm.facing = distanceToTarget >= 0 ? 1 : -1;
    const speed = wyrm.mode === "walk" ? 36 : wyrm.mode === "run" ? (wyrm.angry ? 118 : 90) : 62;
    wyrm.vx += (wyrm.facing * (wyrm.mode === "fly" && wyrm.landing ? speed * 0.45 : speed) - wyrm.vx) * (1 - Math.exp(-4.2 * dt));
    wyrm.x += wyrm.vx * dt;
    if (wyrm.x <= wyrm.patrolMin) {
      wyrm.x = wyrm.patrolMin;
      wyrm.facing = 1;
    }
    if (wyrm.x >= wyrm.patrolMax) {
      wyrm.x = wyrm.patrolMax;
      wyrm.facing = -1;
    }
    const targetY =
      wyrm.mode === "fly" ? (wyrm.landing ? wyrm.groundY - 45 : wyrm.groundY - 118 + Math.sin(now * 0.0045) * 11) : wyrm.groundY;
    wyrm.y += (targetY - wyrm.y) * (1 - Math.exp(-(wyrm.mode === "fly" ? 4.6 : 13) * dt));
  } else {
    wyrm.vx += (0 - wyrm.vx) * (1 - Math.exp(-8 * dt));
    wyrm.y += (wyrm.groundY - wyrm.y) * (1 - Math.exp(-12 * dt));
  }
}

export function drawLaterActBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  now: number,
  map: number,
  cameraX: number,
  worldW: number
) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  if (map === 5) {
    g.addColorStop(0, "#12151a");
    g.addColorStop(0.42, "#2a3036");
    g.addColorStop(0.72, "#3d3a34");
    g.addColorStop(1, "#2a2620");
  } else {
    g.addColorStop(0, "#1a100c");
    g.addColorStop(0.4, "#3a2218");
    g.addColorStop(0.7, "#5a2e1c");
    g.addColorStop(1, "#2a1410");
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  if (map === 5) {
    const moonX = w * 0.72;
    const moonY = h * 0.16;
    const moon = ctx.createRadialGradient(moonX, moonY, 8, moonX, moonY, 90);
    moon.addColorStop(0, "rgba(214,220,198,.55)");
    moon.addColorStop(0.35, "rgba(186,196,160,.18)");
    moon.addColorStop(1, "rgba(186,196,160,0)");
    ctx.fillStyle = moon;
    ctx.fillRect(moonX - 100, moonY - 100, 200, 200);
    ctx.fillStyle = "#d6dcb8";
    ctx.beginPath();
    ctx.arc(moonX, moonY, 18, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 22; i++) {
      const ax = ((i * 211 + now * 0.012 + cameraX * 0.04) % (w + 80)) - 40;
      const ay = (i * 47 + now * 0.018) % (h * 0.62);
      ctx.fillStyle = "rgba(214,210,198," + (0.08 + (i % 4) * 0.04) + ")";
      ctx.fillRect(ax, ay, 2 + (i % 3), 2);
    }
    ctx.fillStyle = "rgba(40,42,38,.45)";
    for (let i = 0; i < 8; i++) {
      const rx = ((i * 370 - cameraX * 0.18) % (w + 200)) - 80;
      ctx.fillRect(rx, h * 0.48, 18 + (i % 5) * 8, h * 0.22);
      ctx.fillRect(rx + 6, h * 0.4, 8, h * 0.1);
    }
  } else {
    const heartX = w * 0.5 - (cameraX / Math.max(1, worldW)) * 40;
    const heartY = h * 0.62;
    const glow = ctx.createRadialGradient(heartX, heartY, 10, heartX, heartY, 260);
    glow.addColorStop(0, "rgba(224,96,48,.28)");
    glow.addColorStop(0.45, "rgba(160,48,28,.12)");
    glow.addColorStop(1, "rgba(160,48,28,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(heartX - 280, heartY - 220, 560, 440);
    for (let i = 0; i < 16; i++) {
      const spark = 0.12 + Math.max(0, Math.sin(now * 0.003 + i)) * 0.35;
      ctx.fillStyle = "rgba(255,170,90," + spark + ")";
      ctx.fillRect((i * 173 + now * 0.02) % w, h * (0.5 + (i % 5) * 0.04), 5 + (i % 3), 2);
    }
    ctx.fillStyle = "rgba(20,10,8,.5)";
    for (let i = 0; i < 6; i++) {
      const rx = ((i * 420 - cameraX * 0.22) % (w + 240)) - 90;
      ctx.fillRect(rx, h * 0.46, 22 + (i % 4) * 10, h * 0.28);
    }
  }
}

export function laterActPlatformColors(map: number) {
  if (map === 5) {
    return {
      cap: "#c8c2b0",
      cap2: "#9a9484",
      body0: "#8a8478",
      body1: "#5a564c",
      body2: "#3a3832",
      body3: "#1e1c18",
      rock: "#6a6458",
      crack: "rgba(18,16,14,.7)",
      shimmer: "rgba(214,210,190,"
    };
  }
  return {
    cap: "#e8a060",
    cap2: "#c07040",
    body0: "#a85830",
    body1: "#7a3a22",
    body2: "#4a2418",
    body3: "#241410",
    rock: "#8a4030",
    crack: "rgba(80,20,12,.5)",
    shimmer: "rgba(255,170,90,"
  };
}

export function drawAshWarg(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  groundY: number,
  facing: 1 | -1,
  mode: DragonMode,
  elapsed: number,
  now: number,
  size: number,
  hurt: boolean,
  howling: boolean
) {
  const scale = size / 90;
  const runCycle = (elapsed / (mode === "run" ? 90 : 160)) % 1;
  const gait = Math.sin(runCycle * Math.PI * 2);
  const leap = mode === "fly" ? Math.sin(clamp(elapsed / 700, 0, 1) * Math.PI) : 0;
  const attack = mode === "attack" ? clamp(elapsed / 920, 0, 1) : 0;
  const sleep = mode === "sleep";
  const bob = mode === "idle" ? Math.sin(now * 0.005) * 1.4 : mode === "walk" || mode === "run" ? Math.abs(gait) * 2 : 0;
  const lunge = attack > 0.32 && attack < 0.72 ? (attack - 0.32) / 0.4 : 0;
  const tail = sleep ? 0.9 : mode === "attack" ? -0.55 : 0.35 + Math.sin(now * 0.008 + elapsed * 0.01) * 0.55;
  ctx.save();
  ctx.fillStyle = "rgba(40,38,34," + (0.45 - leap * 0.25) + ")";
  ctx.beginPath();
  ctx.ellipse(x, groundY + 3, 24 * (1 - leap * 0.4) * scale, 5 * (1 - leap * 0.35) * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(x + facing * lunge * 18, y - bob - leap * 8);
  ctx.rotate(facing * (sleep ? 0.15 : howling ? -0.22 : mode === "attack" ? -0.12 + lunge * 0.35 : gait * 0.04));
  ctx.scale(facing * scale, scale);
  const fur = "#8a8680",
    furDark = "#4a463e",
    furLight = "#d4cbb8",
    bone = "#e8dcc8",
    outline = "#1a1814",
    eye = "#8a3a32";
  if (hurt && Math.floor(now / 45) % 2 === 0) ctx.globalAlpha = 0.55;
  const drawLimb = (lx: number, ly: number, lw: number, lh: number, rot: number) => {
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(rot);
    ctx.fillStyle = outline;
    ctx.fillRect(-lw / 2 - 1, -1, lw + 2, lh + 2);
    ctx.fillStyle = furDark;
    ctx.fillRect(-lw / 2, 0, lw, lh);
    ctx.restore();
  };
  if (sleep) {
    ctx.fillStyle = outline;
    ctx.beginPath();
    ctx.ellipse(0, -10, 24, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.ellipse(0, -10, 22, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = bone;
    ctx.beginPath();
    ctx.ellipse(6, -8, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  const frontSwing = mode === "idle" ? 0.08 : gait * 0.7;
  const backSwing = mode === "idle" ? -0.08 : -gait * 0.7;
  drawLimb(-12, 8, 6, 18, backSwing);
  drawLimb(-6, 8, 6, 17, backSwing * 0.7 + 0.15);
  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.ellipse(0, -6, 21, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(0, -6, 19, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = furLight;
  ctx.beginPath();
  ctx.ellipse(3, -8, 12, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = bone;
  ctx.beginPath();
  ctx.ellipse(8, -2, 8, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(-16, -6);
  ctx.rotate(tail);
  ctx.fillStyle = outline;
  ctx.fillRect(-3, -3, 20, 8);
  ctx.fillStyle = furDark;
  ctx.fillRect(-2, -2, 18, 6);
  ctx.fillStyle = "#8a3a32";
  ctx.fillRect(10, -1, 7, 4);
  ctx.restore();
  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.ellipse(16, -14, 12, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(16, -14, 10.5, 8.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = bone;
  ctx.fillRect(20, -16, 7, 5);
  ctx.save();
  ctx.translate(12, -22);
  ctx.rotate(-0.2);
  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(4, -14);
  ctx.lineTo(8, 1);
  ctx.fill();
  ctx.fillStyle = furLight;
  ctx.beginPath();
  ctx.moveTo(1, 0);
  ctx.lineTo(4, -12);
  ctx.lineTo(7, 1);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = eye;
  ctx.beginPath();
  ctx.ellipse(20, -16, 2.4, 2.1, 0, 0, Math.PI * 2);
  ctx.fill();
  if (howling) {
    ctx.fillStyle = bone;
    ctx.fillRect(26, -13, 5, 3);
    ctx.strokeStyle = "rgba(232,220,200,.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(30, -12, 8 + Math.sin(now * 0.02) * 2, -0.6, 0.6);
    ctx.stroke();
  }
  drawLimb(8, 9, 6, 17, frontSwing);
  drawLimb(14, 9, 5, 16, frontSwing * 0.75 - 0.1);
  ctx.restore();
}

export function drawEmberWyrmlingSprite(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  frame: DragonFrame,
  wyrm: PackAnimal,
  now: number,
  size: number
) {
  if (!image.complete || !image.naturalWidth) return;
  const spriteScale = size / WYRM_CELL;
  const airHeight = clamp((wyrm.groundY - wyrm.y) / 125, 0, 1);
  const hurtActive = wyrm.hurtUntil > now;
  const hurtProgress = hurtActive ? clamp((now - wyrm.hurtStarted) / 520, 0, 1) : 1;
  const hurtPulse = hurtActive ? Math.sin(hurtProgress * Math.PI) : 0;
  const recoilX = hurtPulse * 12 * wyrm.hitDirection;
  ctx.save();
  ctx.fillStyle = "rgba(40,12,8," + (0.58 - airHeight * 0.22) + ")";
  ctx.beginPath();
  ctx.ellipse(wyrm.x, wyrm.groundY + 3, 35 * (1 - airHeight * 0.46), 7 * (1 - airHeight * 0.46), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(wyrm.x + recoilX, wyrm.y);
  ctx.scale(wyrm.facing * (1 + hurtPulse * 0.08), 1 - hurtPulse * 0.08);
  ctx.globalAlpha = hurtActive && Math.floor(now / 48) % 2 === 0 ? 0.52 : 1;
  ctx.filter = "sepia(.35) hue-rotate(-18deg) saturate(1.35) brightness(.92)";
  ctx.shadowColor = hurtActive
    ? "rgba(255,220,140,.95)"
    : wyrm.mode === "attack"
      ? "rgba(255,120,48,.7)"
      : wyrm.angry
        ? "rgba(224,80,40,.58)"
        : "rgba(224,112,48,.28)";
  ctx.shadowBlur = hurtActive ? 24 : wyrm.angry ? 14 : 8;
  ctx.drawImage(
    image,
    frame.x,
    frame.y,
    frame.w,
    frame.h,
    -frame.anchorX * spriteScale,
    -frame.anchorY * spriteScale,
    frame.w * spriteScale,
    frame.h * spriteScale
  );
  ctx.filter = "none";
  ctx.restore();
}

export function laterActPortalPrompt(map: number, x: number): string | null {
  if (map === 4 && Math.abs(x - (MAP5_EXIT_X + 55)) < 145) return "Enter Ashfall Crater";
  if (map === 5 && Math.abs(x - (MAP5_ENTRY_X + 55)) < 145) return "Return to Moonwell Cliffs";
  if (map === 5 && Math.abs(x - (MAP5_EXIT_X + 55)) < 145) return "Enter the Heart of Ash";
  if (map === 6 && Math.abs(x - (MAP6_ENTRY_X + 55)) < 145) return "Return to Ashfall Crater";
  return null;
}

export function laterActPickupPrompt(
  map: number,
  x: number,
  yBottom: number,
  wargs: PackAnimal[],
  wyrm: PackAnimal,
  now: number,
  wargTaken: boolean,
  wyrmTaken: boolean,
  full: boolean
): string | null {
  if (map === 5 && !wargTaken) {
    const ready = wargs.find(
      (w) => w.health <= 0 && now - w.modeStarted > 900 && Math.abs(x - w.x) < 105 && Math.abs(yBottom - w.groundY) < 85
    );
    if (ready) return full ? "Inventory full" : "Pick up Ash Warg card";
  }
  if (map === 6 && !wyrmTaken && wyrm.health <= 0 && now - wyrm.modeStarted > 900 && Math.abs(x - wyrm.x) < 105 && Math.abs(yBottom - wyrm.groundY) < 85) {
    return full ? "Inventory full" : "Pick up Ember Wyrmling card";
  }
  return null;
}
