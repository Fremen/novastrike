/**
 * NOVASTRIKE — explosions & debris.
 *
 * Pooled 6-frame blasts; big kills layer three offset blasts, sparks and a
 * camera shake — pure 1992 arcade.
 */

import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';

export class Explosions {
  private pool: Phaser.GameObjects.Group;
  private sparks: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(private scene: Phaser.Scene) {
    this.pool = scene.add.group({
      classType: Phaser.GameObjects.Sprite,
      maxSize: 60,
    });
    this.sparks = scene.add.particles(0, 0, 'sprites', {
      frame: 'spark',
      speed: { min: 30, max: 110 },
      lifespan: { min: 200, max: 460 },
      quantity: 8,
      scale: { start: 1, end: 0 },
      emitting: false,
    });
    this.sparks.setDepth(15);
  }

  private blast(x: number, y: number, scale: number, delay = 0): void {
    const go = () => {
      const s = (this.pool.get(x, y, 'sprites', 'explo0') as Phaser.GameObjects.Sprite) ?? null;
      if (!s) return;
      s.setActive(true).setVisible(true).setDepth(15).setScale(scale);
      s.setPosition(x, y);
      s.play('explode');
      s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        s.setActive(false).setVisible(false);
      });
    };
    if (delay > 0) this.scene.time.delayedCall(delay, go);
    else go();
  }

  small(x: number, y: number): void {
    this.blast(x, y, 1);
    this.sparks.explode(5, x, y);
    sfx.explosion(false);
  }

  big(x: number, y: number): void {
    this.blast(x, y, 1.6);
    this.blast(x - 9, y - 7, 1.1, 90);
    this.blast(x + 8, y + 6, 1.2, 170);
    this.sparks.explode(14, x, y);
    this.scene.cameras.main.shake(140, 0.008);
    sfx.explosion(true);
  }

  /** boss chain: rolling detonations across the hull */
  bossChain(x: number, y: number, w: number, h: number): void {
    for (let i = 0; i < 12; i++) {
      const bx = x + Phaser.Math.Between(-w / 2, w / 2);
      const by = y + Phaser.Math.Between(-h / 2, h / 2);
      this.blast(bx, by, Phaser.Math.FloatBetween(1, 1.8), i * 130);
    }
    this.scene.time.delayedCall(12 * 130, () => {
      this.blast(x, y, 2.6);
      this.sparks.explode(30, x, y);
      this.scene.cameras.main.shake(420, 0.014);
    });
    sfx.bossDeath();
  }

  hitSpark(x: number, y: number): void {
    this.sparks.explode(2, x, y);
  }
}
