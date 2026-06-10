/**
 * NOVASTRIKE — pooled projectiles.
 *
 * Two classes, two Arcade groups (created in GameScene with runChildUpdate).
 * Bullets are recycled, never destroyed: get() -> fire() -> kill().
 */

import Phaser from 'phaser';
import { HOMING, SCREEN } from '../config/Balance';

const MARGIN = 24;

export type PShotKind = 'laser' | 'spread' | 'plasma' | 'missile';

export class PlayerBullet extends Phaser.Physics.Arcade.Sprite {
  damage = 1;
  pierce = false;
  kind: PShotKind = 'laser';
  private homing = false;
  private life = 0;
  /** ids of enemies already hit (for piercing shots) */
  hitSet: Set<number> = new Set();

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'sprites', 'pshot-laser');
  }

  fire(
    x: number,
    y: number,
    kind: PShotKind,
    angleDeg: number,
    speed: number,
    damage: number,
  ): void {
    this.enableBody(true, x, y, true, true);
    this.kind = kind;
    this.damage = damage;
    this.pierce = kind === 'plasma';
    this.homing = kind === 'missile';
    this.life = kind === 'missile' ? HOMING.lifeMs : 4000;
    this.hitSet.clear();
    const frame =
      kind === 'laser'
        ? 'pshot-laser'
        : kind === 'spread'
          ? 'pshot-spread'
          : kind === 'plasma'
            ? 'pshot-plasma0'
            : 'pshot-missile';
    this.setFrame(frame);
    this.setDepth(12);
    const rad = Phaser.Math.DegToRad(angleDeg);
    this.setRotation(rad);
    this.setVelocity(Math.cos(rad) * speed, Math.sin(rad) * speed);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.width, Math.max(3, this.height));
    if (kind === 'plasma') this.play('plasma-spin');
    else this.anims.stop();
  }

  kill(): void {
    this.anims.stop();
    this.disableBody(true, true);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.active) return;
    this.life -= delta;
    if (
      this.life <= 0 ||
      this.x > SCREEN.W + MARGIN ||
      this.x < -MARGIN ||
      this.y < -MARGIN ||
      this.y > SCREEN.H + MARGIN
    ) {
      this.kill();
      return;
    }
    if (this.homing) this.steer(delta);
  }

  private steer(delta: number): void {
    const scene = this.scene as Phaser.Scene & {
      nearestEnemy?: (x: number, y: number, range: number) => Phaser.GameObjects.Sprite | null;
    };
    const target = scene.nearestEnemy?.(this.x, this.y, 200);
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (target) {
      const want = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
      const cur = body.velocity.angle();
      const maxTurn = Phaser.Math.DegToRad(HOMING.turnRateDeg) * (delta / 1000);
      const next = Phaser.Math.Angle.RotateTo(cur, want, maxTurn);
      const speed = body.velocity.length();
      body.setVelocity(Math.cos(next) * speed, Math.sin(next) * speed);
      this.setRotation(next);
    }
    // exhaust puff
    if (Math.random() < 0.35) {
      const p = this.scene.add
        .image(this.x - 4, this.y, 'sprites', 'smoke1')
        .setDepth(11)
        .setAlpha(0.7);
      this.scene.tweens.add({
        targets: p,
        alpha: 0,
        duration: 260,
        onComplete: () => p.destroy(),
      });
    }
  }
}

export type EShotKind = 'pellet' | 'shard' | 'orb' | 'missile';

export class EnemyBullet extends Phaser.Physics.Arcade.Sprite {
  kind: EShotKind = 'pellet';
  private homing = false;
  private life = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'sprites', 'eb-pellet0');
  }

  fire(x: number, y: number, kind: EShotKind, angleRad: number, speed: number): void {
    this.enableBody(true, x, y, true, true);
    this.kind = kind;
    this.homing = kind === 'missile';
    this.life = kind === 'missile' ? 3600 : 7000;
    const frame =
      kind === 'pellet'
        ? 'eb-pellet0'
        : kind === 'shard'
          ? 'eb-shard'
          : kind === 'orb'
            ? 'eb-orb'
            : 'emissile';
    this.setFrame(frame);
    this.setDepth(12);
    this.setRotation(kind === 'shard' || kind === 'missile' ? angleRad + Math.PI : 0);
    if (kind === 'missile') this.setRotation(angleRad);
    this.setVelocity(Math.cos(angleRad) * speed, Math.sin(angleRad) * speed);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(Math.max(3, this.width - 2), Math.max(3, this.height - 2));
    if (kind === 'pellet') this.play('pellet-pulse');
    else this.anims.stop();
  }

  kill(): void {
    this.anims.stop();
    this.disableBody(true, true);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.active) return;
    this.life -= delta;
    if (
      this.life <= 0 ||
      this.x > SCREEN.W + MARGIN ||
      this.x < -MARGIN ||
      this.y < -MARGIN ||
      this.y > SCREEN.H + MARGIN
    ) {
      this.kill();
      return;
    }
    if (this.homing) {
      const scene = this.scene as Phaser.Scene & {
        playerPos?: () => Phaser.Math.Vector2 | null;
      };
      const p = scene.playerPos?.();
      if (p) {
        const body = this.body as Phaser.Physics.Arcade.Body;
        const want = Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y);
        const cur = body.velocity.angle();
        const next = Phaser.Math.Angle.RotateTo(cur, want, Phaser.Math.DegToRad(110) * (delta / 1000));
        const speed = body.velocity.length();
        body.setVelocity(Math.cos(next) * speed, Math.sin(next) * speed);
        this.setRotation(next);
      }
    }
  }
}
