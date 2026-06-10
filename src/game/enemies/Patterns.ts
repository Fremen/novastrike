/**
 * NOVASTRIKE — bullet pattern library.
 *
 * Shared by enemies and bosses. Each function pulls pooled EnemyBullets from
 * the scene's group. Speeds are difficulty-scaled by the scene.
 */

import Phaser from 'phaser';
import { EnemyBullet, EShotKind } from '../entities/Bullets';

export interface ShooterScene extends Phaser.Scene {
  enemyBullets: Phaser.Physics.Arcade.Group;
  playerPos(): Phaser.Math.Vector2 | null;
  /** difficulty-scaled base enemy bullet speed */
  ebSpeed(): number;
}

function get(scene: ShooterScene): EnemyBullet | null {
  return scene.enemyBullets.get() as EnemyBullet | null;
}

export function fireAimed(
  scene: ShooterScene,
  x: number,
  y: number,
  kind: EShotKind = 'pellet',
  speedMul = 1,
  spreadDeg = 0,
): void {
  const p = scene.playerPos();
  const base = p
    ? Phaser.Math.Angle.Between(x, y, p.x, p.y)
    : Math.PI; // straight left if no player
  const b = get(scene);
  if (!b) return;
  const jitter = Phaser.Math.DegToRad(Phaser.Math.FloatBetween(-spreadDeg, spreadDeg));
  b.fire(x, y, kind, base + jitter, scene.ebSpeed() * speedMul);
}

export function fireFan(
  scene: ShooterScene,
  x: number,
  y: number,
  count: number,
  spreadDeg: number,
  kind: EShotKind = 'pellet',
  speedMul = 1,
  aimAtPlayer = true,
): void {
  const p = scene.playerPos();
  const centre =
    aimAtPlayer && p ? Phaser.Math.Angle.Between(x, y, p.x, p.y) : Math.PI;
  const spread = Phaser.Math.DegToRad(spreadDeg);
  for (let i = 0; i < count; i++) {
    const b = get(scene);
    if (!b) return;
    const t = count === 1 ? 0 : i / (count - 1) - 0.5;
    b.fire(x, y, kind, centre + t * spread, scene.ebSpeed() * speedMul);
  }
}

export function fireRing(
  scene: ShooterScene,
  x: number,
  y: number,
  count: number,
  kind: EShotKind = 'pellet',
  speedMul = 1,
  phase = 0,
): void {
  for (let i = 0; i < count; i++) {
    const b = get(scene);
    if (!b) return;
    const a = phase + (i / count) * Math.PI * 2;
    b.fire(x, y, kind, a, scene.ebSpeed() * speedMul);
  }
}

/** call repeatedly with an advancing phase for a spiral */
export function fireSpiralArm(
  scene: ShooterScene,
  x: number,
  y: number,
  arms: number,
  phase: number,
  kind: EShotKind = 'pellet',
  speedMul = 1,
): void {
  for (let i = 0; i < arms; i++) {
    const b = get(scene);
    if (!b) return;
    const a = phase + (i / arms) * Math.PI * 2;
    b.fire(x, y, kind, a, scene.ebSpeed() * speedMul);
  }
}

/** acid rain — drops fired downward across a span (Hive Queen) */
export function fireRain(
  scene: ShooterScene,
  xMin: number,
  xMax: number,
  y: number,
  count: number,
  kind: EShotKind = 'orb',
  speedMul = 0.8,
): void {
  for (let i = 0; i < count; i++) {
    const b = get(scene);
    if (!b) return;
    const x = Phaser.Math.FloatBetween(xMin, xMax);
    const a = Math.PI / 2 + Phaser.Math.FloatBetween(-0.25, 0.25);
    b.fire(x, y, kind, a, scene.ebSpeed() * speedMul * Phaser.Math.FloatBetween(0.8, 1.2));
  }
}

export function fireHomingMissile(
  scene: ShooterScene,
  x: number,
  y: number,
  speedMul = 0.9,
): void {
  const b = get(scene);
  if (!b) return;
  b.fire(x, y, 'missile', Math.PI, scene.ebSpeed() * speedMul);
}
