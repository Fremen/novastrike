/**
 * NOVASTRIKE — power-up chips.
 *
 * Gold chips that drift left with a sine bob. Letter -> effect:
 *   U weapon level up    S/P/H/B/L weapon type (stacking)
 *   E shield recharge    1 extra life    X smart bomb    I invulnerability
 */

import Phaser from 'phaser';
import { POWERUP, SCREEN } from '../config/Balance';

export class PowerUp extends Phaser.Physics.Arcade.Sprite {
  letter = 'U';
  private t = 0;
  private baseY = 0;
  private life = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'sprites', 'chip-U');
  }

  spawn(x: number, y: number, letter: string): void {
    this.enableBody(true, x, y, true, true);
    this.letter = letter;
    this.setFrame(`chip-${letter}`);
    this.setDepth(6);
    this.t = Math.random() * Math.PI * 2;
    this.baseY = Phaser.Math.Clamp(y, 16, SCREEN.H - 16);
    this.life = POWERUP.lifeMs;
    this.setVelocity(-POWERUP.driftSpeed, 0);
    this.setAlpha(1);
    (this.body as Phaser.Physics.Arcade.Body).setSize(12, 12);
  }

  kill(): void {
    this.disableBody(true, true);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.active) return;
    this.t += delta / 1000;
    this.life -= delta;
    this.y = this.baseY + Math.sin(this.t * 2.4) * POWERUP.bobAmp;
    if (this.life < 3000) this.setAlpha(Math.sin(this.t * 14) > 0 ? 1 : 0.25);
    if (this.x < -16 || this.life <= 0) this.kill();
  }
}

/** weighted pick from the balance table */
export function rollPowerUp(): string {
  const table = POWERUP.table;
  let total = 0;
  for (const [, w] of table) total += w;
  let r = Math.random() * total;
  for (const [letter, w] of table) {
    r -= w;
    if (r <= 0) return letter;
  }
  return 'U';
}
