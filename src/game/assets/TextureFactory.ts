/**
 * NOVASTRIKE — texture factory.
 *
 * Runs once in BootScene:
 *  - packs every resolved pixmap into ONE canvas sprite sheet ('sprites')
 *    with named frames — a genuine runtime sprite sheet.
 *  - rasterises the 5x7 pixel font into a Phaser RetroFont ('retro').
 *  - paints the seamless parallax textures for all three level themes
 *    (stars, nebula, terrain silhouette, foreground structures) plus the
 *    CRT scanline overlay. All tiling textures are power-of-two so WebGL
 *    wraps them cleanly.
 */

import Phaser from 'phaser';
import { resolvePixmaps } from './Sprites';
import { paletteColor, PALETTE_HEX, INK } from './Palette';
import {
  FONT_CHARSET,
  FONT_CELL_W,
  FONT_CELL_H,
  FONT_PER_ROW,
  eachGlyphPixel,
} from './PixelFont';

const PAD = 1;

export function buildSpriteSheet(scene: Phaser.Scene): void {
  const maps = resolvePixmaps();

  // shelf packing
  const MAXW = 512;
  let cx = PAD;
  let cy = PAD;
  let rowH = 0;
  const placed: Array<{ x: number; y: number; m: (typeof maps)[number] }> = [];
  for (const m of maps) {
    if (cx + m.w + PAD > MAXW) {
      cx = PAD;
      cy += rowH + PAD;
      rowH = 0;
    }
    placed.push({ x: cx, y: cy, m });
    cx += m.w + PAD;
    rowH = Math.max(rowH, m.h);
  }
  const sheetH = Phaser.Math.Pow2.GetNext(cy + rowH + PAD);

  const tex = scene.textures.createCanvas('sprites', MAXW, sheetH)!;
  const ctx = tex.context;
  for (const { x, y, m } of placed) {
    for (let py = 0; py < m.h; py++) {
      const row = m.rows[py];
      for (let px = 0; px < m.w; px++) {
        const col = paletteColor(row[px]);
        if (col === null) continue;
        ctx.fillStyle = '#' + col.toString(16).padStart(6, '0');
        ctx.fillRect(x + px, y + py, 1, 1);
      }
    }
    tex.add(m.name, 0, x, y, m.w, m.h);
  }
  tex.refresh();
}

export function buildRetroFont(scene: Phaser.Scene): void {
  const cols = FONT_PER_ROW;
  const rows = Math.ceil(FONT_CHARSET.length / cols);
  const w = Phaser.Math.Pow2.GetNext(cols * FONT_CELL_W);
  const h = Phaser.Math.Pow2.GetNext(rows * FONT_CELL_H);
  const tex = scene.textures.createCanvas('fontimg', w, h)!;
  const ctx = tex.context;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < FONT_CHARSET.length; i++) {
    const gx = (i % cols) * FONT_CELL_W;
    const gy = Math.floor(i / cols) * FONT_CELL_H;
    eachGlyphPixel(FONT_CHARSET[i], (x, y) => ctx.fillRect(gx + x, gy + y, 1, 1));
  }
  tex.refresh();

  const config: Phaser.Types.GameObjects.BitmapText.RetroFontConfig = {
    image: 'fontimg',
    width: FONT_CELL_W,
    height: FONT_CELL_H,
    chars: FONT_CHARSET,
    charsPerRow: cols,
    'spacing.x': 0,
    'spacing.y': 0,
    'offset.x': 0,
    'offset.y': 0,
    lineSpacing: 2,
  };
  scene.cache.bitmapFont.add(
    'retro',
    Phaser.GameObjects.RetroFont.Parse(scene, config),
  );
}

/* ------------------------------------------------------------------ */
/*  Procedural parallax textures (per level theme)                      */
/* ------------------------------------------------------------------ */

function canvas(scene: Phaser.Scene, key: string, w: number, h: number) {
  const tex = scene.textures.createCanvas(key, w, h)!;
  return { tex, ctx: tex.context };
}

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Layer 1 — distant stars (shared, recoloured per theme via tint). */
function paintStars(scene: Phaser.Scene, key: string, seed: number, dense: number) {
  const { tex, ctx } = canvas(scene, key, 512, 256);
  const r = rng(seed);
  for (let i = 0; i < dense; i++) {
    const x = Math.floor(r() * 512);
    const y = Math.floor(r() * 256);
    const v = r();
    ctx.fillStyle = v > 0.92 ? INK.ice : v > 0.7 ? INK.steelLight : INK.steel;
    ctx.fillRect(x, y, 1, 1);
    if (v > 0.97) {
      ctx.fillStyle = INK.white;
      ctx.fillRect(x, y, 1, 1);
      ctx.fillStyle = INK.steel;
      ctx.fillRect(x - 1, y, 1, 1);
      ctx.fillRect(x + 1, y, 1, 1);
      ctx.fillRect(x, y - 1, 1, 1);
      ctx.fillRect(x, y + 1, 1, 1);
    }
  }
  tex.refresh();
}

/** Layer 2 — nebula clouds: blobby additive wisps, wrap-safe. */
function paintNebula(
  scene: Phaser.Scene,
  key: string,
  seed: number,
  colors: string[],
) {
  const { tex, ctx } = canvas(scene, key, 512, 256);
  const r = rng(seed);
  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 70; i++) {
    const cx = r() * 512;
    const cy = r() * 256;
    const rad = 14 + r() * 42;
    ctx.fillStyle = colors[Math.floor(r() * colors.length)];
    for (const ox of [-512, 0, 512]) {
      ctx.beginPath();
      ctx.ellipse(cx + ox, cy, rad, rad * (0.4 + r() * 0.4), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // pixel speckle to break the smoothness
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = colors[Math.floor(r() * colors.length)];
    ctx.fillRect(Math.floor(r() * 512), Math.floor(r() * 256), 1, 1);
  }
  ctx.globalAlpha = 1;
  tex.refresh();
}

/** Layer 3 — mountains / terrain silhouette along the bottom (wrap-safe). */
function paintTerrain(
  scene: Phaser.Scene,
  key: string,
  seed: number,
  baseCol: string,
  ridgeCol: string,
  jag: number,
) {
  const { tex, ctx } = canvas(scene, key, 512, 256);
  const r = rng(seed);
  // wrap-safe heightmap via sum of sines with integer cycle counts
  const a1 = 10 + r() * 14;
  const a2 = 5 + r() * 9;
  const p1 = r() * Math.PI * 2;
  const p2 = r() * Math.PI * 2;
  const heights: number[] = [];
  for (let x = 0; x < 512; x++) {
    const t = (x / 512) * Math.PI * 2;
    let h =
      54 +
      a1 * Math.sin(t * 3 + p1) +
      a2 * Math.sin(t * 7 + p2) +
      jag * Math.sin(t * 17 + p1 * 2);
    heights.push(Math.round(h));
  }
  for (let x = 0; x < 512; x++) {
    const h = heights[x];
    ctx.fillStyle = baseCol;
    ctx.fillRect(x, 256 - h, 1, h);
    ctx.fillStyle = ridgeCol;
    ctx.fillRect(x, 256 - h, 1, 2);
  }
  tex.refresh();
}

/** Layer 4 — foreground mechanical structures: girders + towers (dark, fast). */
function paintStructures(
  scene: Phaser.Scene,
  key: string,
  seed: number,
  col: string,
  lit: string,
) {
  const { tex, ctx } = canvas(scene, key, 512, 256);
  const r = rng(seed);
  let x = 0;
  while (x < 512) {
    const w = 14 + Math.floor(r() * 30);
    const h = 24 + Math.floor(r() * 80);
    if (r() < 0.62 && x + w <= 512) {
      ctx.fillStyle = col;
      ctx.fillRect(x, 256 - h, w, h);
      // girder cutouts
      ctx.clearRect(x + 3, 256 - h + 6, w - 6, 4);
      if (h > 40) ctx.clearRect(x + 3, 256 - h + 18, w - 6, 4);
      // antenna + warning light
      if (r() < 0.5) {
        ctx.fillStyle = col;
        ctx.fillRect(x + Math.floor(w / 2), 256 - h - 10, 2, 10);
        ctx.fillStyle = lit;
        ctx.fillRect(x + Math.floor(w / 2), 256 - h - 12, 2, 2);
      }
      // lit windows
      ctx.fillStyle = lit;
      for (let i = 0; i < Math.floor(h / 14); i++) {
        if (r() < 0.6)
          ctx.fillRect(x + 3 + Math.floor(r() * (w - 6)), 256 - h + 10 + i * 12, 2, 2);
      }
    }
    x += w + 6 + Math.floor(r() * 26);
  }
  tex.refresh();
}

/** CRT overlay: 1px scanlines + subtle aperture tint, tiled. */
function paintScanlines(scene: Phaser.Scene) {
  const { tex, ctx } = canvas(scene, 'scanlines', 4, 4);
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.fillRect(0, 1, 4, 1);
  ctx.fillRect(0, 3, 4, 1);
  ctx.fillStyle = 'rgba(20,40,60,0.10)';
  ctx.fillRect(0, 0, 4, 1);
  tex.refresh();
}

/** Vignette for CRT mode. */
function paintVignette(scene: Phaser.Scene) {
  const { tex, ctx } = canvas(scene, 'vignette', 320, 180);
  const g = ctx.createRadialGradient(160, 90, 70, 160, 90, 210);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 320, 180);
  tex.refresh();
}

export interface ThemeKeys {
  stars: string;
  nebula: string;
  terrain: string;
  structures: string;
  sky: number; // background colour
}

export const THEMES: ThemeKeys[] = [
  { stars: 'stars0', nebula: 'neb0', terrain: 'ter0', structures: 'str0', sky: 0x05060d },
  { stars: 'stars1', nebula: 'neb1', terrain: 'ter1', structures: 'str1', sky: 0x0a0716 },
  { stars: 'stars2', nebula: 'neb2', terrain: 'ter2', structures: 'str2', sky: 0x070409 },
];

export function buildParallaxTextures(scene: Phaser.Scene): void {
  // Level 1 — asteroid field: cold blues
  paintStars(scene, 'stars0', 101, 240);
  paintNebula(scene, 'neb0', 11, [INK.navy, INK.blue, INK.purple]);
  paintTerrain(scene, 'ter0', 21, INK.steelDark, '#3a3a52', 3);
  paintStructures(scene, 'str0', 31, '#101018', INK.cyan);

  // Level 2 — alien planet: green/violet
  paintStars(scene, 'stars1', 202, 160);
  paintNebula(scene, 'neb1', 12, [INK.moss, INK.green, INK.violetDeep]);
  paintTerrain(scene, 'ter1', 22, '#0d2615', '#1f7a33', 6);
  paintStructures(scene, 'str1', 32, '#0a1410', INK.acid);

  // Level 3 — enemy fortress: red steel
  paintStars(scene, 'stars2', 303, 200);
  paintNebula(scene, 'neb2', 13, ['#2a0a14', INK.crimson, INK.violetDeep]);
  paintTerrain(scene, 'ter2', 23, '#1c1218', '#46091c', 2);
  paintStructures(scene, 'str2', 33, '#140a0e', INK.red);

  paintScanlines(scene);
  paintVignette(scene);

  // palette strip (title flourish / debugging)
  const { tex, ctx } = canvas(scene, 'palette-strip', 64, 2);
  PALETTE_HEX.forEach((hex, i) => {
    ctx.fillStyle = hex;
    ctx.fillRect(i * 2, 0, 2, 2);
  });
  tex.refresh();
}
