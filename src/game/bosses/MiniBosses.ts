/**
 * NOVASTRIKE — mini-bosses.
 *
 * One per level, dropped mid-stage with the siren. No armour (every hit
 * counts), simple phase escalation, generous power-up on death.
 */

import Phaser from 'phaser';
import { Boss } from './Boss';
import { CombatScene, Enemy } from '../enemies/Enemy';
import { fireAimed, fireFan, fireRing } from '../enemies/Patterns';
import { ENEMIES, KAMIKAZE, MINIBOSS, SCREEN } from '../config/Balance';

function addToScene(scene: CombatScene, b: Boss): void {
  scene.add.existing(b);
  scene.physics.add.existing(b);
  scene.enemies.add(b);
}

/** small kamikaze larva spawned at a position (used by Spore Bulb / Queen) */
export function spawnSporeling(scene: CombatScene, x: number, y: number): void {
  const t = ENEMIES.kamikaze;
  const e = new Enemy(scene, x, y, 'kamikaze');
  scene.add.existing(e);
  scene.physics.add.existing(e);
  scene.enemies.add(e);
  e.setupFrom(t);
  e.setScale(0.8);
  let locked = false;
  e.behavior = (en, dt) => {
    en.rotation += dt / 120;
    if (locked) return;
    en.setVelocity(-30, Math.sin(en.age / 300) * 26);
    if (en.age > 700) {
      const p = scene.playerPos();
      if (p) {
        locked = true;
        const a = Phaser.Math.Angle.Between(en.x, en.y, p.x, p.y);
        const dash = en.scaledSpeed(KAMIKAZE.dashSpeed * 0.9);
        en.setVelocity(Math.cos(a) * dash, Math.sin(a) * dash);
      }
    }
  };
}

/* ------------------------------------------------------------------ */
/*  Level 1 — DRILL CARRIER                                            */
/* ------------------------------------------------------------------ */

export class DrillCarrier extends Boss {
  private ai: 'enter' | 'hover' | 'telegraph' | 'dash' | 'return' = 'enter';
  private aiT = 0;
  private holdX = 250;
  private droneT = 5200;

  constructor(scene: CombatScene) {
    super(scene, SCREEN.W + 60, 76, 'mb-drill');
    addToScene(scene, this);
    this.init('DRILL CARRIER', MINIBOSS.drill.hp, MINIBOSS.drill.score, 1);
    this.baseY = 76;
    this.fireDelay = 1150;
    this.fireTimer = 1400;
    this.onFire = (en) => {
      if (this.ai === 'hover')
        fireAimed(this.cscene, en.x - 20, en.y, 'shard', 1.05);
    };
    this.behavior = (_e, dt) => this.think(dt);
  }

  private think(dt: number): void {
    const en = this;
    const s = this.cscene;
    this.aiT += dt;
    this.droneT -= dt;
    if (this.droneT <= 0 && this.ai === 'hover') {
      this.droneT = 6200;
      // deploy a pair of escort fighters from the bay
      for (const dy of [-14, 14]) {
        const f = new Enemy(s, en.x - 8, en.y + dy, 'fighter');
        s.add.existing(f);
        s.physics.add.existing(f);
        s.enemies.add(f);
        f.setupFrom(ENEMIES.fighter);
        const v = f.scaledSpeed(ENEMIES.fighter.speed);
        f.behavior = (e2) => e2.setVelocityX(-v);
      }
    }
    switch (this.ai) {
      case 'enter':
        en.setVelocityX(-46);
        if (en.x <= this.holdX) this.setAi('hover');
        break;
      case 'hover':
        en.setVelocityX(0);
        en.y = this.baseY + Math.sin(en.age / 900) * 22;
        if (this.aiT > 5200) this.setAi('telegraph');
        break;
      case 'telegraph':
        en.setVelocity(0, 0);
        en.setTintFill(0xffffff);
        if (Math.floor(this.aiT / 90) % 2 === 0) en.clearTint();
        if (this.aiT > 620) {
          en.clearTint();
          // lock onto the player's row, then charge
          const p = s.playerPos();
          if (p) en.y = Phaser.Math.Linear(en.y, p.y, 0.5);
          this.setAi('dash');
        }
        break;
      case 'dash':
        en.setVelocityX(-en.scaledSpeed(185));
        if (en.x < 34) this.setAi('return');
        break;
      case 'return':
        en.setVelocityX(86);
        en.y = Phaser.Math.Linear(en.y, this.baseY, 0.02);
        if (en.x >= this.holdX) this.setAi('hover');
        break;
    }
  }

  private setAi(next: DrillCarrier['ai']): void {
    this.ai = next;
    this.aiT = 0;
  }
}

/* ------------------------------------------------------------------ */
/*  Level 2 — SPORE BULB                                               */
/* ------------------------------------------------------------------ */

export class SporeBulb extends Boss {
  private volley = 0;
  private sporeT = 6800;

  constructor(scene: CombatScene) {
    super(scene, SCREEN.W + 50, 90, 'mb-spore');
    addToScene(scene, this);
    this.init('SPORE BULB', MINIBOSS.spore.hp, MINIBOSS.spore.score, 1);
    this.baseY = 90;
    this.thresholds = [0.5];
    this.fireDelay = 1500;
    this.fireTimer = 1600;
    this.onFire = (en) => {
      this.volley++;
      if (this.volley % 2 === 0)
        fireRing(this.cscene, en.x, en.y, this.phase > 0 ? 10 : 8, 'orb', 0.75, en.age / 500);
      else fireFan(this.cscene, en.x - 10, en.y, 3, 36, 'orb', 0.85);
    };
    this.behavior = (en, dt) => {
      // entry drift, then a slow figure-eight bob with a fleshy pulse
      if (en.x > 246) en.setVelocityX(-38);
      else en.setVelocityX(Math.sin(en.age / 1400) * 10);
      en.y = this.baseY + Math.sin(en.age / 1100) * 34;
      const pulse = 1 + Math.sin(en.age / 260) * 0.05;
      en.setScale(pulse);
      this.sporeT -= dt;
      if (this.sporeT <= 0) {
        this.sporeT = this.phase > 0 ? 4800 : 6800;
        spawnSporeling(this.cscene, en.x - 12, en.y - 10);
        spawnSporeling(this.cscene, en.x - 12, en.y + 10);
      }
    };
  }

  protected onPhase(): void {
    this.fireDelay = 1150;
  }
}

/* ------------------------------------------------------------------ */
/*  Level 3 — TWIN SENTRY                                              */
/* ------------------------------------------------------------------ */

export class TwinSentry extends Boss {
  private dir = 1;

  constructor(scene: CombatScene) {
    super(scene, SCREEN.W + 40, 60, 'mb-sentry');
    addToScene(scene, this);
    this.init('TWIN SENTRY', MINIBOSS.sentry.hp, MINIBOSS.sentry.score, 1);
    this.thresholds = [0.5];
    this.fireDelay = 980;
    this.fireTimer = 1200;
    this.onFire = (en) => {
      // both turret heads fire (sprite is a mirrored stack)
      fireAimed(this.cscene, en.x - 10, en.y - 11, 'shard', 1.1);
      fireAimed(this.cscene, en.x - 10, en.y + 11, 'shard', 1.1);
      if (this.phase > 0) fireFan(this.cscene, en.x - 8, en.y, 3, 30, 'pellet', 0.95);
    };
    this.behavior = (en) => {
      if (en.x > 272) {
        en.setVelocityX(-42);
        return;
      }
      en.setVelocityX(0);
      en.setVelocityY(this.dir * en.scaledSpeed(52));
      if (en.y < 28) this.dir = 1;
      if (en.y > SCREEN.H - 28) this.dir = -1;
    };
  }

  protected onPhase(): void {
    this.fireDelay = 780;
  }
}
