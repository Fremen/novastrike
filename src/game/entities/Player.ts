/**
 * NOVASTRIKE — player ship.
 *
 * 8-way movement (arrows / WASD / gamepad), tiny core hitbox, shield stock,
 * invulnerability blink, animated engine flame. Firing itself lives in
 * WeaponSystem; this class only reports input state.
 */

import Phaser from 'phaser';
import { PLAYER, SCREEN } from '../config/Balance';
import { sfx } from '../audio/Sfx';
import { isHeld } from '../input/Keyboard';

export class Player extends Phaser.Physics.Arcade.Sprite {
  shield = PLAYER.startShield;
  invulnMs = 0;
  autofire = true;
  alive = true;
  private flame!: Phaser.GameObjects.Sprite;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'sprites', 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(10);
    this.setCollideWorldBounds(true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(PLAYER.hitboxW, PLAYER.hitboxH);
    body.setOffset(
      (this.width - PLAYER.hitboxW) / 2 + 2,
      (this.height - PLAYER.hitboxH) / 2,
    );

    this.flame = scene.add.sprite(x - 14, y, 'sprites', 'flame0').setDepth(9);
    this.flame.play('flame');

    const kb = scene.input.keyboard!;
    this.keys = kb.addKeys(
      'UP,DOWN,LEFT,RIGHT,W,A,S,D,SPACE,Z,X,SHIFT',
    ) as Record<string, Phaser.Input.Keyboard.Key>;
  }

  private pad(): Phaser.Input.Gamepad.Gamepad | null {
    const gp = this.scene.input.gamepad;
    return gp && gp.total > 0 ? gp.getPad(0) : null;
  }

  /** held fire input (keyboard or pad) */
  get firingHeld(): boolean {
    const pad = this.pad();
    return (
      this.keys.SPACE.isDown ||
      this.keys.Z.isDown ||
      isHeld('Space', 'KeyZ') ||
      (pad ? pad.A || pad.R2 > 0.4 : false)
    );
  }

  /** edge-triggered bomb input — call once per frame */
  get bombPressed(): boolean {
    if (Phaser.Input.Keyboard.JustDown(this.keys.X)) return true;
    const pad = this.pad();
    if (pad) {
      const now = pad.B;
      const pressed = now && !this.prevPadB;
      this.prevPadB = now;
      return pressed;
    }
    return false;
  }
  private prevPadB = false;

  update(_time: number, delta: number): void {
    if (!this.alive) {
      this.flame.setVisible(false);
      return;
    }
    const pad = this.pad();
    let dx = 0;
    let dy = 0;
    if (this.keys.LEFT.isDown || this.keys.A.isDown || isHeld('ArrowLeft', 'KeyA')) {
      dx -= 1;
    }
    if (this.keys.RIGHT.isDown || this.keys.D.isDown || isHeld('ArrowRight', 'KeyD')) {
      dx += 1;
    }
    if (this.keys.UP.isDown || this.keys.W.isDown || isHeld('ArrowUp', 'KeyW')) {
      dy -= 1;
    }
    if (this.keys.DOWN.isDown || this.keys.S.isDown || isHeld('ArrowDown', 'KeyS')) {
      dy += 1;
    }
    if (pad) {
      const lx = pad.leftStick.x;
      const ly = pad.leftStick.y;
      if (Math.abs(lx) > 0.25) dx = lx;
      if (Math.abs(ly) > 0.25) dy = ly;
      if (pad.left) dx = -1;
      if (pad.right) dx = 1;
      if (pad.up) dy = -1;
      if (pad.down) dy = 1;
    }
    const v = new Phaser.Math.Vector2(dx, dy);
    if (v.length() > 1) v.normalize();
    this.setVelocity(v.x * PLAYER.speed, v.y * PLAYER.speed);

    // invulnerability blink
    if (this.invulnMs > 0) {
      this.invulnMs -= delta;
      this.setAlpha(Math.sin(this.scene.time.now / 40) > 0 ? 1 : 0.25);
      if (this.invulnMs <= 0) this.setAlpha(1);
    }

    this.flame.setVisible(true);
    this.flame.setPosition(this.x - 14, this.y);
  }

  /** @returns true if the hit killed the player */
  takeHit(damage: number): boolean {
    if (!this.alive || this.invulnMs > 0) return false;
    if (this.shield > 0) {
      this.shield = Math.max(0, this.shield - damage);
      this.invulnMs = 700; // mercy window after a shield hit
      sfx.shieldHit();
      this.scene.events.emit('shield-changed', this.shield);
      // shield flash ring
      const g = this.scene.add.graphics().setDepth(11);
      g.lineStyle(1, 0x56c4f5, 0.9);
      g.strokeCircle(this.x, this.y, 13);
      this.scene.tweens.add({
        targets: g,
        alpha: 0,
        duration: 260,
        onComplete: () => g.destroy(),
      });
      return false;
    }
    this.die();
    return true;
  }

  die(): void {
    if (!this.alive) return;
    this.alive = false;
    sfx.playerDeath();
    this.setVisible(false);
    this.flame.setVisible(false);
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
    this.scene.events.emit('player-died');
  }

  respawn(): void {
    this.alive = true;
    this.shield = PLAYER.startShield;
    this.invulnMs = PLAYER.respawnInvulnMs;
    this.setPosition(36, SCREEN.H / 2);
    this.setVisible(true);
    (this.body as Phaser.Physics.Arcade.Body).enable = true;
    this.scene.events.emit('shield-changed', this.shield);
  }

  grantInvuln(ms: number): void {
    this.invulnMs = Math.max(this.invulnMs, ms);
  }

  rechargeShield(amount: number): void {
    this.shield = Math.min(PLAYER.maxShield, this.shield + amount);
    this.scene.events.emit('shield-changed', this.shield);
  }
}
