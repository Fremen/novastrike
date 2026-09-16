/**
 * NOVASTRIKE — title scene.
 *
 * Attract-mode starfield, big logo, mode select (arcade / survival),
 * the high score table, and the all-important INSERT COIN blink.
 * First input unlocks the AudioContext and starts the title music.
 */

import Phaser from 'phaser';
import { SCREEN } from '../config/Balance';
import { loadScores } from '../systems/HighScores';
import { CrtOverlay } from '../effects/Crt';
import { sfx } from '../audio/Sfx';
import { music } from '../audio/Music';
import { consumePressed } from '../input/Keyboard';

export class TitleScene extends Phaser.Scene {
  private stars!: Phaser.GameObjects.TileSprite;
  private nebula!: Phaser.GameObjects.TileSprite;
  private cursor = 0;
  private cursorText!: Phaser.GameObjects.BitmapText;
  private prompt!: Phaser.GameObjects.BitmapText;
  private crt!: CrtOverlay;
  private audioReady = false;
  private starting = false;

  constructor() {
    super('Title');
  }

  create(): void {
    this.starting = false;
    this.cameras.main.setBackgroundColor(0x05060d);
    this.stars = this.add.tileSprite(0, 0, SCREEN.W, SCREEN.H, 'stars0').setOrigin(0);
    this.nebula = this.add
      .tileSprite(0, 0, SCREEN.W, SCREEN.H, 'neb0')
      .setOrigin(0)
      .setAlpha(0.8);

    // logo
    const logo = this.add
      .bitmapText(SCREEN.W / 2, 26, 'retro', 'NOVASTRIKE')
      .setOrigin(0.5)
      .setScale(3)
      .setTint(0x56c4f5);
    this.add
      .bitmapText(SCREEN.W / 2, 44, 'retro', '* AMIGA CLASS SIDE SCROLLER *')
      .setOrigin(0.5)
      .setTint(0xf2c14e);
    this.tweens.add({
      targets: logo,
      y: 24,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.add.image(SCREEN.W / 2, 54, 'palette-strip').setOrigin(0.5);

    // menu
    this.add.bitmapText(SCREEN.W / 2 - 34, 68, 'retro', 'ARCADE MODE');
    this.add.bitmapText(SCREEN.W / 2 - 34, 80, 'retro', 'SURVIVAL MODE');
    this.cursorText = this.add.bitmapText(SCREEN.W / 2 - 46, 68, 'retro', '>').setTint(0xffc933);

    // high scores
    this.add
      .bitmapText(SCREEN.W / 2, 98, 'retro', '- HALL OF FAME -')
      .setOrigin(0.5, 0)
      .setTint(0xf2c14e);
    const scores = loadScores().slice(0, 5);
    scores.forEach((s, i) => {
      const row = `${i + 1}. ${s.name.padEnd(3)} ${String(s.score).padStart(7)} ${s.mode === 'survival' ? 'SRV' : 'ST' + s.stage}`;
      this.add.bitmapText(SCREEN.W / 2, 110 + i * 9, 'retro', row).setOrigin(0.5, 0);
    });

    this.prompt = this.add
      .bitmapText(SCREEN.W / 2, 160, 'retro', 'INSERT COIN - PRESS FIRE')
      .setOrigin(0.5);
    this.add
      .bitmapText(SCREEN.W / 2, 172, 'retro', 'ARROWS/WASD MOVE  SPACE FIRE  X BOMB')
      .setOrigin(0.5)
      .setAlpha(0.7);

    this.crt = new CrtOverlay(this, 1000);

    const kb = this.input.keyboard!;
    this.input.on('pointerdown', () => this.unlockAudio());
    kb.on('keydown', () => this.unlockAudio());

    this.input.gamepad?.once('down', () => this.unlockAudio());
  }

  private unlockAudio(): void {
    sfx.unlock();
    if (!this.audioReady) {
      this.audioReady = true;
      music.play('title');
    }
  }

  private move(dir: number): void {
    this.unlockAudio();
    this.cursor = (this.cursor + dir + 2) % 2;
    this.cursorText.setY(68 + this.cursor * 12);
    sfx.uiMove();
  }

  private select(): void {
    if (this.starting) return;
    this.unlockAudio();
    this.starting = true;
    sfx.uiSelect();
    music.stop();
    const mode = this.cursor === 0 ? 'arcade' : 'survival';
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Game', { mode, levelIndex: 0 });
    });
  }

  update(time: number, delta: number): void {
    this.stars.tilePositionX += (delta / 1000) * 6;
    this.nebula.tilePositionX += (delta / 1000) * 14;
    this.prompt.setVisible(Math.floor(time / 500) % 2 === 0);
    if (consumePressed('ArrowUp', 'KeyW')) this.move(-1);
    if (consumePressed('ArrowDown', 'KeyS')) this.move(1);
    if (consumePressed('Space', 'KeyZ', 'Enter')) this.select();
    // gamepad start
    const pad = this.input.gamepad && this.input.gamepad.total > 0 ? this.input.gamepad.getPad(0) : null;
    if (pad) {
      if (pad.A && !this.starting) this.select();
      if (pad.up) this.cursorText.setY(68), (this.cursor = 0);
      if (pad.down) this.cursorText.setY(80), (this.cursor = 1);
    }
    this.crt.flicker(time);
  }
}
