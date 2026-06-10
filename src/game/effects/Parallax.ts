/**
 * NOVASTRIKE — parallax engine.
 *
 * Five independent layers, each a TileSprite scrolling at its own multiple
 * of the world scroll speed (Balance.SCROLL.layerSpeeds):
 *   1 distant stars  ·  2 nebula clouds  ·  3 terrain silhouette
 *   4 foreground structures (in front of gameplay, semi-dark)
 *   5 the gameplay plane itself (sprites move at 1.0 by definition) plus
 *     near-field speed-line dust streaking past for extra depth.
 */

import Phaser from 'phaser';
import { SCREEN, SCROLL } from '../config/Balance';
import { ThemeKeys } from '../assets/TextureFactory';

export class ParallaxBackground {
  private stars: Phaser.GameObjects.TileSprite;
  private nebula: Phaser.GameObjects.TileSprite;
  private terrain: Phaser.GameObjects.TileSprite;
  private structures: Phaser.GameObjects.TileSprite;
  private dust: Array<{ img: Phaser.GameObjects.Image; speed: number }> = [];
  /** eases toward targetMul (boss slowdown) */
  private mul = 1;
  targetMul = 1;

  constructor(
    private scene: Phaser.Scene,
    theme: ThemeKeys,
  ) {
    scene.cameras.main.setBackgroundColor(theme.sky);
    this.stars = scene.add
      .tileSprite(0, 0, SCREEN.W, SCREEN.H, theme.stars)
      .setOrigin(0)
      .setDepth(-50)
      .setScrollFactor(0);
    this.nebula = scene.add
      .tileSprite(0, 0, SCREEN.W, SCREEN.H, theme.nebula)
      .setOrigin(0)
      .setDepth(-40)
      .setScrollFactor(0);
    this.terrain = scene.add
      .tileSprite(0, 0, SCREEN.W, 256, theme.terrain)
      .setOrigin(0, 0)
      .setDepth(-30)
      .setScrollFactor(0);
    this.terrain.setY(SCREEN.H - 256);
    this.structures = scene.add
      .tileSprite(0, 0, SCREEN.W, 256, theme.structures)
      .setOrigin(0, 0)
      .setDepth(20)
      .setAlpha(0.92)
      .setScrollFactor(0);
    this.structures.setY(SCREEN.H - 256);

    // layer-5 near dust: white speed-line pixels at gameplay depth
    for (let i = 0; i < 14; i++) {
      const img = scene.add
        .image(Math.random() * SCREEN.W, Math.random() * SCREEN.H, 'sprites', 'pixel')
        .setDepth(2)
        .setAlpha(0.5);
      img.setScale(Phaser.Math.Between(1, 3), 1);
      this.dust.push({ img, speed: 1 + Math.random() * 1.6 });
    }
  }

  update(delta: number): void {
    this.mul = Phaser.Math.Linear(this.mul, this.targetMul, 0.04);
    const base = SCROLL.base * this.mul * (delta / 1000);
    const sp = SCROLL.layerSpeeds;
    this.stars.tilePositionX += base * sp[0];
    this.nebula.tilePositionX += base * sp[1];
    this.terrain.tilePositionX += base * sp[2];
    this.structures.tilePositionX += base * sp[3];
    for (const d of this.dust) {
      d.img.x -= base * sp[4] * d.speed * 3.2;
      if (d.img.x < -4) {
        d.img.x = SCREEN.W + 4;
        d.img.y = Math.random() * SCREEN.H;
      }
    }
  }

  destroy(): void {
    this.stars.destroy();
    this.nebula.destroy();
    this.terrain.destroy();
    this.structures.destroy();
    for (const d of this.dust) d.img.destroy();
    this.dust.length = 0;
  }
}
