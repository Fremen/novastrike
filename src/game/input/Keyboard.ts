/**
 * Browser-level held-key state for gameplay controls.
 *
 * Phaser's keyboard plugin remains the primary input source. This small
 * fallback keeps movement reliable when the canvas gains focus after a click
 * or when the game is hosted inside a page that handles arrow keys itself.
 * Physical `code` values make WASD independent of keyboard layout.
 */

const gameplayCodes = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'Space',
  'KeyZ',
  'KeyX',
  'ShiftLeft',
  'ShiftRight',
  'Enter',
]);

const held = new Set<string>();
const pressed = new Set<string>();

window.addEventListener(
  'keydown',
  (event) => {
    if (!gameplayCodes.has(event.code)) return;
    if (!held.has(event.code)) pressed.add(event.code);
    held.add(event.code);
  },
  { capture: true },
);

window.addEventListener(
  'keyup',
  (event) => {
    if (!gameplayCodes.has(event.code)) return;
    held.delete(event.code);
  },
  { capture: true },
);

window.addEventListener('blur', () => {
  held.clear();
  pressed.clear();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    held.clear();
    pressed.clear();
  }
});

export function isHeld(...codes: string[]): boolean {
  return codes.some((code) => held.has(code));
}

export function consumePressed(...codes: string[]): boolean {
  const code = codes.find((candidate) => pressed.has(candidate));
  if (!code) return false;
  pressed.delete(code);
  return true;
}

export function isGameplayCode(code: string): boolean {
  return gameplayCodes.has(code);
}
