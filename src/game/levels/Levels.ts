/**
 * NOVASTRIKE — level scripts.
 *
 * Each level is a time-keyed list of spawn events: warm-up waves, mixed
 * pressure, mini-boss, second act, end boss. Times are seconds of level
 * clock (the clock pauses while a boss is alive).
 */

import Phaser from 'phaser';
import { LevelDef, LevelEvent } from './Types';
import { CombatScene } from '../enemies/Enemy';
import {
  spawnAsteroid,
  spawnDroneSnake,
  spawnElite,
  spawnFighter,
  spawnGunship,
  spawnKamikaze,
  spawnLauncher,
  spawnSine,
  spawnTurret,
  spawnVee,
} from '../enemies/Enemy';
import { DrillCarrier, SporeBulb, TwinSentry } from '../bosses/MiniBosses';
import { CoreCrusher, FortressCore, HiveQueen } from '../bosses/EndBosses';
import { SCREEN } from '../config/Balance';

const H = SCREEN.H;
const ry = (lo = 22, hi = H - 22) => Phaser.Math.Between(lo, hi);

function w(at: number, spawn: (s: CombatScene) => void): LevelEvent {
  return { at, type: 'wave', spawn };
}
function txt(at: number, msg: string): LevelEvent {
  return { at, type: 'text', msg };
}

/** n fighters in a column, staggered */
function fighterWave(s: CombatScene, n: number, y: number, gapMs = 240): void {
  for (let i = 0; i < n; i++)
    s.time.delayedCall(i * gapMs, () => s.scene.isActive() && spawnFighter(s, y));
}

/* ------------------------------------------------------------------ */
/*  LEVEL 1 — ASTEROID FIELD                                           */
/* ------------------------------------------------------------------ */

const LEVEL_1: LevelDef = {
  name: 'ASTEROID FIELD',
  theme: 0,
  song: 'level0',
  events: [
    txt(0.5, 'STAGE 1: ASTEROID FIELD'),
    w(2.5, (s) => fighterWave(s, 4, 60)),
    w(5.5, (s) => fighterWave(s, 4, 120)),
    w(9, (s) => spawnAsteroid(s, 'big')),
    w(11, (s) => spawnSine(s, 50, 30, 2.2)),
    w(12, (s) => spawnSine(s, 130, 30, 2.2)),
    w(14, (s) => spawnAsteroid(s, 'big')),
    w(15, (s) => spawnAsteroid(s, 'med')),
    w(17, (s) => spawnVee(s, ry(50, 130), 5)),
    w(20, (s) => {
      spawnTurret(s, false);
      spawnAsteroid(s, 'med');
    }),
    w(23, (s) => fighterWave(s, 5, ry())),
    w(26, (s) => {
      spawnKamikaze(s, 40);
      spawnKamikaze(s, 140);
    }),
    w(29, (s) => spawnDroneSnake(s, ry(50, 130), 5, 40)),
    w(33, (s) => {
      spawnAsteroid(s, 'big');
      spawnAsteroid(s, 'big');
    }),
    w(36, (s) => spawnTurret(s, true)),
    w(38, (s) => spawnSine(s, ry(), 36, 2.6)),
    w(41, (s) => spawnGunship(s, ry(50, 130))),
    w(45, (s) => fighterWave(s, 6, ry(), 200)),
    w(49, (s) => {
      spawnKamikaze(s, ry());
      spawnAsteroid(s, 'med');
      spawnAsteroid(s, 'med');
    }),
    w(53, (s) => spawnVee(s, ry(50, 130), 5)),
    w(57, (s) => {
      spawnTurret(s, false);
      spawnTurret(s, true);
    }),
    w(61, (s) => spawnDroneSnake(s, ry(50, 130), 6, 46)),

    { at: 66, type: 'miniboss', spawn: (s) => new DrillCarrier(s) },

    w(70, (s) => fighterWave(s, 5, ry())),
    w(73, (s) => {
      spawnAsteroid(s, 'big');
      spawnAsteroid(s, 'med');
      spawnAsteroid(s, 'med');
    }),
    w(77, (s) => spawnGunship(s, ry(50, 130))),
    w(80, (s) => {
      spawnSine(s, 44, 28, 2.4);
      spawnSine(s, 136, 28, 2.4);
    }),
    w(84, (s) => {
      spawnKamikaze(s, ry());
      spawnKamikaze(s, ry());
    }),
    w(88, (s) => spawnVee(s, ry(50, 130), 7)),
    w(92, (s) => {
      spawnTurret(s, false);
      spawnGunship(s, ry(40, 80));
    }),
    w(96, (s) => spawnDroneSnake(s, ry(50, 130), 6, 52, 170)),
    w(100, (s) => {
      spawnAsteroid(s, 'big');
      spawnAsteroid(s, 'big');
      spawnAsteroid(s, 'med');
    }),
    w(104, (s) => spawnElite(s, ry(50, 130))),
    w(110, (s) => fighterWave(s, 8, ry(), 180)),
    w(114, (s) => {
      spawnKamikaze(s, 36);
      spawnKamikaze(s, 90);
      spawnKamikaze(s, 144);
    }),

    { at: 120, type: 'boss', spawn: (s) => new CoreCrusher(s) },
  ],
};

/* ------------------------------------------------------------------ */
/*  LEVEL 2 — ALIEN PLANET                                             */
/* ------------------------------------------------------------------ */

const LEVEL_2: LevelDef = {
  name: 'ALIEN PLANET',
  theme: 1,
  song: 'level1',
  events: [
    txt(0.5, 'STAGE 2: ALIEN PLANET'),
    w(2.5, (s) => spawnDroneSnake(s, 70, 5, 44)),
    w(5.5, (s) => spawnDroneSnake(s, 110, 5, 44)),
    w(9, (s) => {
      spawnKamikaze(s, 50);
      spawnKamikaze(s, 130);
    }),
    w(12, (s) => spawnSine(s, ry(), 40, 2.8)),
    w(14, (s) => spawnSine(s, ry(), 40, 2.8)),
    w(17, (s) => spawnVee(s, ry(50, 130), 5)),
    w(20, (s) => spawnTurret(s, false)),
    w(22, (s) => spawnLauncher(s, ry(40, 140))),
    w(26, (s) => spawnDroneSnake(s, ry(50, 130), 7, 56, 160)),
    w(30, (s) => {
      spawnKamikaze(s, ry());
      spawnKamikaze(s, ry());
      spawnKamikaze(s, ry());
    }),
    w(34, (s) => spawnGunship(s, ry(50, 130))),
    w(38, (s) => {
      spawnTurret(s, true);
      spawnTurret(s, false);
    }),
    w(42, (s) => spawnElite(s, ry(50, 130))),
    w(47, (s) => fighterWave(s, 6, ry(), 200)),
    w(51, (s) => spawnDroneSnake(s, ry(50, 130), 6, 48)),
    w(55, (s) => {
      spawnLauncher(s, 50);
      spawnLauncher(s, 130);
    }),
    w(60, (s) => spawnVee(s, ry(50, 130), 7)),

    { at: 65, type: 'miniboss', spawn: (s) => new SporeBulb(s) },

    w(69, (s) => spawnDroneSnake(s, ry(50, 130), 6, 50)),
    w(73, (s) => {
      spawnKamikaze(s, ry());
      spawnKamikaze(s, ry());
    }),
    w(76, (s) => {
      spawnSine(s, 46, 34, 3);
      spawnSine(s, 134, 34, 3);
    }),
    w(80, (s) => spawnGunship(s, ry(50, 130))),
    w(83, (s) => spawnLauncher(s, ry(40, 140))),
    w(87, (s) => spawnElite(s, ry(50, 130))),
    w(92, (s) => spawnDroneSnake(s, ry(50, 130), 8, 58, 150)),
    w(96, (s) => {
      spawnTurret(s, true);
      spawnTurret(s, false);
      spawnKamikaze(s, ry());
    }),
    w(101, (s) => fighterWave(s, 8, ry(), 170)),
    w(105, (s) => {
      spawnElite(s, 60);
      spawnLauncher(s, 130);
    }),
    w(111, (s) => {
      spawnKamikaze(s, 36);
      spawnKamikaze(s, 90);
      spawnKamikaze(s, 144);
      spawnVee(s, ry(50, 130), 5);
    }),

    { at: 118, type: 'boss', spawn: (s) => new HiveQueen(s) },
  ],
};

/* ------------------------------------------------------------------ */
/*  LEVEL 3 — SPACE FORTRESS                                           */
/* ------------------------------------------------------------------ */

const LEVEL_3: LevelDef = {
  name: 'SPACE FORTRESS',
  theme: 2,
  song: 'level2',
  events: [
    txt(0.5, 'FINAL STAGE: SPACE FORTRESS'),
    w(2.5, (s) => {
      spawnTurret(s, true);
      spawnTurret(s, false);
    }),
    w(5.5, (s) => fighterWave(s, 5, ry(), 200)),
    w(9, (s) => spawnGunship(s, ry(50, 130))),
    w(12, (s) => spawnLauncher(s, ry(40, 140))),
    w(15, (s) => spawnVee(s, ry(50, 130), 5)),
    w(18, (s) => {
      spawnTurret(s, false);
      spawnSine(s, ry(), 30, 2.6);
    }),
    w(22, (s) => spawnElite(s, ry(50, 130))),
    w(27, (s) => spawnDroneSnake(s, ry(50, 130), 6, 46)),
    w(31, (s) => {
      spawnGunship(s, 56);
      spawnGunship(s, 124);
    }),
    w(36, (s) => {
      spawnKamikaze(s, ry());
      spawnKamikaze(s, ry());
      spawnLauncher(s, ry(40, 140));
    }),
    w(41, (s) => {
      spawnTurret(s, true);
      spawnTurret(s, false);
      spawnVee(s, ry(50, 130), 5);
    }),
    w(46, (s) => spawnElite(s, ry(50, 130))),
    w(51, (s) => fighterWave(s, 7, ry(), 180)),
    w(56, (s) => spawnDroneSnake(s, ry(50, 130), 7, 54, 160)),

    { at: 62, type: 'miniboss', spawn: (s) => new TwinSentry(s) },

    w(66, (s) => {
      spawnGunship(s, ry(50, 130));
      spawnTurret(s, false);
    }),
    w(70, (s) => {
      spawnLauncher(s, 50);
      spawnLauncher(s, 130);
    }),
    w(75, (s) => spawnElite(s, ry(50, 130))),
    w(79, (s) => {
      spawnKamikaze(s, ry());
      spawnKamikaze(s, ry());
      spawnVee(s, ry(50, 130), 7);
    }),
    w(84, (s) => {
      spawnTurret(s, true);
      spawnTurret(s, false);
      spawnSine(s, ry(), 36, 3);
    }),
    w(89, (s) => spawnDroneSnake(s, ry(50, 130), 8, 56, 150)),
    w(94, (s) => {
      spawnGunship(s, 56);
      spawnGunship(s, 124);
      spawnLauncher(s, 90);
    }),
    w(100, (s) => {
      spawnElite(s, 60);
      spawnElite(s, 120);
    }),
    w(107, (s) => {
      fighterWave(s, 8, ry(), 160);
      spawnKamikaze(s, ry());
      spawnKamikaze(s, ry());
    }),

    { at: 114, type: 'boss', spawn: (s) => new FortressCore(s) },
  ],
};

export const LEVELS: LevelDef[] = [LEVEL_1, LEVEL_2, LEVEL_3];

/* ------------------------------------------------------------------ */
/*  SURVIVAL — endless generated waves, mini-boss every ~90 seconds    */
/* ------------------------------------------------------------------ */

const MINIS = [
  (s: CombatScene) => new DrillCarrier(s),
  (s: CombatScene) => new SporeBulb(s),
  (s: CombatScene) => new TwinSentry(s),
];

/** appends the next batch of survival events starting at time t0 */
export function survivalBatch(t0: number, batchIndex: number): LevelEvent[] {
  const out: LevelEvent[] = [];
  let t = t0;
  const intensity = Math.min(6, 1 + batchIndex * 0.5);

  if (batchIndex === 0) out.push(txt(0.5, 'SURVIVAL MODE: HOLD THE LINE'));

  for (let i = 0; i < 8; i++) {
    const roll = Math.random();
    out.push(
      w(t, (s) => {
        if (roll < 0.2) fighterWave(s, 3 + Math.floor(intensity), ry(), 220);
        else if (roll < 0.35) spawnDroneSnake(s, ry(50, 130), 4 + Math.floor(intensity / 2), 48);
        else if (roll < 0.5) {
          spawnAsteroid(s, 'big');
          if (intensity > 2) spawnAsteroid(s, 'med');
        } else if (roll < 0.62) spawnSine(s, ry(), 36, 2.6);
        else if (roll < 0.72) spawnKamikaze(s, ry());
        else if (roll < 0.8) spawnTurret(s, Math.random() < 0.5);
        else if (roll < 0.88) spawnGunship(s, ry(50, 130));
        else if (roll < 0.95) spawnLauncher(s, ry(40, 140));
        else spawnElite(s, ry(50, 130));
      }),
    );
    t += Math.max(2.4, 4.6 - intensity * 0.3);
  }

  // periodic mini-boss pressure
  if ((batchIndex + 1) % 3 === 0) {
    const pick = MINIS[Math.floor(Math.random() * MINIS.length)];
    out.push({ at: t + 1, type: 'miniboss', spawn: pick });
    t += 3;
  }

  return out;
}
