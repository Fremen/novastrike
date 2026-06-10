/**
 * Renders every resolved pixmap + the pixel font into assets/spritesheet.png
 * (4x scale, labelled) using pngjs — no browser required. Run: npm run spritesheet
 *
 * This is both a deliverable (the sprite sheet) and the art-review loop:
 * the PNG is generated from the *same* data the game packs at boot.
 */
import { PNG } from 'pngjs';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { resolvePixmaps } from '../src/game/assets/Sprites';
import { paletteColor } from '../src/game/assets/Palette';
import {
  FONT_CHARSET,
  FONT_CELL_W,
  FONT_CELL_H,
  eachGlyphPixel,
} from '../src/game/assets/PixelFont';

const SCALE = 4;
const PAD = 6;
const BG = 0x10101a;

interface Cell {
  name: string;
  w: number;
  h: number;
  rows: string[];
}

const maps = resolvePixmaps();

// layout: rows of sprites, wrap at 720px logical width
const MAXW = 760;
let cx = PAD;
let cy = PAD;
let rowH = 0;
const placed: Array<Cell & { x: number; y: number }> = [];
for (const m of maps) {
  if (cx + m.w > MAXW) {
    cx = PAD;
    cy += rowH + PAD + 10; // + label space
    rowH = 0;
  }
  placed.push({ ...m, x: cx, y: cy });
  cx += m.w + PAD;
  rowH = Math.max(rowH, m.h);
}
const fontY = cy + rowH + PAD + 14;
const fontRows = Math.ceil(FONT_CHARSET.length / 16);
const totalW = MAXW;
const totalH = fontY + fontRows * FONT_CELL_H + PAD + 10;

const png = new PNG({ width: totalW * SCALE, height: totalH * SCALE });

function put(x: number, y: number, rgb: number) {
  for (let sy = 0; sy < SCALE; sy++) {
    for (let sx = 0; sx < SCALE; sx++) {
      const px = x * SCALE + sx;
      const py = y * SCALE + sy;
      if (px < 0 || py < 0 || px >= png.width || py >= png.height) continue;
      const i = (py * png.width + px) << 2;
      png.data[i] = (rgb >> 16) & 0xff;
      png.data[i + 1] = (rgb >> 8) & 0xff;
      png.data[i + 2] = rgb & 0xff;
      png.data[i + 3] = 255;
    }
  }
}

// background + faint checker so transparency is visible
for (let y = 0; y < totalH; y++) {
  for (let x = 0; x < totalW; x++) {
    const check = ((x >> 2) + (y >> 2)) & 1 ? BG : 0x14141f;
    put(x, y, check);
  }
}

function drawLabel(text: string, x: number, y: number) {
  let dx = x;
  for (const ch of text.toUpperCase()) {
    eachGlyphPixel(ch, (gx, gy) => put(dx + gx, y + gy, 0x9b9bb3));
    dx += 6;
  }
}

for (const m of placed) {
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      const col = paletteColor(m.rows[y][x]);
      if (col !== null) put(m.x + x, m.y + y, col);
    }
  }
  drawLabel(m.name.slice(0, Math.floor(m.w / 6) + 4), m.x, m.y + m.h + 2);
}

// font sheet preview
drawLabel('FONT 5X7', PAD, fontY - 10);
for (let i = 0; i < FONT_CHARSET.length; i++) {
  const ch = FONT_CHARSET[i];
  const gx = PAD + (i % 16) * FONT_CELL_W;
  const gy = fontY + Math.floor(i / 16) * FONT_CELL_H;
  eachGlyphPixel(ch, (x, y) => put(gx + x, gy + y, 0xffffff));
}

const outDir = path.resolve('assets');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'spritesheet.png');
png.pack().pipe(fs.createWriteStream(outFile)).on('finish', () => {
  console.log(`wrote ${outFile} (${png.width}x${png.height})`);
  console.log(`${maps.length} sprites`);
});
