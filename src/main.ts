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

// Keep keyboard control attached to the game after pointer interaction and stop
// browser navigation/scroll shortcuts from stealing gameplay input.
const gameplayKeys = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'w',
  'a',
  's',
  'd',
  'W',
  'A',
  'S',
  'D',
  ' ',
  'z',
  'x',
  'Z',
  'X',
  'Shift',
]);

game.canvas.tabIndex = 0;
game.canvas.setAttribute('aria-label', 'NOVASTRIKE game canvas');
game.canvas.addEventListener('pointerdown', () => {
  game.canvas.focus({ preventScroll: true });
});
window.addEventListener(
  'keydown',
  (event) => {
    if (gameplayKeys.has(event.key)) event.preventDefault();
  },
  { passive: false },
);

game.events.on(Phaser.Core.Events.BLUR, () => music.pause());
game.events.on(Phaser.Core.Events.FOCUS, () => music.resume());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) music.pause();
  else music.resume();
});
