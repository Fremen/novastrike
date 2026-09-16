/**
 * NOVASTRIKE — HUD scene.
 *
 * Runs on top of GameScene: score, hi-score, lives, bombs, shield, weapon
 * readout, boss health bar, pause overlay and the option keys
 * (P pause · C CRT · M mute · A autofire · ESC quit).
 */

import Phaser from 'phaser';
import { SCREEN, PLAYER } from '../config/Balance';
import { topScore } from '../systems/HighScores';
import { CrtOverlay } from '../effects/Crt';
import { sfx } from '../audio/Sfx';
import { music } from '../audio/Music';

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.BitmapText;
  private hiText!: Phaser.GameObjects.BitmapText;
  private weaponText!: Phaser.GameObjects.BitmapText;
  private lifeIcons: Phaser.GameObjects.Image[] = [];
  private bombIcons: Phaser.GameObjects.Image[] = [];
  private shieldGfx!: Phaser.GameObjects.Graphics;
  private shieldVal = PLAYER.startShield;
  private bossBar!: Phaser.GameObjects.Graphics;
  private bossName!: Phaser.GameObjects.BitmapText;
  private bossFrac = 0;
  private bossVisible = false;
  private pausedText!: Phaser.GameObjects.BitmapText;
  private toast!: Phaser.GameObjects.BitmapText;
  private toastTimer = 0;
  private crt!: CrtOverlay;
  private handlers: Array<[string, (...args: never[]) => void]> = [];

  constructor() {
    super('UI');
  }

  create(): void {
    const game = this.scene.get('Game');

    this.scoreText = this.add.bitmapText(4, 3, 'retro', 'SCORE 0').setDepth(10);
    this.hiText = this.add
      .bitmapText(SCREEN.W - 4, 3, 'retro', `HI ${topScore()}`)
      .setOrigin(1, 0)
      .setDepth(10);
    this.weaponText = this.add
      .bitmapText(SCREEN.W - 4, SCREEN.H - 10, 'retro', 'TWIN LASER LV1')
      .setOrigin(1, 0)
      .setDepth(10);

    for (let i = 0; i < PLAYER.maxLives; i++) {
      this.lifeIcons.push(
        this.add.image(8 + i * 13, SCREEN.H - 7, 'sprites', 'icon-life').setDepth(10),
      );
    }
    for (let i = 0; i < PLAYER.maxBombs; i++) {
      this.bombIcons.push(
        this.add.image(90 + i * 9, SCREEN.H - 7, 'sprites', 'icon-bomb').setDepth(10),
      );
    }

    this.shieldGfx = this.add.graphics().setDepth(10);
    this.bossBar = this.add.graphics().setDepth(10);
    this.bossName = this.add
      .bitmapText(SCREEN.W / 2, 12, 'retro', '')
      .setOrigin(0.5, 0)
      .setDepth(10);

    this.pausedText = this.add
      .bitmapText(SCREEN.W / 2, SCREEN.H / 2, 'retro', 'PAUSED')
      .setOrigin(0.5)
      .setScale(2)
      .setDepth(11)
      .setVisible(false);

    this.toast = this.add
      .bitmapText(SCREEN.W / 2, SCREEN.H - 24, 'retro', '')
      .setOrigin(0.5)
      .setDepth(11)
      .setAlpha(0);

    this.crt = new CrtOverlay(this, 1000);

    /* ---------------- game event wiring ---------------- */
    const on = (ev: string, fn: (...args: never[]) => void) => {
      game.events.on(ev, fn);
      this.handlers.push([ev, fn]);
    };

    on('score', ((score: number, hi: number) => {
      this.scoreText.setText(`SCORE ${score}`);
      this.hiText.setText(`HI ${Math.max(hi, score)}`);
    }) as never);
    on('lives', ((n: number) => {
      this.lifeIcons.forEach((ic, i) => ic.setVisible(i < n));
    }) as never);
    on('bombs', ((n: number) => {
      this.bombIcons.forEach((ic, i) => ic.setVisible(i < n));
    }) as never);
    on('shield-changed', ((n: number) => {
      this.shieldVal = n;
      this.drawShield();
    }) as never);
    on('weapon-changed', ((name: string, lvl: number) => {
      this.weaponText.setText(`${name} LV${lvl}`);
    }) as never);
    on('boss-hp', ((frac: number, name: string) => {
      this.bossFrac = frac;
      this.bossVisible = frac > 0;
      this.bossName.setText(frac > 0 ? name : '');
      this.drawBossBar();
    }) as never);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const [ev, fn] of this.handlers) game.events.off(ev, fn);
      this.handlers.length = 0;
      this.lifeIcons.length = 0;
      this.bombIcons.length = 0;
    });

    /* ---------------- option keys ---------------- */
    const kb = this.input.keyboard!;
    kb.on('keydown-P', () => this.togglePause());
    kb.on('keydown-C', () => {
      this.crt.toggle();
      this.showToast(`CRT ${CrtOverlay.enabled(this) ? 'ON' : 'OFF'}`);
    });
    kb.on('keydown-M', () => {
      sfx.setMuted(!sfx.muted);
      this.showToast(sfx.muted ? 'SOUND OFF' : 'SOUND ON');
    });
    kb.on('keydown-F', () => {
      const g = this.scene.get('Game') as Phaser.Scene & {
        player?: { autofire: boolean };
      };
      if (g.player) {
        g.player.autofire = !g.player.autofire;
        this.showToast(`AUTOFIRE ${g.player.autofire ? 'ON' : 'OFF'}`);
      }
    });
    kb.on('keydown-ESC', () => {
      music.stop();
      this.scene.stop('Game');
      this.scene.start('Title');
    });

    this.drawShield();
    this.drawBossBar();
  }

  private togglePause(): void {
    if (this.scene.isPaused('Game')) {
      this.scene.resume('Game');
      music.resume();
      this.pausedText.setVisible(false);
    } else if (this.scene.isActive('Game')) {
      this.scene.pause('Game');
      music.pause();
      this.pausedText.setVisible(true);
      sfx.uiSelect();
    }
  }

  private drawShield(): void {
    const g = this.shieldGfx;
    g.clear();
    const x0 = 138;
    const y0 = SCREEN.H - 10;
    for (let i = 0; i < PLAYER.maxShield; i++) {
      g.fillStyle(0x21222e, 1);
      g.fillRect(x0 + i * 9, y0, 7, 6);
      if (i < this.shieldVal) {
        g.fillStyle(0x56c4f5, 1);
        g.fillRect(x0 + i * 9 + 1, y0 + 1, 5, 4);
      }
      g.lineStyle(1, 0x45465c, 1);
      g.strokeRect(x0 + i * 9 + 0.5, y0 + 0.5, 7, 6);
    }
  }

  private drawBossBar(): void {
    const g = this.bossBar;
    g.clear();
    if (!this.bossVisible) return;
    const w = 140;
    const x0 = (SCREEN.W - w) / 2;
    const y0 = 20;
    g.fillStyle(0x101018, 0.9);
    g.fillRect(x0 - 1, y0 - 1, w + 2, 6);
    g.fillStyle(0x9e2433, 1);
    g.fillRect(x0, y0, Math.max(0, Math.round(w * this.bossFrac)), 4);
    g.fillStyle(0xe04658, 1);
    g.fillRect(x0, y0, Math.max(0, Math.round(w * this.bossFrac)), 2);
    g.lineStyle(1, 0x45465c, 1);
    g.strokeRect(x0 - 1.5, y0 - 1.5, w + 3, 7);
  }

  private showToast(msg: string): void {
    this.toast.setText(msg).setAlpha(1);
    this.toastTimer = 1200;
  }

  update(_t: number, delta: number): void {
    if (this.toastTimer > 0) {
      this.toastTimer -= delta;
      if (this.toastTimer < 400) this.toast.setAlpha(Math.max(0, this.toastTimer / 400));
    }
  }
}
