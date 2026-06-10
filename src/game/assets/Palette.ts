/**
 * NOVASTRIKE — master palette.
 *
 * One fixed 32-colour palette in the spirit of Amiga AGA-era arcade ports.
 * Every sprite in the game indexes into this table; '.' is transparent.
 *
 * The palette is organised in ramps so pixel maps read naturally:
 *   0-7   steel / greys          (hulls, fortress armour, smoke)
 *   8-C   hero blues / cyans     (player ship, shields, beam)
 *   D-H   fire ramp              (engines, explosions, muzzle)
 *   I-L   enemy crimson          (fighters, gunships)
 *   M-O   void purple            (elites, nebulae)
 *   P-S   bio green              (level 2 aliens, acid)
 *   T-V   brass / gold           (power-ups, score, boss trim)
 *
 * Pure data on purpose: scripts/export-spritesheet.ts renders the same
 * maps with pngjs in Node, so this file must not import Phaser.
 */

export const PALETTE_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUV';

export const PALETTE_HEX: string[] = [
  // steel ramp
  '#000000', // 0 black
  '#15151f', // 1 near-black blue
  '#2a2a3a', // 2 dark steel
  '#45455c', // 3 mid steel
  '#6b6b85', // 4 steel
  '#9b9bb3', // 5 light steel
  '#cfcfe0', // 6 pale steel
  '#ffffff', // 7 white
  // hero blues
  '#0a2a4a', // 8 deep navy
  '#14528f', // 9 hull blue
  '#1f8fd9', // A bright blue
  '#56c4f5', // B sky cyan
  '#bdefff', // C ice highlight
  // fire ramp
  '#701708', // D ember
  '#d93a14', // E flame red
  '#ff7a1f', // F orange
  '#ffc933', // G amber
  '#fff3b0', // H hot core
  // enemy crimson
  '#46091c', // I dried blood
  '#8f1433', // J crimson
  '#d92452', // K hot pink-red
  '#ff6e96', // L rose highlight
  // void purple
  '#270a3d', // M deep violet
  '#5c1f8f', // N purple
  '#a04df0', // O bright violet
  // bio green
  '#0a3d1f', // P deep moss
  '#1f7a33', // Q alien green
  '#3dd95c', // R acid green
  '#b4ff7a', // S chartreuse glow
  // brass / gold
  '#7a5414', // T bronze shadow
  '#d9a51f', // U brass
  '#ffe783', // V gold highlight
];

/** char -> packed 0xRRGGBB, transparent chars absent */
export const PALETTE_RGB: Record<string, number> = {};
for (let i = 0; i < PALETTE_CHARS.length; i++) {
  PALETTE_RGB[PALETTE_CHARS[i]] = parseInt(PALETTE_HEX[i].slice(1), 16);
}

export function paletteColor(ch: string): number | null {
  if (ch === '.' || ch === ' ') return null;
  const v = PALETTE_RGB[ch];
  return v === undefined ? null : v;
}

/** Convenience CSS lookups used by HUD / procedural texture painters. */
export const INK = {
  black: '#000000',
  white: '#ffffff',
  steelDark: '#2a2a3a',
  steel: '#6b6b85',
  steelLight: '#cfcfe0',
  navy: '#0a2a4a',
  blue: '#1f8fd9',
  cyan: '#56c4f5',
  ice: '#bdefff',
  ember: '#701708',
  flame: '#d93a14',
  orange: '#ff7a1f',
  amber: '#ffc933',
  hot: '#fff3b0',
  crimson: '#8f1433',
  red: '#d92452',
  rose: '#ff6e96',
  violetDeep: '#270a3d',
  purple: '#5c1f8f',
  violet: '#a04df0',
  moss: '#0a3d1f',
  green: '#1f7a33',
  acid: '#3dd95c',
  chartreuse: '#b4ff7a',
  bronze: '#7a5414',
  brass: '#d9a51f',
  gold: '#ffe783',
};
