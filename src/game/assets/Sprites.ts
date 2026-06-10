/**
 * NOVASTRIKE — sprite source.
 *
 * Small sprites are hand-authored as rows of palette indices ('.' =
 * transparent, chars index Palette.ts), with symmetric ships authored as a
 * half and mirrored — exactly how a 1992 pixel artist would have worked.
 * The five large sprites (mini-bosses and bosses) are built by small pixel
 * recipes: silhouette profile + shading bands + a core "eye" centred on the
 * mirror line, so the mirrored result is a single coherent machine.
 *
 * resolvePixmaps() returns the final, mirrored, letter-baked pixel grids.
 * TextureFactory packs them into one runtime sprite sheet; the node script
 * scripts/export-spritesheet.ts renders the identical data to a PNG.
 *
 * Pure data + math only — no Phaser imports (shared with node).
 */

import { eachGlyphPixel, FONT_H, FONT_W } from './PixelFont';

export interface PixmapDef {
  name: string;
  rows: string[];
  /** mirror vertically: 'even' duplicates all rows, 'odd' treats last row as centreline */
  mirrorY?: 'even' | 'odd';
  /** mirror horizontally per row */
  mirrorX?: 'even' | 'odd';
}

export interface ResolvedPixmap {
  name: string;
  w: number;
  h: number;
  rows: string[]; // all rows padded to w
}

/* ------------------------------------------------------------------ */
/*  Hand-authored maps                                                  */
/* ------------------------------------------------------------------ */

const DEFS: PixmapDef[] = [
  // ---------- player ship (faces right) — top half + centre ----------
  {
    name: 'player',
    mirrorY: 'odd',
    rows: [
      '......55',
      '.....3455',
      '...23445533',
      '..2349444444433',
      '.F23899999999A99543',
      'GF2389AAAABBCCBAA99657',
    ],
  },

  // ---------- engine flame, 2 frames ----------
  { name: 'flame0', rows: ['..FG', 'EFGH', 'FGHH', 'EFGH', '..FG'] },
  { name: 'flame1', rows: ['.EF', 'FGHG', 'EGHH', 'FGHG', '.EF'] },

  // ---------- muzzle flash ----------
  { name: 'muzzle', rows: ['..G..', '.GHG.', 'GHHHG', '.GHG.', '..G..'] },

  // ---------- player shots ----------
  { name: 'pshot-laser', rows: ['BCCCCCB7', 'ABBBBBC7'] },
  { name: 'pshot-spread', rows: ['.GGV', 'UGVH', '.GGV'] },
  {
    name: 'pshot-plasma0',
    rows: [
      '...RR...',
      '..RSSR..',
      '.RSHHSR.',
      'RSHHHHSR',
      'RSHHHHSR',
      '.RSHHSR.',
      '..RSSR..',
      '...RR...',
    ],
  },
  {
    name: 'pshot-plasma1',
    rows: [
      '...SS...',
      '..SHHS..',
      '.SHHHHS.',
      'SHHHHHHS',
      'SHHHHHHS',
      '.SHHHHS.',
      '..SHHS..',
      '...SS...',
    ],
  },
  { name: 'pshot-missile', mirrorY: 'odd', rows: ['.5....G', '4666777H'] },

  // ---------- enemy: small fighter (dart, faces left) ----------
  {
    name: 'fighter',
    mirrorY: 'odd',
    rows: [
      '..........JJ',
      '.......JJKKJ',
      '....JJKKKLKJJ',
      '.LKJJKKLLLKKJ2',
      '7LKKKLLOLLKJJ2',
    ],
  },

  // ---------- enemy: kamikaze (spiky ball) ----------
  {
    name: 'kamikaze',
    mirrorY: 'odd',
    mirrorX: 'odd',
    rows: [
      '.....K',
      '.....J',
      '..J.JKJ',
      '..JJKKL',
      'KJKKLLG',
      'KJKLLGHH',
    ],
  },

  // ---------- enemy: formation drone ----------
  {
    name: 'drone',
    mirrorY: 'even',
    rows: ['...MNNM', '.MNNOONNM', 'MNOOLOONN2', 'NOOLLLONN2'],
  },

  // ---------- turret (base sits on surface, gun rotates) ----------
  {
    name: 'turret-base',
    rows: [
      '....3443....',
      '..23444432..',
      '.2344554432.',
      '234455554432',
      '344555555443',
      '244444444442',
      '122222222221',
    ],
  },
  { name: 'turret-gun', rows: ['344455567', '455666677', '344455567'] },

  // ---------- enemy: gunship ----------
  {
    name: 'gunship',
    mirrorY: 'even',
    rows: [
      '...........IJJJJJI',
      '......IIJJJKKKKKKJJI',
      '...IIJKKKKKKLLLKKKKJJI',
      '.IJJKKLLLLLLLLLLLKKKJJI2',
      'IJKKLL44LLLLOOOLLLKKKJJI2',
      'IJKLL4774LLLOOOOLLLKKKJJ22',
      'IJKKLL44LLLLOOOLLLKKJJI2',
      '.IJJKKKKKKKKKKKKKKJJII2',
    ],
  },

  // ---------- enemy: missile launcher ----------
  {
    name: 'launcher',
    mirrorY: 'even',
    rows: [
      '..344444444443',
      '.34555555555543',
      '.2344444444444322222',
      'IJJJJJJJJJJJJJJJJJJJJ2',
      'IJKKKKKKKKKKKKKKKKKJJ22',
      'IJKKLLLLLLLLLLLLLKKJJ22',
      '.IJJKKKKKKKKKKKKKJJI2',
    ],
  },

  // ---------- enemy missile ----------
  { name: 'emissile', mirrorY: 'odd', rows: ['......4.G', 'L66655554GH'] },

  // ---------- elite enemy ----------
  {
    name: 'elite',
    mirrorY: 'odd',
    rows: [
      '...........MM',
      '........MMNNNM',
      '.....MMNNNOONNM',
      '...MNNOOOOOOONNM',
      '..MNOOVVOOOOOONNM2',
      '.MNOOVUUVOOOOONNMM2',
      '.MNOVU77UVOOOONNMM2',
      'MNOOVU777UVOOOONNM22',
      'MNOOVUU7UUVOOOONNM22',
      'MNOOOVUUUVOOOOONNM22',
    ],
  },

  // ---------- enemy bullets ----------
  { name: 'eb-pellet0', rows: ['.KK.', 'KLLK', 'KLLK', '.KK.'] },
  { name: 'eb-pellet1', rows: ['.LL.', 'L77L', 'L77L', '.LL.'] },
  { name: 'eb-shard', rows: ['77LLK..', '777LLKJ', '77LLK..'] },
  {
    name: 'eb-orb',
    rows: ['..NN..', '.NOON.', 'NOOSON', 'NOSSON', '.NOON.', '..NN..'],
  },

  // ---------- HUD icons ----------
  { name: 'icon-life', mirrorY: 'odd', rows: ['..2444443', 'F39AABBA97'] },
  {
    name: 'icon-bomb',
    rows: ['....G', '...G.', '..33.', '.3443', '34554', '34443', '.333.'],
  },

  // ---------- BOSS 3: fortress wall + parts ----------
  {
    name: 'wall-tile',
    rows: [
      '32222222222222222222222222222223',
      '23333333333333333333333333333332',
      '23444444444444444444444444444432',
      '23455555555555555555555555555432',
      '23454444444444444444444444445432',
      '23454333333333333333333333345432',
      '23454334444444444444444443345432',
      '23454334555555555555555543345432',
      '23454334555KKKKKKKKKKK5543345432',
      '23454334555KJJJJJJJJJK5543345432',
      '23454334555KKKKKKKKKKK5543345432',
      '23454334555555555555555543345432',
      '23454334444444444444444443345432',
      '23454333333333333333333333345432',
      '23454444444444444444444444445432',
      '23455555555555555555555555555432',
      '23455555555555555555555555555432',
      '23454444444444444444444444445432',
      '23454333333333333333333333345432',
      '23454334444444444444444443345432',
      '23454334555555555555555543345432',
      '23454334555888888888885543345432',
      '23454334555899999999985543345432',
      '23454334555888888888885543345432',
      '23454334555555555555555543345432',
      '23454334444444444444444443345432',
      '23454333333333333333333333345432',
      '23454444444444444444444444445432',
      '23455555555555555555555555555432',
      '23444444444444444444444444444432',
      '23333333333333333333333333333332',
      '32222222222222222222222222222223',
    ],
  },
  {
    name: 'wall-gun',
    mirrorY: 'odd',
    rows: [
      '......334444',
      '...3344555544',
      '.334455666655',
      '5566667777665544',
    ],
  },
  {
    name: 'boss-core',
    mirrorY: 'even',
    mirrorX: 'even',
    rows: [
      '.........2333',
      '......233444',
      '....23445555',
      '...2344555K',
      '..234455KKJ',
      '..23455KJJJ',
      '.23445KJJII',
      '.2345KKJIII',
      '.2345KJJIII',
      '2344KKJIIII',
      '2345KJJIIII',
      '2345KJIIIII',
      '2345KJIIIII',
      '2345KJIIIII',
    ],
  },
  {
    name: 'boss-core-open',
    mirrorY: 'even',
    mirrorX: 'even',
    rows: [
      '.........2333',
      '......233444',
      '....23445555',
      '...2344555K',
      '..234455KLL',
      '..23455KL77',
      '.23445KL777',
      '.2345KKL777',
      '.2345KL7777',
      '2344KKL77HH',
      '2345KL77HHH',
      '2345KL7HHHH',
      '2345KL7HHHH',
      '2345KL7HHHH',
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Recipe-built large sprites                                          */
/*  All are authored as the TOP HALF (mirrorY 'even'); pixel rows use   */
/*  dy = distance below the eventual centreline so cores mirror whole.  */
/* ------------------------------------------------------------------ */

function buildHalf(
  name: string,
  w: number,
  halfH: number,
  fn: (x: number, dy: number, y: number) => string | null,
): PixmapDef {
  const rows: string[] = [];
  for (let y = 0; y < halfH; y++) {
    const dy = halfH - 1 - y + 0.5; // distance from centreline
    let row = '';
    for (let x = 0; x < w; x++) row += fn(x, dy, y) ?? '.';
    rows.push(row);
  }
  return { name, rows, mirrorY: 'even' };
}

/** disc test: returns distance from (cx, centreline) or -1 */
function disc(x: number, dy: number, cx: number, r: number): number {
  const dx = x - cx;
  const d = Math.sqrt(dx * dx + dy * dy);
  return d <= r ? d : -1;
}

/** Mini-boss 1 — DRILL CARRIER: white drill cone, banded hull, engine. */
function buildDrill(): PixmapDef {
  return buildHalf('mb-drill', 46, 12, (x, dy) => {
    if (x >= 43 && dy < 2.4) return x === 43 ? 'G' : x === 44 ? 'F' : 'E';
    if (x >= 39 && x <= 42 && dy < 4.5) return dy > 3.4 ? '1' : '2';
    // drill cone (tip at x=0)
    if (x <= 14) {
      const lim = x * 0.62 + 0.6;
      if (dy > lim) return null;
      if (dy > lim - 1) return '4';
      if ((x - Math.floor(dy)) % 5 === 0) return '4'; // spiral groove
      return dy < 1.4 ? '7' : dy < 3.2 ? '6' : '5';
    }
    // hull body
    if (x >= 15 && x <= 38) {
      const half = x < 33 ? 9.5 : 9.5 - (x - 33) * 0.9;
      if (dy > half) return null;
      if (dy > half - 1.1) return '2';
      if (x % 8 === 1) return '3'; // plating seam
      if (dy < 1.4 && x >= 19 && x <= 26) return 'B'; // canopy strip
      if (dy > 7) return '3';
      if (dy > 5) return '4';
      if (dy > 2.5) return '5';
      return '6';
    }
    return null;
  });
}

/** Mini-boss 2 — SPORE BULB: membraned green sac with a cat-eye core. */
function buildSpore(): PixmapDef {
  const w = 30;
  const cx = (w - 1) / 2;
  return buildHalf('mb-spore', w, 14, (x, dy) => {
    const dx = x - cx;
    const ang = Math.atan2(dy, dx);
    const edge =
      13.6 * (1 + 0.05 * Math.sin(5 * ang) + 0.03 * Math.sin(9 * ang + 2));
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > edge) return null;
    const e = disc(x, dy, 9, 6.4);
    if (e >= 0) {
      if (e > 5.2) return 'K';
      if (Math.abs(x - 9) <= 1) return '1';
      if (e > 3.2) return 'L';
      return '7';
    }
    const rr = d / edge;
    if (rr > 0.92) return 'P';
    if (rr > 0.76) return 'Q';
    if (rr > 0.5) return 'R';
    return 'S';
  });
}

/** Mini-boss 3 — TWIN SENTRY: one turret, mirrored to a stacked pair. */
function buildSentry(): PixmapDef {
  return buildHalf('mb-sentry', 24, 18, (x, _dy, y) => {
    // barrel (upper-middle so the mirror yields two distinct guns)
    if (y >= 5 && y <= 7 && x <= 7) {
      if (y !== 6) return '3';
      return x < 2 ? '6' : x < 5 ? '5' : '4';
    }
    // turret head block
    if (x >= 7 && x <= 21 && y >= 1 && y <= 9) {
      if (x === 7 || x === 21 || y === 1 || y === 9) return '2';
      if (x >= 17 && x <= 18 && y === 5) return 'K'; // sensor
      if (y <= 3) return '3';
      if (y <= 6) return '5';
      return '4';
    }
    // neck
    if (x >= 11 && x <= 17 && y >= 10 && y <= 12) {
      return x === 11 || x === 17 ? '2' : '3';
    }
    // spine base (joins across centreline)
    if (x >= 9 && x <= 21 && y >= 13) {
      if (x === 9 || x === 21 || y === 13) return '2';
      if (y >= 16 && x >= 10 && x <= 20) return (x >> 1) % 2 === 0 ? 'U' : '1';
      return '3';
    }
    return null;
  });
}

/** Boss 1 — CORE CRUSHER: armoured wedge, crimson jaw teeth, eye core. */
function buildCrusher(): PixmapDef {
  return buildHalf('boss-crusher', 68, 24, (x, dy, y) => {
    // jaw teeth in front of the face plate
    if (x < 6 && dy < 12) {
      const tooth = Math.floor(dy / 4) % 2 === 0;
      if (x >= 3 + (tooth ? 0 : 2)) return tooth ? 'K' : 'J';
      return null;
    }
    if (x >= 64 && dy < 3) return x % 2 ? 'F' : 'G'; // flame ticks
    const topEdge = Math.max(0, Math.round((x - 6) * 0.33));
    if (x > 63 || y < topEdge) return null;
    if (x >= 58 && dy < 6) return dy > 4.6 ? '1' : '2'; // engine block
    const e = disc(x, dy, 17, 9);
    if (e >= 0) {
      if (e > 7.4) return 'K';
      if (e > 6.2) return 'J';
      if (e > 3.4) return 'L';
      if (e > 1.6) return '7';
      return 'H';
    }
    if (disc(x, dy, 17, 11) >= 0) return '2'; // socket ring
    if (x % 12 === 2 || x % 12 === 3) {
      if (y - topEdge > 0) return '3'; // plating seams
    }
    const d = y - topEdge;
    if (d === 0) return '2';
    if (d <= 2) return '3';
    if (d <= 5) return '4';
    if (d <= 9) return '5';
    if (dy < 2 && x > 28 && x < 56) return '7';
    return '6';
  });
}

/** Boss 2 — HIVE QUEEN: lumpy bio sac, banded flesh, slit-pupil eye. */
function buildQueen(): PixmapDef {
  const w = 64;
  const cx = 33;
  return buildHalf('boss-queen', w, 26, (x, dy) => {
    const dx = (x - cx) / 1.22; // squash to an ellipse
    const ang = Math.atan2(dy, dx);
    const edge =
      24.5 * (1 + 0.06 * Math.sin(5 * ang + 1) + 0.04 * Math.sin(9 * ang));
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > edge) return null;
    const e = disc(x, dy, 13, 9.5);
    if (e >= 0) {
      if (e > 8) return 'K';
      if (Math.abs(x - 13) <= 1.2) return '1';
      if (e > 5) return 'L';
      return '7';
    }
    const rr = d / edge;
    if (rr > 0.93) return 'P';
    if (rr > 0.78) return 'Q';
    if (rr > 0.52) {
      if ((x * 7 + Math.floor(dy) * 13) % 17 === 0) return 'Q'; // veins
      return 'R';
    }
    if ((x * 5 + Math.floor(dy) * 11) % 23 === 0) return 'R';
    return 'S';
  });
}

/* ------------------------------------------------------------------ */
/*  Procedural pixmaps (explosions, asteroids, smoke, spark)            */
/* ------------------------------------------------------------------ */

/** deterministic hash -> 0..1 */
function hash(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h >>> 0) / 4294967295;
}

function blankGrid(w: number, h: number): string[][] {
  const g: string[][] = [];
  for (let y = 0; y < h; y++) g.push(new Array(w).fill('.'));
  return g;
}

function gridToRows(g: string[][]): string[] {
  return g.map((r) => r.join(''));
}

/** 6-frame, 16x16 arcade explosion in the fire ramp. */
function explosionFrames(): PixmapDef[] {
  const size = 16;
  const c = (size - 1) / 2;
  const frames: PixmapDef[] = [];
  const spec: Array<[number, number, string[]]> = [
    [2.6, 0, ['G', 'H', 'H']],
    [4.4, 0, ['F', 'G', 'H']],
    [6.2, 0, ['E', 'F', 'G', 'H']],
    [7.4, 2.6, ['D', 'E', 'F', 'G']],
    [7.9, 4.6, ['2', 'D', 'E', 'F']],
    [7.9, 6.2, ['1', '2', 'D']],
  ];
  for (let f = 0; f < spec.length; f++) {
    const [r, hollow, ramp] = spec[f];
    const g = blankGrid(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - c;
        const dy = y - c;
        const wobble = (hash(x, y, f) - 0.5) * 1.8;
        const d = Math.sqrt(dx * dx + dy * dy) + wobble;
        if (d > r || d < hollow) continue;
        if (d > r - 1.2 && hash(x + 7, y + 3, f) < 0.35) continue;
        const t = 1 - (d - hollow) / Math.max(0.001, r - hollow);
        const idx = Math.min(ramp.length - 1, Math.floor(t * ramp.length));
        g[y][x] = ramp[idx];
      }
    }
    frames.push({ name: `explo${f}`, rows: gridToRows(g) });
  }
  return frames;
}

/** lumpy shaded asteroid */
function asteroid(name: string, size: number, seed: number): PixmapDef {
  const g = blankGrid(size, size);
  const c = (size - 1) / 2;
  const r = c - 0.5;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - c;
      const dy = y - c;
      const a = Math.atan2(dy, dx);
      const edge =
        r *
        (0.82 +
          0.13 * Math.sin(3 * a + seed) +
          0.09 * Math.sin(7 * a + seed * 1.7));
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > edge) continue;
      const lit = (-dx - dy) / (r * 1.6);
      let ch = '3';
      if (d > edge - 1.2) ch = '2';
      else if (lit > 0.45) ch = '5';
      else if (lit > 0.1) ch = '4';
      else if (lit < -0.4) ch = '2';
      if (hash(Math.floor(x / 3), Math.floor(y / 3), seed) < 0.12 && d < edge - 2)
        ch = '2';
      g[y][x] = ch;
    }
  }
  return { name, rows: gridToRows(g) };
}

function smoke(name: string, size: number, seed: number, ch: string): PixmapDef {
  const g = blankGrid(size, size);
  const c = (size - 1) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - c;
      const dy = y - c;
      const d = Math.sqrt(dx * dx + dy * dy) + (hash(x, y, seed) - 0.5) * 1.6;
      if (d < c - 0.4) g[y][x] = ch;
    }
  }
  return { name, rows: gridToRows(g) };
}

/* ------------------------------------------------------------------ */
/*  Power-up chips — gold frame, glyph baked from the pixel font        */
/* ------------------------------------------------------------------ */

const CHIP_LETTERS = ['U', 'S', 'P', 'H', 'B', 'L', 'E', '1', 'X', '*'] as const;

function chipDefs(): PixmapDef[] {
  const base = [
    '.UUUUUUUUUU.',
    'UVVVVVVVVVTU',
    'UV88888888TU',
    'UV88888888TU',
    'UV88888888TU',
    'UV88888888TU',
    'UV88888888TU',
    'UV88888888TU',
    'UV88888888TU',
    'UV88888888TU',
    'UTTTTTTTTTTU',
    '.UUUUUUUUUU.',
  ];
  const out: PixmapDef[] = [];
  for (const letter of CHIP_LETTERS) {
    const grid = base.map((r) => r.split(''));
    const ox = Math.floor((12 - FONT_W) / 2);
    const oy = Math.floor((12 - FONT_H) / 2);
    const ink =
      letter === 'E' ? 'B' : letter === '1' ? 'G' : letter === 'X' ? 'L' : '7';
    eachGlyphPixel(letter, (x, y) => {
      grid[oy + y][ox + x] = ink;
    });
    const safe = letter === '*' ? 'I' : letter; // '*' is the invuln star chip
    out.push({ name: `chip-${safe}`, rows: grid.map((r) => r.join('')) });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Resolver                                                            */
/* ------------------------------------------------------------------ */

function mirrorRowsY(rows: string[], mode: 'even' | 'odd'): string[] {
  const top = rows.slice();
  const bottom = (mode === 'even' ? rows.slice() : rows.slice(0, -1)).reverse();
  return top.concat(bottom);
}

function mirrorRowX(row: string, w: number, mode: 'even' | 'odd'): string {
  const padded = row.padEnd(w, '.');
  const right = (mode === 'even' ? padded : padded.slice(0, -1))
    .split('')
    .reverse()
    .join('');
  return padded + right;
}

export function resolvePixmaps(): ResolvedPixmap[] {
  const defs: PixmapDef[] = [
    ...DEFS,
    buildDrill(),
    buildSpore(),
    buildSentry(),
    buildCrusher(),
    buildQueen(),
    ...chipDefs(),
    ...explosionFrames(),
    asteroid('ast-big', 26, 4),
    asteroid('ast-med', 16, 9),
    asteroid('ast-small', 10, 13),
    smoke('smoke0', 7, 2, '3'),
    smoke('smoke1', 5, 5, '2'),
    { name: 'spark', rows: ['.H.', 'HVH', '.H.'] },
    { name: 'pixel', rows: ['7'] },
  ];
  const out: ResolvedPixmap[] = [];
  for (const def of defs) {
    let rows = def.rows.slice();
    let w = Math.max(...rows.map((r) => r.length));
    if (def.mirrorX) {
      rows = rows.map((r) => mirrorRowX(r, w, def.mirrorX!));
      w = def.mirrorX === 'even' ? w * 2 : w * 2 - 1;
    }
    if (def.mirrorY) rows = mirrorRowsY(rows, def.mirrorY);
    rows = rows.map((r) => r.padEnd(w, '.'));
    out.push({ name: def.name, w, h: rows.length, rows });
  }
  return out;
}
