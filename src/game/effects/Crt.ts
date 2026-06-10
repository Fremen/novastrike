/**
 * NOVASTRIKE — CRT overlay.
 *
 * Scanline TileSprite + vignette, sitting above everything in the scene
 * that owns it. Toggled with C; the preference is shared via the registry.
 */

import Phaser from 'phaser';
import { SCREEN } from '../config/Balance';

const REG_KEY = 'crt-enabled';

export class CrtOverlay {
  private lines: Phaser.GameObjects.TileSprite;
  private vignette: Phaser.GameObjects.Image;

  constructor(private scene: Phaser.Scene, depth = 1000) {
    this.lines = scene.add
      .tileSprite(0, 0, SCREEN.W, SCREEN.H, 'scanlines')
      .setOrigin(0)
      .setDepth(depth)
      .setScrollFactor(0)
      .setAlpha(0.55);
    this.vignette = scene.add
      .image(0, 0, 'vignette')
      .setOrigin(0)
      .setDepth(depth)
      .setScrollFactor(0)
      .setAlpha(0.8);
    this.apply();
  }

  static enabled(scene: Phaser.Scene): boolean {
    const v = scene.registry.get(REG_KEY);
    return v === undefined ? true : (v as boolean);
  }

  toggle(): boolean {
    const next = !CrtOverlay.enabled(this.scene);
    this.scene.registry.set(REG_KEY, next);
    this.apply();
    return next;
  }

  apply(): void {
    const on = CrtOverlay.enabled(this.scene);
    this.lines.setVisible(on);
    this.vignette.setVisible(on);
  }

  /** faint rolling flicker — call from update for title screens */
  flicker(time: number): void {
    if (!CrtOverlay.enabled(this.scene)) return;
    this.lines.tilePositionY = Math.floor(time / 120) % 4;
    this.lines.setAlpha(0.52 + Math.sin(time / 90) * 0.04);
  }
}
