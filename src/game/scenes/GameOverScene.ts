/**
 * NOVASTRIKE — game over / victory scene.
 *
 * If the run qualifies for the table: classic 3-letter initials entry
 * (up/down cycles, left/right or fire advances). Then the hall of fame.
 */

import Phaser from 'phaser';
import { SCREEN } from '../config/Balance';
import { loadScores, qualifies, saveScore } from '../systems/HighScores';
import { CrtOverlay } from '../effects/Crt';
import { sfx } from '../audio/Sfx';
import { music } from '../audio/Music';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

interface OverData {
  score: number;
  stage: number;
  mode: 'arcade' | 'survival';
  victory: boolean;
}

export class GameOverScene extends Phaser.Scene {
  private data2!: OverData;
  private entering = false;
  private slots = [0, 0, 0];
  private slotIdx = 0;
  private slotTexts: Phaser.GameObjects.BitmapText[] = [];
  private done = false;
  private crt!: CrtOverlay;

  constructor() {
    super('GameOver');
  }

  init(data: OverData): void {
    this.data2 = data;
    this.entering = false;
    this.done = false;
    this.slots = [0, 0, 0];
    this.slotIdx = 0;
    this.slotTexts = [];
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x05060d);
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.add.tileSprite(0, 0, SCREEN.W, SCREEN.H, 'stars0').setOrigin(0).setAlpha(0.7);

    const title = this.data2.victory ? 'MISSION COMPLETE!' : 'GAME OVER';
    const tint = this.data2.victory ? 0x49c46a : 0xe04658;
    this.add
      .bitmapText(SCREEN.W / 2, 26, 'retro', title)
      .setOrigin(0.5)
      .setScale(2)
      .setTint(tint);
    this.add
      .bitmapText(
        SCREEN.W / 2,
        44,
        'retro',
        `SCORE ${this.data2.score}   ${this.data2.mode === 'survival' ? 'SURVIVAL' : 'STAGE ' + this.data2.stage}`,
      )
      .setOrigin(0.5);

    if (qualifies(this.data2.score)) {
      this.entering = true;
      this.add
        .bitmapText(SCREEN.W / 2, 66, 'retro', 'NEW HIGH SCORE! ENTER YOUR NAME')
        .setOrigin(0.5)
        .setTint(0xffc933);
      for (let i = 0; i < 3; i++) {
        const t = this.add
          .bitmapText(SCREEN.W / 2 - 18 + i * 18, 84, 'retro', 'A')
          .setOrigin(0.5)
          .setScale(2);
        this.slotTexts.push(t);
      }
      sfx.extraLife();
    } else {
      this.showTable();
    }

    this.crt = new CrtOverlay(this, 1000);

    const kb = this.input.keyboard!;
    kb.on('keydown-UP', () => this.cycle(1));
    kb.on('keydown-DOWN', () => this.cycle(-1));
    kb.on('keydown-W', () => this.cycle(1));
    kb.on('keydown-S', () => this.cycle(-1));
    kb.on('keydown-LEFT', () => this.moveSlot(-1));
    kb.on('keydown-RIGHT', () => this.moveSlot(1));
    kb.on('keydown-SPACE', () => this.confirm());
    kb.on('keydown-Z', () => this.confirm());
    kb.on('keydown-ENTER', () => this.confirm());
  }

  private cycle(dir: number): void {
    if (!this.entering) return;
    this.slots[this.slotIdx] =
      (this.slots[this.slotIdx] + dir + ALPHABET.length) % ALPHABET.length;
    sfx.uiMove();
    this.refreshSlots();
  }

  private moveSlot(dir: number): void {
    if (!this.entering) return;
    this.slotIdx = Phaser.Math.Clamp(this.slotIdx + dir, 0, 2);
    this.refreshSlots();
  }

  private refreshSlots(): void {
    this.slotTexts.forEach((t, i) => {
      t.setText(ALPHABET[this.slots[i]]);
      t.setTint(i === this.slotIdx ? 0xffc933 : 0xffffff);
    });
  }

  private confirm(): void {
    if (this.entering) {
      if (this.slotIdx < 2) {
        this.slotIdx++;
        this.refreshSlots();
        sfx.uiSelect();
        return;
      }
      const name = this.slots.map((i) => ALPHABET[i]).join('');
      saveScore({
        name,
        score: this.data2.score,
        stage: this.data2.stage,
        mode: this.data2.mode,
      });
      this.entering = false;
      sfx.uiSelect();
      this.showTable();
      return;
    }
    if (this.done) {
      music.stop();
      this.scene.start('Title');
    }
  }

  private showTable(): void {
    this.add
      .bitmapText(SCREEN.W / 2, 104, 'retro', '- HALL OF FAME -')
      .setOrigin(0.5)
      .setTint(0xf2c14e);
    loadScores()
      .slice(0, 5)
      .forEach((s, i) => {
        const row = `${i + 1}. ${s.name.padEnd(3)} ${String(s.score).padStart(7)}`;
        this.add.bitmapText(SCREEN.W / 2, 116 + i * 9, 'retro', row).setOrigin(0.5, 0);
      });
    const prompt = this.add
      .bitmapText(SCREEN.W / 2, 168, 'retro', 'PRESS FIRE')
      .setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.2, duration: 400, yoyo: true, repeat: -1 });
    this.time.delayedCall(600, () => (this.done = true));
  }

  update(time: number): void {
    this.crt.flicker(time);
    const pad = this.input.gamepad && this.input.gamepad.total > 0 ? this.input.gamepad.getPad(0) : null;
    if (pad?.A && this.done) this.confirm();
  }
}
