/**
 * NOVASTRIKE — weapon system.
 *
 * One global weapon level (1..4) shared across types; typed pick-ups switch
 * the weapon and stack a level when it's already equipped — so upgrades
 * stack the way Project-X tokens felt like they should.
 *
 * Beam and Lightning bypass the bullet pool: the beam is a real ray with a
 * per-tick overlap test, lightning is a chain-targeting strike with a
 * jittered polyline flash.
 */

import Phaser from 'phaser';
import {
  BEAM,
  LIGHTNING,
  SCREEN,
  WEAPONS,
  WEAPON_MAX_LEVEL,
  WeaponId,
} from '../config/Balance';
import { PlayerBullet } from '../entities/Bullets';
import { Enemy } from '../enemies/Enemy';
import { sfx } from '../audio/Sfx';
import type { Player } from '../entities/Player';

export interface WeaponScene extends Phaser.Scene {
  playerBullets: Phaser.Physics.Arcade.Group;
  enemies: Phaser.Physics.Arcade.Group;
  bossTargets(): Enemy[];
}

export class WeaponSystem {
  weapon: WeaponId = 'laser';
  level = 1;
  private cooldown = 0;
  private beamGfx: Phaser.GameObjects.Graphics;
  private boltGfx: Phaser.GameObjects.Graphics;
  private boltFade = 0;
  private beamSfxTimer = 0;
  private muzzle: Phaser.GameObjects.Sprite;

  constructor(
    private scene: WeaponScene,
    private player: Player,
  ) {
    this.beamGfx = scene.add.graphics().setDepth(13);
    this.boltGfx = scene.add.graphics().setDepth(14);
    this.muzzle = scene.add
      .sprite(0, 0, 'sprites', 'muzzle')
      .setDepth(13)
      .setVisible(false);
  }

  get name(): string {
    return WEAPONS[this.weapon].name;
  }

  /** typed power-up collected */
  pickup(letter: string): void {
    const map: Record<string, WeaponId> = {
      S: 'spread',
      P: 'plasma',
      H: 'homing',
      B: 'beam',
      L: 'lightning',
    };
    if (letter === 'U') {
      this.level = Math.min(WEAPON_MAX_LEVEL, this.level + 1);
    } else if (map[letter]) {
      if (this.weapon === map[letter]) {
        this.level = Math.min(WEAPON_MAX_LEVEL, this.level + 1);
      } else {
        this.weapon = map[letter];
      }
    }
    this.scene.events.emit('weapon-changed', this.name, this.level);
  }

  /** death penalty */
  downgrade(levels: number): void {
    this.level = Math.max(1, this.level - levels);
    this.scene.events.emit('weapon-changed', this.name, this.level);
  }

  reset(): void {
    this.weapon = 'laser';
    this.level = 1;
    this.scene.events.emit('weapon-changed', this.name, this.level);
  }

  update(delta: number, firing: boolean): void {
    this.cooldown -= delta;
    this.beamGfx.clear();
    if (this.boltFade > 0) {
      this.boltFade -= delta;
      this.boltGfx.setAlpha(Math.max(0, this.boltFade / 90));
      if (this.boltFade <= 0) this.boltGfx.clear();
    }
    this.muzzle.setVisible(false);

    if (!firing || !this.player.alive) return;

    const tune = WEAPONS[this.weapon];
    const lvl = this.level - 1;

    if (this.weapon === 'beam') {
      this.fireBeam(delta, tune.damage[lvl]);
      return;
    }

    if (this.cooldown > 0) return;
    this.cooldown = tune.fireDelay[lvl];

    const x = this.player.x + 11;
    const y = this.player.y;

    switch (this.weapon) {
      case 'laser':
        this.fireLaser(x, y, lvl, tune.damage[lvl], tune.bulletSpeed);
        break;
      case 'spread':
        this.fireSpread(x, y, lvl, tune.damage[lvl], tune.bulletSpeed);
        break;
      case 'plasma':
        this.shot(x, y, 'plasma', 0, tune.bulletSpeed, tune.damage[lvl]);
        sfx.shoot('plasma');
        this.flashMuzzle(x, y);
        break;
      case 'homing':
        this.fireHoming(x, y, lvl, tune.damage[lvl], tune.bulletSpeed);
        break;
      case 'lightning':
        this.fireLightning(tune.damage[lvl]);
        break;
    }
  }

  private shot(
    x: number,
    y: number,
    kind: 'laser' | 'spread' | 'plasma' | 'missile',
    angle: number,
    speed: number,
    damage: number,
  ): void {
    const b = this.scene.playerBullets.get() as PlayerBullet | null;
    if (b) b.fire(x, y, kind, angle, speed, damage);
  }

  private flashMuzzle(x: number, y: number): void {
    this.muzzle.setVisible(true).setPosition(x, y);
  }

  private fireLaser(x: number, y: number, lvl: number, dmg: number, spd: number): void {
    const streams = lvl + 2; // 2..5 parallel bolts
    const gap = 5;
    for (let i = 0; i < streams; i++) {
      const off = (i - (streams - 1) / 2) * gap;
      this.shot(x, y + off, 'laser', 0, spd, dmg);
    }
    sfx.shoot('laser');
    this.flashMuzzle(x, y);
  }

  private fireSpread(x: number, y: number, lvl: number, dmg: number, spd: number): void {
    const count = lvl + 3; // 3..6-way
    const spread = 34 + lvl * 8;
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1) - 0.5;
      this.shot(x, y, 'spread', t * spread, spd, dmg);
    }
    sfx.shoot('spread');
    this.flashMuzzle(x, y);
  }

  private fireHoming(x: number, y: number, lvl: number, dmg: number, spd: number): void {
    const count = lvl < 2 ? 2 : lvl < 3 ? 3 : 4;
    for (let i = 0; i < count; i++) {
      const ang = (i % 2 === 0 ? -1 : 1) * (22 + i * 12);
      this.shot(x, y + (i % 2 === 0 ? -4 : 4), 'missile', ang, spd, dmg);
    }
    sfx.shoot('homing');
  }

  /* ------------------------------ beam ------------------------------ */

  private fireBeam(delta: number, dps: number): void {
    const x0 = this.player.x + 12;
    const y = this.player.y;
    // draw: layered core + glow with animated ripple
    const t = this.scene.time.now / 60;
    this.beamGfx.fillStyle(0x14528f, 0.5);
    this.beamGfx.fillRect(x0, y - BEAM.halfHeight - 1, SCREEN.W - x0, BEAM.halfHeight * 2 + 2);
    this.beamGfx.fillStyle(0x56c4f5, 0.85);
    this.beamGfx.fillRect(x0, y - BEAM.halfHeight + 1, SCREEN.W - x0, BEAM.halfHeight * 2 - 2);
    this.beamGfx.fillStyle(0xffffff, 1);
    this.beamGfx.fillRect(x0, y - 1, SCREEN.W - x0, 2);
    for (let i = 0; i < 5; i++) {
      const rx = x0 + ((t * 22 + i * 60) % (SCREEN.W - x0));
      this.beamGfx.fillStyle(0xbdefff, 0.9);
      this.beamGfx.fillRect(rx, y - 2, 3, 4);
    }
    this.flashMuzzle(x0, y);

    this.beamSfxTimer -= delta;
    if (this.beamSfxTimer <= 0) {
      this.beamSfxTimer = 70;
      sfx.beamLoopTick();
    }

    // damage every tick interval
    if (this.cooldown > 0) {
      this.cooldown -= 0; // cooldown already decremented in update
      return;
    }
    this.cooldown = WEAPONS.beam.fireDelay[this.level - 1];
    const targets = [
      ...(this.scene.enemies.getChildren() as Enemy[]),
      ...this.scene.bossTargets(),
    ];
    for (const e of targets) {
      if (!e.active) continue;
      const hw = e.displayWidth / 2;
      const hh = e.displayHeight / 2;
      if (e.x + hw < x0) continue;
      if (Math.abs(e.y - y) <= hh + BEAM.halfHeight) {
        e.takeDamage(dps);
        sfx.hit();
      }
    }
  }

  /* ---------------------------- lightning ---------------------------- */

  private fireLightning(dmg: number): void {
    const chains = LIGHTNING.chains[this.level - 1];
    const hit: Enemy[] = [];
    const all = [
      ...(this.scene.enemies.getChildren() as Enemy[]),
      ...this.scene.bossTargets(),
    ].filter((e) => e.active);

    let fromX = this.player.x + 10;
    let fromY = this.player.y;
    let range = LIGHTNING.range;
    let damage = dmg;

    for (let c = 0; c <= chains; c++) {
      let best: Enemy | null = null;
      let bestD = range;
      for (const e of all) {
        if (hit.includes(e)) continue;
        const d = Phaser.Math.Distance.Between(fromX, fromY, e.x, e.y);
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      }
      if (!best) break;
      hit.push(best);
      this.drawBolt(fromX, fromY, best.x, best.y, c === 0);
      best.takeDamage(damage);
      fromX = best.x;
      fromY = best.y;
      range = LIGHTNING.chainRange;
      damage = Math.max(1, Math.round(damage * LIGHTNING.chainFalloff));
    }

    if (hit.length > 0) {
      sfx.shoot('lightning');
      this.boltFade = 90;
      this.boltGfx.setAlpha(1);
    } else {
      // dry crackle at the nose
      this.boltGfx.clear();
      this.drawBolt(fromX, fromY, fromX + 18, fromY + Phaser.Math.Between(-8, 8), true);
      this.boltFade = 60;
      this.boltGfx.setAlpha(1);
    }
  }

  private drawBolt(x0: number, y0: number, x1: number, y1: number, first: boolean): void {
    if (first) this.boltGfx.clear();
    const segs = 6;
    const pts: Array<[number, number]> = [[x0, y0]];
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      pts.push([
        Phaser.Math.Linear(x0, x1, t) + Phaser.Math.Between(-4, 4),
        Phaser.Math.Linear(y0, y1, t) + Phaser.Math.Between(-5, 5),
      ]);
    }
    pts.push([x1, y1]);
    this.boltGfx.lineStyle(2, 0xa04df0, 0.7);
    this.strokePts(pts);
    this.boltGfx.lineStyle(1, 0xffffff, 1);
    this.strokePts(pts);
  }

  private strokePts(pts: Array<[number, number]>): void {
    this.boltGfx.beginPath();
    this.boltGfx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) this.boltGfx.lineTo(pts[i][0], pts[i][1]);
    this.boltGfx.strokePath();
  }
}
