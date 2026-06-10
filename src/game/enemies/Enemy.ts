/**
 * NOVASTRIKE — enemies.
 *
 * One pooled-ish base class (spawned/destroyed; bullets are the hot pool)
 * and factory functions per enemy type. Behaviours are closures so wave
 * scripts read like a level designer's notes.
 */

import Phaser from 'phaser';
import {
  DIFFICULTY,
  ELITE_SHIELD,
  ENEMIES,
  EnemyTuning,
  KAMIKAZE,
  SCREEN,
} from '../config/Balance';
import { fireAimed, fireFan, fireRing, ShooterScene } from './Patterns';
import { rollPowerUp } from '../entities/PowerUp';

export interface CombatScene extends ShooterScene {
  enemies: Phaser.Physics.Arcade.Group;
  difficulty(): number;
  addScore(n: number, x?: number, y?: number): void;
  spawnPowerUp(x: number, y: number, letter?: string): void;
  boom(x: number, y: number, big?: boolean): void;
  scrollSpeed(): number;
}

export type Behavior = (e: Enemy, dt: number) => void;

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  private static NEXT_UID = 1;
  readonly uid = Enemy.NEXT_UID++;
  hp = 1;
  maxHp = 1;
  scoreValue = 0;
  crashDamage = 1;
  dropChance = 0;
  fireDelay = 0;
  fireTimer = 0;
  age = 0;
  behavior: Behavior = () => {};
  onFire: ((e: Enemy) => void) | null = null;
  onDeath: ((e: Enemy) => void) | null = null;
  /** big ships get the big explosion + shake */
  big = false;
  baseY = 0;
  phase = 0;
  /** attached child objects cleaned up with the enemy */
  attachments: Phaser.GameObjects.GameObject[] = [];
  private flashTimer = 0;
  shieldHp = 0;
  shieldRegenWait = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, frame: string) {
    super(scene, x, y, 'sprites', frame);
  }

  get cscene(): CombatScene {
    return this.scene as CombatScene;
  }

  setupFrom(tuning: EnemyTuning): this {
    const d = Math.min(DIFFICULTY.cap, this.cscene.difficulty());
    this.maxHp = this.hp = Math.round(tuning.hp * (1 + DIFFICULTY.hpScale * d));
    this.scoreValue = tuning.score;
    this.crashDamage = tuning.crashDamage;
    this.dropChance = tuning.dropChance;
    this.fireDelay = tuning.fireDelay
      ? tuning.fireDelay / (1 + DIFFICULTY.fireScale * d)
      : 0;
    this.fireTimer = this.fireDelay * (0.4 + Math.random() * 0.6);
    this.setDepth(8);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(Math.max(4, this.width - 4), Math.max(4, this.height - 4));
    return this;
  }

  /** difficulty-scaled speed from tuning */
  scaledSpeed(base: number): number {
    const d = Math.min(DIFFICULTY.cap, this.cscene.difficulty());
    return base * (1 + DIFFICULTY.speedScale * d);
  }

  takeDamage(dmg: number, _hitX?: number, _hitY?: number): boolean {
    if (!this.active) return false;
    if (this.shieldHp > 0) {
      this.shieldHp -= dmg;
      this.shieldRegenWait = ELITE_SHIELD.regenDelayMs;
      this.setTintFill(0x56c4f5);
      this.flashTimer = 50;
      if (this.shieldHp < 0) {
        this.hp += this.shieldHp; // overflow damage
        this.shieldHp = 0;
      }
    } else {
      this.hp -= dmg;
      this.setTintFill(0xffffff);
      this.flashTimer = 50;
    }
    if (this.hp <= 0) {
      this.die(true);
      return true;
    }
    return false;
  }

  die(scored: boolean): void {
    if (!this.active) return;
    const s = this.cscene;
    if (scored) {
      s.boom(this.x, this.y, this.big);
      s.addScore(this.scoreValue, this.x, this.y);
      if (Math.random() < this.dropChance) s.spawnPowerUp(this.x, this.y);
    }
    this.onDeath?.(this);
    for (const a of this.attachments) a.destroy();
    this.attachments.length = 0;
    this.destroy();
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.active) return;
    this.age += delta;
    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      if (this.flashTimer <= 0) this.clearTint();
    }
    if (this.shieldRegenWait > 0) this.shieldRegenWait -= delta;
    this.behavior(this, delta);
    // weapons
    if (this.fireDelay > 0 && this.onFire && this.x < SCREEN.W - 4 && this.x > 8) {
      this.fireTimer -= delta;
      if (this.fireTimer <= 0) {
        this.fireTimer = this.fireDelay;
        this.onFire(this);
      }
    }
    // off-screen cull (left/vertical) — no score
    if (this.x < -60 || this.y < -70 || this.y > SCREEN.H + 70) this.die(false);
  }
}

/* ------------------------------------------------------------------ */
/*  factories                                                           */
/* ------------------------------------------------------------------ */

function make(scene: CombatScene, x: number, y: number, frame: string): Enemy {
  const e = new Enemy(scene, x, y, frame);
  scene.add.existing(e);
  scene.physics.add.existing(e);
  scene.enemies.add(e);
  return e;
}

const RIGHT = SCREEN.W + 20;

export function spawnFighter(scene: CombatScene, y: number, speedMul = 1): Enemy {
  const t = ENEMIES.fighter;
  const e = make(scene, RIGHT, y, 'fighter').setupFrom(t);
  const v = e.scaledSpeed(t.speed) * speedMul;
  e.behavior = (en) => en.setVelocityX(-v);
  return e;
}

export function spawnSine(
  scene: CombatScene,
  y: number,
  amp = 34,
  freq = 2.2,
): Enemy {
  const t = ENEMIES.sine;
  const e = make(scene, RIGHT, y, 'fighter').setupFrom(t);
  e.baseY = y;
  const v = e.scaledSpeed(t.speed);
  e.behavior = (en) => {
    en.setVelocityX(-v);
    en.y = en.baseY + Math.sin((en.age / 1000) * freq) * amp;
  };
  e.onFire = (en) => fireAimed(scene, en.x - 6, en.y, 'pellet', 0.9);
  return e;
}

export function spawnKamikaze(scene: CombatScene, y: number): Enemy {
  const t = ENEMIES.kamikaze;
  const e = make(scene, RIGHT, y, 'kamikaze').setupFrom(t);
  let locked = false;
  const v = e.scaledSpeed(t.speed);
  e.behavior = (en, dt) => {
    en.rotation += dt / 140;
    if (locked) return;
    en.setVelocityX(-v);
    const p = scene.playerPos();
    if (p && en.x > p.x && Phaser.Math.Distance.Between(en.x, en.y, p.x, p.y) < KAMIKAZE.lockRange) {
      locked = true;
      const a = Phaser.Math.Angle.Between(en.x, en.y, p.x, p.y);
      const dash = en.scaledSpeed(KAMIKAZE.dashSpeed);
      en.setVelocity(Math.cos(a) * dash, Math.sin(a) * dash);
      en.setTint(0xffc933);
      scene.time.delayedCall(60, () => en.active && en.clearTint());
    }
  };
  return e;
}

/** snake formation: count drones share a sine path, staggered */
export function spawnDroneSnake(
  scene: CombatScene,
  y: number,
  count = 5,
  amp = 42,
  spacingMs = 190,
): void {
  const t = ENEMIES.drone;
  for (let i = 0; i < count; i++) {
    scene.time.delayedCall(i * spacingMs, () => {
      if (!scene.scene.isActive()) return;
      const e = make(scene, RIGHT, y, 'drone').setupFrom(t);
      e.baseY = y;
      const v = e.scaledSpeed(t.speed);
      e.behavior = (en) => {
        en.setVelocityX(-v);
        en.y = en.baseY + Math.sin((en.age / 1000) * 3 + 0.0) * amp;
      };
    });
  }
}

/** V formation of fighters that breaks into a dive */
export function spawnVee(scene: CombatScene, y: number, count = 5): void {
  const t = ENEMIES.drone;
  const half = Math.floor(count / 2);
  for (let i = 0; i < count; i++) {
    const off = i - half;
    const e = make(scene, RIGHT + Math.abs(off) * 14, y + off * 16, 'drone').setupFrom(t);
    const v = e.scaledSpeed(t.speed * 1.15);
    e.behavior = (en) => {
      en.setVelocityX(-v);
      if (en.x < 140 && en.body!.velocity.y === 0) {
        const p = scene.playerPos();
        en.setVelocityY(p && p.y > en.y ? 46 : -46);
      }
    };
  }
}

/** surface turret (top or bottom edge), aims at the player */
export function spawnTurret(scene: CombatScene, top: boolean): Enemy {
  const t = ENEMIES.turret;
  const y = top ? 5 : SCREEN.H - 5;
  const e = make(scene, RIGHT, y, 'turret-base').setupFrom(t);
  e.setFlipY(top);
  const gun = scene.add.image(e.x, e.y, 'sprites', 'turret-gun').setDepth(7).setOrigin(0.15, 0.5);
  e.attachments.push(gun);
  e.behavior = (en) => {
    en.setVelocityX(-scene.scrollSpeed());
    gun.setPosition(en.x, en.y + (top ? 2 : -2));
    const p = scene.playerPos();
    if (p) gun.setRotation(Phaser.Math.Angle.Between(gun.x, gun.y, p.x, p.y));
  };
  e.onFire = (en) => {
    fireAimed(scene, gun.x + Math.cos(gun.rotation) * 9, gun.y + Math.sin(gun.rotation) * 9, 'shard', 1.05);
  };
  return e;
}

export function spawnGunship(scene: CombatScene, y: number): Enemy {
  const t = ENEMIES.gunship;
  const e = make(scene, RIGHT + 10, y, 'gunship').setupFrom(t);
  e.big = true;
  e.baseY = y;
  const v = e.scaledSpeed(t.speed);
  e.behavior = (en) => {
    en.setVelocityX(-v);
    en.y = en.baseY + Math.sin(en.age / 700) * 12;
  };
  e.onFire = (en) => fireFan(scene, en.x - 12, en.y, 3, 26, 'pellet', 1);
  return e;
}

export function spawnLauncher(scene: CombatScene, y: number): Enemy {
  const t = ENEMIES.launcher;
  const e = make(scene, RIGHT + 8, y, 'launcher').setupFrom(t);
  e.big = true;
  const v = e.scaledSpeed(t.speed);
  e.behavior = (en) => en.setVelocityX(-v);
  e.onFire = (en) => {
    const b = scene.enemyBullets.get();
    if (b) (b as import('../entities/Bullets').EnemyBullet).fire(en.x - 6, en.y - 5, 'missile', Math.PI, scene.ebSpeed() * 0.95);
  };
  return e;
}

/** shielded elite: hovers, cycles fan / ring / dash patterns */
export function spawnElite(scene: CombatScene, y: number): Enemy {
  const t = ENEMIES.elite;
  const e = make(scene, RIGHT + 10, y, 'elite').setupFrom(t);
  e.big = true;
  e.baseY = y;
  e.shieldHp = ELITE_SHIELD.hp;
  // shield ring visual
  const ring = scene.add.graphics().setDepth(9);
  e.attachments.push(ring);
  let mode = 0;
  let modeTimer = 2400;
  let holdX = 245;
  e.behavior = (en, dt) => {
    // entry then hover
    if (en.x > holdX) en.setVelocityX(-en.scaledSpeed(t.speed));
    else en.setVelocityX(Math.sin(en.age / 900) * 14);
    en.y = en.baseY + Math.sin(en.age / 820) * 26;
    // shield regen
    if (en.shieldHp < ELITE_SHIELD.hp && en.shieldRegenWait <= 0) {
      en.shieldHp = Math.min(ELITE_SHIELD.hp, en.shieldHp + (ELITE_SHIELD.regenPerSec * dt) / 1000);
    }
    ring.clear();
    if (en.shieldHp > 0) {
      const a = 0.25 + 0.45 * (en.shieldHp / ELITE_SHIELD.hp);
      ring.lineStyle(1, 0x56c4f5, a);
      ring.strokeCircle(en.x, en.y, 16 + Math.sin(en.age / 120) * 1.5);
    }
    modeTimer -= dt;
    if (modeTimer <= 0) {
      mode = (mode + 1) % 3;
      modeTimer = 2400;
      if (mode === 2) {
        // dash lunge
        en.setVelocityX(-150);
        scene.time.delayedCall(420, () => en.active && en.setVelocityX(60));
        scene.time.delayedCall(1100, () => en.active && en.setVelocityX(0));
      }
    }
  };
  e.onFire = (en) => {
    if (mode === 0) fireFan(scene, en.x - 10, en.y, 4, 42, 'pellet', 1);
    else if (mode === 1) fireRing(scene, en.x, en.y, 8, 'pellet', 0.85, en.age / 600);
    else fireAimed(scene, en.x - 10, en.y, 'shard', 1.25);
  };
  return e;
}

/** asteroid hazard — splits when destroyed */
export function spawnAsteroid(
  scene: CombatScene,
  size: 'big' | 'med' | 'small',
  x = RIGHT,
  y = Phaser.Math.Between(14, SCREEN.H - 14),
  vx?: number,
  vy?: number,
): Enemy {
  const key = size === 'big' ? 'astBig' : size === 'med' ? 'astMed' : 'astSmall';
  const t = ENEMIES[key];
  const e = make(scene, x, y, `ast-${size}`).setupFrom(t);
  if (size === 'big') e.big = true;
  const v = vx ?? -e.scaledSpeed(t.speed) * Phaser.Math.FloatBetween(0.8, 1.2);
  const vyy = vy ?? Phaser.Math.FloatBetween(-14, 14);
  const spin = Phaser.Math.FloatBetween(-1.4, 1.4);
  e.behavior = (en, dt) => {
    en.setVelocity(v, vyy);
    en.rotation += (spin * dt) / 1000;
  };
  e.onDeath = (en) => {
    if (!en.scene || en.hp > 0) return; // only split when shot down
    const next = size === 'big' ? 'med' : size === 'med' ? 'small' : null;
    if (next) {
      for (const dir of [-1, 1]) {
        spawnAsteroid(
          scene,
          next,
          en.x,
          en.y + dir * 4,
          v * 0.9,
          dir * Phaser.Math.FloatBetween(18, 42),
        );
      }
    }
  };
  return e;
}
