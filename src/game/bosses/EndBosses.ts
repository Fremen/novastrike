/**
 * NOVASTRIKE — end-of-level bosses.
 *
 * Multi-phase, armoured, with positional weak points: hits inside the eye
 * core do full damage, everything else is reduced by body armour. Each boss
 * escalates its pattern set as its HP thresholds fall.
 */

import Phaser from 'phaser';
import { Boss } from './Boss';
import { CombatScene, Enemy, spawnAsteroid } from '../enemies/Enemy';
import { spawnSporeling } from './MiniBosses';
import {
  fireAimed,
  fireFan,
  fireHomingMissile,
  fireRain,
  fireRing,
  fireSpiralArm,
} from '../enemies/Patterns';
import { BOSS, ENEMIES, SCREEN } from '../config/Balance';

function addToScene(scene: CombatScene, b: Boss): void {
  scene.add.existing(b);
  scene.physics.add.existing(b);
  scene.enemies.add(b);
}

/* ------------------------------------------------------------------ */
/*  Level 1 boss — CORE CRUSHER                                        */
/*  Armoured wedge. Weak point: the eye. Spirals, asteroid throws,     */
/*  and a telegraphed ram charge from phase 2.                         */
/* ------------------------------------------------------------------ */

export class CoreCrusher extends Boss {
  private spiral = 0;
  private volley = 0;
  private ai: 'enter' | 'hover' | 'telegraph' | 'charge' | 'return' = 'enter';
  private aiT = 0;
  private holdX = 246;

  constructor(scene: CombatScene) {
    super(scene, SCREEN.W + 70, 90, 'boss-crusher');
    addToScene(scene, this);
    this.init('CORE CRUSHER', BOSS.crusher.hp, BOSS.crusher.score, BOSS.crusher.bodyArmor);
    this.thresholds = [0.66, 0.33];
    this.baseY = 90;
    this.fireDelay = 950;
    this.fireTimer = 1500;
    this.onFire = (en) => this.attack(en);
    this.behavior = (_e, dt) => this.think(dt);
  }

  /** eye sits 17px from the sprite's left edge, on the centreline */
  private eyeX(): number {
    return this.x - this.displayWidth / 2 + 17;
  }

  isWeakHit(x: number, y: number): boolean {
    return Phaser.Math.Distance.Between(x, y, this.eyeX(), this.y) < 12;
  }

  private attack(en: Enemy): void {
    if (this.ai !== 'hover') return;
    const s = this.cscene;
    this.volley++;
    const ex = this.eyeX() - 4;
    if (this.phase === 0) {
      this.spiral += 0.55;
      fireSpiralArm(s, ex, en.y, 2, this.spiral, 'pellet', 0.85);
      if (this.volley % 3 === 0)
        spawnAsteroid(s, 'med', en.x - 30, en.y + Phaser.Math.Between(-16, 16), -95, Phaser.Math.Between(-20, 20));
    } else if (this.phase === 1) {
      this.spiral += 0.62;
      fireSpiralArm(s, ex, en.y, 2, this.spiral, 'pellet', 0.95);
      if (this.volley % 2 === 0) fireAimed(s, ex, en.y, 'shard', 1.15);
    } else {
      this.spiral += 0.7;
      fireSpiralArm(s, ex, en.y, 3, this.spiral, 'pellet', 1);
      if (this.volley % 2 === 0) fireFan(s, ex, en.y, 3, 34, 'shard', 1.1);
    }
  }

  protected onPhase(phase: number): void {
    this.fireDelay = phase === 1 ? 820 : 660;
  }

  private think(dt: number): void {
    const en = this;
    this.aiT += dt;
    switch (this.ai) {
      case 'enter':
        en.setVelocityX(-44);
        if (en.x <= this.holdX) this.setAi('hover');
        break;
      case 'hover': {
        en.setVelocityX(0);
        en.y = Phaser.Math.Clamp(this.baseY + Math.sin(en.age / 1300) * 34, 42, SCREEN.H - 42);
        const chargeEvery = this.phase >= 2 ? 5200 : 6800;
        if (this.phase >= 1 && this.aiT > chargeEvery) this.setAi('telegraph');
        break;
      }
      case 'telegraph':
        en.setVelocity(0, 0);
        if (Math.floor(this.aiT / 90) % 2 === 0) en.setTintFill(0xffffff);
        else en.clearTint();
        if (this.aiT > 640) {
          en.clearTint();
          this.setAi('charge');
        }
        break;
      case 'charge':
        en.setVelocityX(-en.scaledSpeed(255));
        if (en.x < 64) {
          fireRing(this.cscene, this.eyeX(), en.y, 10, 'pellet', 0.9);
          this.setAi('return');
        }
        break;
      case 'return':
        en.setVelocityX(112);
        if (en.x >= this.holdX) this.setAi('hover');
        break;
    }
  }

  private setAi(next: CoreCrusher['ai']): void {
    this.ai = next;
    this.aiT = 0;
  }
}

/* ------------------------------------------------------------------ */
/*  Level 2 boss — HIVE QUEEN                                          */
/*  Bio horror. Tracks the player vertically; acid rain, larvae,       */
/*  orb fans and rings. Weak point: the eye.                           */
/* ------------------------------------------------------------------ */

export class HiveQueen extends Boss {
  private volley = 0;

  constructor(scene: CombatScene) {
    super(scene, SCREEN.W + 60, 90, 'boss-queen');
    addToScene(scene, this);
    this.init('HIVE QUEEN', BOSS.queen.hp, BOSS.queen.score, BOSS.queen.bodyArmor);
    this.thresholds = [0.62, 0.3];
    this.fireDelay = 1100;
    this.fireTimer = 1500;
    this.onFire = (en) => this.attack(en);
    this.behavior = (en, dt) => {
      if (en.x > 250) {
        en.setVelocityX(-40);
        return;
      }
      en.setVelocityX(Math.sin(en.age / 1500) * 8);
      // slow vertical pursuit + organic wobble
      const p = this.cscene.playerPos();
      const want = p ? p.y : 90;
      en.y += Phaser.Math.Clamp(want - en.y, -1, 1) * (dt / 1000) * 26;
      en.y = Phaser.Math.Clamp(en.y + Math.sin(en.age / 480) * 0.4, 40, SCREEN.H - 40);
      const pulse = 1 + Math.sin(en.age / 300) * 0.03;
      en.setScale(pulse);
    };
  }

  private eyeX(): number {
    return this.x - this.displayWidth / 2 + 13;
  }

  isWeakHit(x: number, y: number): boolean {
    return Phaser.Math.Distance.Between(x, y, this.eyeX(), this.y) < 12;
  }

  private attack(en: Enemy): void {
    const s = this.cscene;
    this.volley++;
    const ex = this.eyeX() - 2;
    if (this.phase === 0) {
      fireRain(s, 50, 300, -6, 4, 'orb', 0.8);
      if (this.volley % 3 === 0) this.spawnLarvae(en);
    } else if (this.phase === 1) {
      fireFan(s, ex, en.y, 4, 52, 'orb', 0.9);
      if (this.volley % 2 === 0) fireRain(s, 50, 300, -6, 3, 'orb', 0.85);
      if (this.volley % 3 === 0) {
        spawnSporeling(s, en.x - 16, en.y - 14);
        spawnSporeling(s, en.x - 16, en.y + 14);
      }
    } else {
      fireRing(s, ex, en.y, 10, 'orb', 0.8, en.age / 700);
      fireRain(s, 50, 300, -6, 5, 'orb', 0.95);
      if (this.volley % 2 === 0) fireFan(s, ex, en.y, 3, 36, 'shard', 1.05);
    }
  }

  private spawnLarvae(en: Enemy): void {
    const s = this.cscene;
    for (const dy of [-12, 12]) {
      const f = new Enemy(s, en.x - 14, en.y + dy, 'drone');
      s.add.existing(f);
      s.physics.add.existing(f);
      s.enemies.add(f);
      f.setupFrom(ENEMIES.drone);
      f.baseY = en.y + dy;
      const v = f.scaledSpeed(ENEMIES.drone.speed);
      f.behavior = (e2) => {
        e2.setVelocityX(-v);
        e2.y = e2.baseY + Math.sin((e2.age / 1000) * 3.4) * 30;
      };
    }
  }

  protected onPhase(phase: number): void {
    this.fireDelay = phase === 1 ? 950 : 800;
  }
}

/* ------------------------------------------------------------------ */
/*  Level 3 boss — FORTRESS CORE                                       */
/*  A wall of armour with four gun emplacements protecting a sealed    */
/*  core. Kill the guns, the core opens — then it fights back hard.    */
/* ------------------------------------------------------------------ */

export class FortressCore extends Boss {
  private wall: Phaser.GameObjects.TileSprite;
  private guns: Enemy[] = [];
  private gunsLeft = 4;
  private spiral = 0;
  private volley = 0;
  private droneT = 5400;
  private holdX = 294;

  constructor(scene: CombatScene) {
    super(scene, SCREEN.W + 90, 90, 'boss-core');
    addToScene(scene, this);
    this.init('FORTRESS CORE', BOSS.fortress.hp, BOSS.fortress.score, BOSS.fortress.bodyArmor);
    this.thresholds = [0.4];
    this.invulnerable = true; // sealed until the guns are down

    this.wall = scene.add
      .tileSprite(this.x + 18, 90, 64, 192, 'sprites', 'wall-tile')
      .setDepth(7);
    this.attachments.push(this.wall);

    for (const gy of [26, 70, 110, 154]) this.spawnGun(scene, gy);

    this.fireDelay = 820;
    this.fireTimer = 1200;
    this.onFire = (en) => this.attack(en);
    this.behavior = (en, dt) => {
      // the whole assembly slides in, then locks
      if (en.x > this.holdX) en.setVelocityX(-26);
      else en.setVelocityX(0);
      this.wall.setPosition(en.x + 18, 90);
      for (let i = 0; i < this.guns.length; i++) {
        const g = this.guns[i];
        if (g.active) g.x = en.x - 32;
      }
      if (this.phase >= 1) {
        this.droneT -= dt;
        if (this.droneT <= 0) {
          this.droneT = 5400;
          spawnSporeling(this.cscene, en.x - 40, 30);
          spawnSporeling(this.cscene, en.x - 40, SCREEN.H - 30);
        }
      }
    };
  }

  private spawnGun(scene: CombatScene, gy: number): void {
    const g = new Enemy(scene, this.x - 32, gy, 'wall-gun');
    scene.add.existing(g);
    scene.physics.add.existing(g);
    scene.enemies.add(g);
    g.maxHp = g.hp = 42;
    g.scoreValue = 800;
    g.crashDamage = 1;
    g.dropChance = 0.4;
    g.setDepth(8);
    (g.body as Phaser.Physics.Arcade.Body).setSize(g.width - 2, g.height - 2);
    (g.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    g.fireDelay = 1500 + Math.random() * 600;
    g.fireTimer = 1000 + Math.random() * 1200;
    let alt = false;
    g.onFire = (en) => {
      alt = !alt;
      if (alt) fireAimed(this.cscene, en.x - 8, en.y, 'shard', 1.05);
      else fireFan(this.cscene, en.x - 8, en.y, 3, 30, 'pellet', 0.9);
    };
    g.behavior = () => {};
    g.onDeath = () => this.gunDown();
    this.guns.push(g);
  }

  private gunDown(): void {
    this.gunsLeft--;
    if (this.gunsLeft <= 0 && !this.dying) this.open();
  }

  private open(): void {
    this.invulnerable = false;
    this.setFrame('boss-core-open');
    this.fireDelay = 760;
    this.fireTimer = 600;
    this.scene.cameras.main.shake(220, 0.006);
    this.emitHp();
  }

  private attack(en: Enemy): void {
    const s = this.cscene;
    if (this.invulnerable) return; // guns do the talking in phase 0
    this.volley++;
    const ox = en.x - 14;
    if (this.phase === 0) {
      this.spiral += 0.6;
      fireSpiralArm(s, ox, en.y, 2, this.spiral, 'pellet', 0.9);
      if (this.volley % 3 === 0) fireRing(s, ox, en.y, 8, 'pellet', 0.8, this.spiral);
    } else {
      this.spiral += 0.72;
      fireSpiralArm(s, ox, en.y, 3, this.spiral, 'pellet', 1);
      if (this.volley % 2 === 0) fireFan(s, ox, en.y, 4, 46, 'shard', 1.1);
      if (this.volley % 4 === 0) fireHomingMissile(s, ox, en.y, 0.9);
    }
  }

  protected onPhase(): void {
    this.fireDelay = 620;
  }

  protected beginDeath(): void {
    for (const g of this.guns) if (g.active) g.die(false);
    super.beginDeath();
  }
}
