/**
 * NOVASTRIKE — entry point.
 *
 * 320x180 internal resolution scaled to fit, nearest-neighbour pixels,
 * arcade physics, gamepad enabled. Music pauses when the tab blurs.
 */

import Phaser from 'phaser';
import { SCREEN } from './game/config/Balance';
import { BootScene } from './game/scenes/BootScene';
import { TitleScene } from './game/scenes/TitleScene';
import { GameScene } from './game/scenes/GameScene';
import { UIScene } from './game/ui/Hud';
import { GameOverScene } from './game/scenes/GameOverScene';
import { music } from './game/audio/Music';
import { isGameplayCode } from './game/input/Keyboard';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: SCREEN.W,
  height: SCREEN.H,
  parent: 'game',
  backgroundColor: '#05060d',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  input: {
    gamepad: true,
  },
  scene: [BootScene, TitleScene, GameScene, UIScene, GameOverScene],
};

const game = new Phaser.Game(config);

// Keep keyboard control attached to the game after pointer interaction.
// Browser-level held-key tracking lives in game/input/Keyboard.ts.
game.canvas.tabIndex = 0;
game.canvas.setAttribute('aria-label', 'NOVASTRIKE game canvas');
game.canvas.addEventListener('pointerdown', () => {
  game.canvas.focus({ preventScroll: true });
});
// Registered after Phaser's keyboard manager so Phaser receives the event
// before the browser-default flag is set.
window.addEventListener(
  'keydown',
  (event) => {
    if (isGameplayCode(event.code)) event.preventDefault();
  },
  { passive: false },
);

game.events.on(Phaser.Core.Events.BLUR, () => music.pause());
game.events.on(Phaser.Core.Events.FOCUS, () => music.resume());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) music.pause();
  else music.resume();
});
