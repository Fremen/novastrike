/**
 * NOVASTRIKE — boss base.
 *
 * Bosses are big Enemies with phases (hp thresholds), body armour that
 * weak-point hits bypass (positional check on the incoming shot), an HP bar
 * feed to the HUD, and a rolling chain-explosion death.
 */

import Phaser from 'phaser';
import { Enemy, CombatScene } from '../enemies/Enemy';

export class Boss extends Enemy {
  bossName = 'BOSS';
  /** damage multiplier for non-weak-point hits */
  armor = 0.35;
  /** hp fractions (descending) that trigger phase changes */
  thresholds: number[] = [];
  phase = 0;
  dying = false;
  invulnerable = false;

  constructor(scene: Phaser.Scene, x: number, y: number, frame: string) {
    super(scene, x, y, frame);
    this.big = true;
  }

  init(name: string, hp: number, score: number, armor: number): this {
    this.bossName = name;
    this.maxHp = this.hp = hp;
    this.scoreValue = score;
    this.armor = armor;
    this.crashDamage = 2;
    this.dropChance = 0;
    this.setDepth(8);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.width - 8, this.height - 8);
    body.setImmovable(true);
    this.emitHp();
    return this;
  }

  /** weak point test — subclasses override; default: no weak point */
  isWeakHit(_x: number, _y: number): boolean {
    return false;
  }

  takeDamage(dmg: number, hitX?: number, hitY?: number): boolean {
    if (!this.active || this.dying || this.invulnerable) return false;
    const weak = hitX !== undefined && this.isWeakHit(hitX, hitY ?? this.y);
    const applied = weak ? dmg : dmg * this.armor;
    this.hp -= applied;
    this.setTintFill(weak ? 0xffffff : 0x9b9bb3);
    this.scene.time.delayedCall(45, () => this.active && this.clearTint());
    this.emitHp();
    this.checkPhase();
    if (this.hp <= 0) {
      this.beginDeath();
      return true;
    }
    return false;
  }

  /** smart bomb: percentage of max hp, ignores armour */
  applyBombDamage(frac: number): void {
    if (!this.active || this.dying) return;
    this.hp -= this.maxHp * frac;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => this.active && this.clearTint());
    this.emitHp();
    this.checkPhase();
    if (this.hp <= 0) this.beginDeath();
  }

  protected emitHp(): void {
    this.scene.events.emit('boss-hp', Math.max(0, this.hp / this.maxHp), this.bossName);
  }

  protected checkPhase(): void {
    const frac = this.hp / this.maxHp;
    while (this.phase < this.thresholds.length && frac <= this.thresholds[this.phase]) {
      this.phase++;
      this.onPhase(this.phase);
    }
  }

  /** subclass hook */
  protected onPhase(_phase: number): void {}

  protected beginDeath(): void {
    if (this.dying) return;
    this.dying = true;
    const s = this.cscene;
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.behavior = () => {};
    this.onFire = null;
    // clear the screen of bullets as a courtesy
    s.enemyBullets.getChildren().forEach((b) => (b as Phaser.Physics.Arcade.Sprite).disableBody(true, true));
    s.events.emit('boss-hp', 0, this.bossName);
    const ex = (s as CombatScene & { explosions?: { bossChain(x: number, y: number, w: number, h: number): void } }).explosions;
    ex?.bossChain(this.x, this.y, this.displayWidth, this.displayHeight);
    this.scene.tweens.add({ targets: this, alpha: 0.4, duration: 1500 });
    this.scene.time.delayedCall(2100, () => {
      if (!this.scene) return;
      s.addScore(this.scoreValue, this.x, this.y);
      for (const a of this.attachments) a.destroy();
      this.attachments.length = 0;
      this.scene.events.emit('boss-defeated', this.bossName);
      this.destroy();
    });
  }

  /** bosses never get culled or die through the base path */
  die(scored: boolean): void {
    if (scored) this.beginDeath();
  }

  preUpdate(time: number, delta: number): void {
    // skip Enemy's cull logic; bosses manage themselves
    (
      Phaser.Physics.Arcade.Sprite.prototype as unknown as {
        preUpdate(t: number, d: number): void;
      }
    ).preUpdate.call(this, time, delta);
    if (!this.active || this.dying) return;
    this.age += delta;
    if (this.shieldRegenWait > 0) this.shieldRegenWait -= delta;
    this.behavior(this, delta);
    if (this.fireDelay > 0 && this.onFire) {
      this.fireTimer -= delta;
      if (this.fireTimer <= 0) {
        this.fireTimer = this.fireDelay;
        this.onFire(this);
      }
    }
  }
}
