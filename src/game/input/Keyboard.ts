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
]);

const held = new Set<string>();

window.addEventListener(
  'keydown',
  (event) => {
    if (!gameplayCodes.has(event.code)) return;
    event.preventDefault();
    held.add(event.code);
  },
  { capture: true, passive: false },
);

window.addEventListener(
  'keyup',
  (event) => {
    if (!gameplayCodes.has(event.code)) return;
    event.preventDefault();
    held.delete(event.code);
  },
  { capture: true, passive: false },
);

window.addEventListener('blur', () => held.clear());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) held.clear();
});

export function isHeld(...codes: string[]): boolean {
  return codes.some((code) => held.has(code));
}
