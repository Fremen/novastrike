/**
 * NOVASTRIKE — boot scene.
 *
 * No asset downloads: everything is generated here. Builds the sprite
 * sheet, the retro bitmap font, the parallax textures, and the shared
 * animations, then hands off to the title.
 */

import Phaser from 'phaser';
import {
  buildParallaxTextures,
  buildRetroFont,
  buildSpriteSheet,
} from '../assets/TextureFactory';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    buildSpriteSheet(this);
    buildRetroFont(this);
    buildParallaxTextures(this);

    const frames = (names: string[]) =>
      names.map((frame) => ({ key: 'sprites', frame }));

    this.anims.create({
      key: 'explode',
      frames: frames(['explo0', 'explo1', 'explo2', 'explo3', 'explo4', 'explo5']),
      frameRate: 18,
      repeat: 0,
    });
    this.anims.create({
      key: 'flame',
      frames: frames(['flame0', 'flame1']),
      frameRate: 12,
      repeat: -1,
    });
    this.anims.create({
      key: 'plasma-spin',
      frames: frames(['pshot-plasma0', 'pshot-plasma1']),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'pellet-pulse',
      frames: frames(['eb-pellet0', 'eb-pellet1']),
      frameRate: 8,
      repeat: -1,
    });

    this.scene.start('Title');
  }
}
