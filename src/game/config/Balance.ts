/**
 * NOVASTRIKE — game balancing configuration.
 *
 * Every tunable number in the game lives here. Change values, refresh, play.
 * Units: pixels are 320x180 screen-space pixels, time in milliseconds unless
 * stated, speeds in px/sec, damage in hit points.
 */

export const SCREEN = { W: 320, H: 180 } as const;

/* ------------------------------- player ------------------------------- */

export const PLAYER = {
  speed: 105,                // px/s, 8-way
  hitboxW: 10,               // tiny core hitbox — classic shmup fairness
  hitboxH: 5,
  startLives: 3,
  maxLives: 6,
  startBombs: 2,
  maxBombs: 5,
  startShield: 2,            // hits absorbed before the hull is exposed
  maxShield: 4,
  respawnDelayMs: 1100,
  respawnInvulnMs: 2600,
  invulnStarMs: 6000,        // '*' power-up
  deathWeaponPenalty: 2,     // weapon levels lost on death (min level 1)
  extraLifeEvery: 50000,     // score interval for a free 1UP
  crashDamageToEnemy: 4,     // ramming hurts them too
};

/* ------------------------------ weapons ------------------------------- */

export type WeaponId = 'laser' | 'spread' | 'plasma' | 'homing' | 'beam' | 'lightning';

export interface WeaponTuning {
  name: string;
  /** ms between shots/ticks, per level (index 0 = level 1) */
  fireDelay: number[];
  /** damage per bullet / per beam-second / per lightning hit */
  damage: number[];
  bulletSpeed: number;
}

export const WEAPON_MAX_LEVEL = 4;

export const WEAPONS: Record<WeaponId, WeaponTuning> = {
  laser: {
    name: 'TWIN LASER',
    fireDelay: [150, 130, 110, 95],
    damage: [1, 1, 1, 1],          // streams scale with level instead
    bulletSpeed: 300,
  },
  spread: {
    name: 'SPREAD SHOT',
    fireDelay: [210, 190, 175, 160],
    damage: [1, 1, 1, 1],          // 3/4/5/6-way
    bulletSpeed: 250,
  },
  plasma: {
    name: 'PLASMA CANNON',
    fireDelay: [430, 400, 370, 340],
    damage: [4, 5, 6, 8],          // piercing orbs
    bulletSpeed: 170,
  },
  homing: {
    name: 'HOMING MISSILES',
    fireDelay: [330, 300, 270, 240],
    damage: [2, 2, 3, 3],          // 2/2/3/4 missiles per volley
    bulletSpeed: 215,
  },
  beam: {
    name: 'BEAM WEAPON',
    fireDelay: [50, 50, 50, 50],   // damage tick interval while held
    damage: [1.1, 1.5, 1.9, 2.4],  // per tick, full-width ray
    bulletSpeed: 0,
  },
  lightning: {
    name: 'LIGHTNING',
    fireDelay: [340, 310, 280, 250],
    damage: [5, 6, 7, 8],          // first target; chains do 60%
    bulletSpeed: 0,
  },
};

export const LIGHTNING = { range: 150, chainRange: 70, chains: [1, 2, 3, 4], chainFalloff: 0.6 };
export const BEAM = { halfHeight: 3, hitFlashMs: 60 };
export const HOMING = { turnRateDeg: 240, lifeMs: 2600 };

/* ------------------------------- enemies ------------------------------ */

export interface EnemyTuning {
  hp: number;
  score: number;
  speed: number;          // base horizontal px/s (leftward)
  fireDelay?: number;     // ms between shots, 0/undefined = never fires
  crashDamage: number;    // shield hits dealt on contact
  dropChance: number;     // 0..1 chance of any power-up
}

export const ENEMIES: Record<string, EnemyTuning> = {
  fighter:   { hp: 2,  score: 100, speed: 80,  fireDelay: 0,    crashDamage: 1, dropChance: 0.06 },
  sine:      { hp: 2,  score: 120, speed: 70,  fireDelay: 2600, crashDamage: 1, dropChance: 0.07 },
  kamikaze:  { hp: 2,  score: 150, speed: 60,  fireDelay: 0,    crashDamage: 1, dropChance: 0.05 },
  drone:     { hp: 1,  score: 80,  speed: 75,  fireDelay: 0,    crashDamage: 1, dropChance: 0.04 },
  turret:    { hp: 8,  score: 300, speed: 0,   fireDelay: 1700, crashDamage: 1, dropChance: 0.14 },
  gunship:   { hp: 16, score: 500, speed: 34,  fireDelay: 1500, crashDamage: 2, dropChance: 0.25 },
  launcher:  { hp: 12, score: 450, speed: 30,  fireDelay: 2300, crashDamage: 2, dropChance: 0.25 },
  elite:     { hp: 26, score: 800, speed: 40,  fireDelay: 1200, crashDamage: 2, dropChance: 0.5  },
  astBig:    { hp: 6,  score: 50,  speed: 46,  fireDelay: 0,    crashDamage: 2, dropChance: 0.05 },
  astMed:    { hp: 3,  score: 30,  speed: 56,  fireDelay: 0,    crashDamage: 1, dropChance: 0.03 },
  astSmall:  { hp: 1,  score: 20,  speed: 66,  fireDelay: 0,    crashDamage: 1, dropChance: 0.01 },
};

export const ELITE_SHIELD = { hp: 12, regenDelayMs: 3500, regenPerSec: 4 };
export const KAMIKAZE = { lockRange: 150, dashSpeed: 215 };

/* ------------------------------- bosses ------------------------------- */

export const MINIBOSS = {
  drill:  { hp: 200, score: 5000 },
  spore:  { hp: 230, score: 5000 },
  sentry: { hp: 260, score: 6000 },
};

export const BOSS = {
  crusher: { hp: 620,  score: 20000, bodyArmor: 0.35 }, // armour = dmg multiplier off weak point
  queen:   { hp: 780,  score: 30000, bodyArmor: 0.35 },
  fortress:{ hp: 1050, score: 50000, bodyArmor: 0.25 },
  warningMs: 2400,
  entranceMs: 2600,
};

/* ------------------------------ power-ups ----------------------------- */

export const POWERUP = {
  driftSpeed: 32,
  bobAmp: 9,
  lifeMs: 14000,
  /** weighted random table for generic drops (letter -> weight) */
  table: [
    ['U', 26], ['S', 12], ['P', 10], ['H', 10], ['B', 8], ['L', 8],
    ['E', 14], ['X', 7], ['I', 3], ['1', 2],
  ] as Array<[string, number]>,
};

export const SMART_BOMB = { damage: 24, bossDamagePct: 0.06, flashMs: 320 };

/* ----------------------------- difficulty ----------------------------- */

/**
 * Global difficulty index d:
 *   d = levelBase + elapsedSec * ramp   (survival ramps forever)
 * Applied at spawn time:
 *   hp        *= 1 + 0.13 d
 *   speed     *= 1 + 0.05 d
 *   fireDelay /= 1 + 0.10 d
 *   bulletSpd *= 1 + 0.06 d
 */
export const DIFFICULTY = {
  levelBase: [0, 1.1, 2.3],
  rampPerSec: 0.011,
  survivalRampPerSec: 0.02,
  cap: 7,
  hpScale: 0.13,
  speedScale: 0.05,
  fireScale: 0.1,
  bulletScale: 0.06,
  enemyBulletSpeed: 92,
};

/* ------------------------------ scrolling ----------------------------- */

export const SCROLL = {
  base: 30,                 // world scroll px/s (parallax reference)
  bossSlowdown: 0.35,       // parallax multiplier during boss fights
  layerSpeeds: [0.12, 0.3, 0.55, 1.35, 1.0], // stars, nebula, terrain, foreground, play
};

/* ------------------------------- scoring ------------------------------ */

export const SCORING = {
  stageClearBombBonus: 1000,
  stageClearLifeBonus: 500,
  survivalPerSec: 12,
};
