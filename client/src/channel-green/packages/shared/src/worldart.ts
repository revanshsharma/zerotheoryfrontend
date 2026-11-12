import { PixelBuffer, hashString, mulberry32, shade, mix } from './pixel';
import type { Art, FurnitureDef, TileDef } from './content';

export const TILE = 16;

function resolveTok(t: string): string {
  const fixed: Record<string, string> = {
    K: '#2a1d1a', W: '#faf6ec', A: '#f3e6c8', a: '#c9b894', O: '#e8955a', G: '#2f6b47', N: '#9dff6a',
    Y: '#e8c15a', R: '#b5483a', P: '#e8a0b0', D: '#5a3a2a', L: '#8e7cc3', U: '#4a78a0', B: '#e07a5f',
  };
  return t.startsWith('#') ? t : (fixed[t] ?? '#ff00ff');
}

export function drawArtSimple(buf: PixelBuffer, art: Art | undefined): void {
  if (!art) return;
  const [ax, ay] = art.at ?? [0, 0];
  for (const [x, y, w, h, c] of art.rects ?? []) buf.rect(ax + x, ay + y, w, h, resolveTok(c));
  (art.rows ?? []).forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '.' || ch === ' ') continue;
      buf.set(ax + i, ay + j, art.palette?.[ch] ?? resolveTok(ch));
    }
  });
}

/** Draws a 16x16 tile. `variant` (0..2) breaks up repetition so big floors don't look stamped. */
export function renderTile(def: TileDef, variant = 0): PixelBuffer {
  const buf = new PixelBuffer(TILE, TILE);
  buf.rect(0, 0, TILE, TILE, def.base);
  if (def.art) {
    drawArtSimple(buf, def.art);
    return buf;
  }
  const rnd = mulberry32(hashString(def.id) + variant * 7919);
  const c = def.colors?.length ? def.colors : [shade(def.base, -0.12), shade(def.base, 0.1)];
  const dens = def.density ?? 0.12;
  const speck = (colors: string[], n: number) => {
    for (let i = 0; i < n; i++) buf.set(Math.floor(rnd() * TILE), Math.floor(rnd() * TILE), colors[Math.floor(rnd() * colors.length)]);
  };
  switch (def.pattern) {
    case 'speckle':
      speck(c, Math.round(TILE * TILE * dens));
      break;
    case 'grass':
      speck([c[0]], Math.round(TILE * TILE * dens));
      for (let i = 0; i < 6; i++) {
        const x = Math.floor(rnd() * 14) + 1;
        const y = Math.floor(rnd() * 12) + 3;
        const col = c[1 + Math.floor(rnd() * Math.max(1, c.length - 1))] ?? c[0];
        buf.set(x, y, col);
        buf.set(x, y - 1, col);
        if (rnd() < 0.5) buf.set(x + 1, y - 2, col);
      }
      break;
    case 'cobble': {
      for (let row = 0; row < 4; row++) {
        const off = row % 2 ? 4 : 0;
        for (let k = -1; k < 3; k++) {
          const x = off + k * 8;
          const y = row * 4;
          buf.rect(Math.max(0, x), y, Math.max(0, Math.min(16, x + 7) - Math.max(0, x)), 3, mix(def.base, c[1] ?? c[0], 0.35 + rnd() * 0.3));
          buf.rect(Math.max(0, x), y + 3, 8, 1, c[0]);
          if (x >= 0 && x < 16) buf.rect(x, y, 1, 4, c[0]);
        }
      }
      break;
    }
    case 'planks':
      for (let y = 0; y < TILE; y += 4) {
        buf.rect(0, y + 3, TILE, 1, c[0]);
        const jx = Math.floor(rnd() * 12) + 2;
        buf.rect(jx, y, 1, 3, c[0]);
        for (let i = 0; i < 3; i++) buf.set(Math.floor(rnd() * 16), y + Math.floor(rnd() * 3), c[1] ?? c[0]);
      }
      break;
    case 'brick':
      for (let row = 0; row < 4; row++) {
        buf.rect(0, row * 4 + 3, TILE, 1, c[0]);
        const off = row % 2 ? 4 : 0;
        buf.rect(off, row * 4, 1, 3, c[0]);
        buf.rect(off + 8, row * 4, 1, 3, c[0]);
        speck([c[1] ?? c[0]], 3);
      }
      break;
    case 'checker':
      for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) if ((x + y) % 2) buf.rect(x * 8, y * 8, 8, 8, c[0]);
      break;
    case 'tiles':
      buf.rect(0, 0, TILE, 1, c[0]);
      buf.rect(0, 0, 1, TILE, c[0]);
      buf.rect(8, 0, 1, TILE, c[1] ?? c[0]);
      buf.rect(0, 8, TILE, 1, c[1] ?? c[0]);
      speck([c[1] ?? c[0]], 4);
      break;
    case 'waves':
      for (let y = 2; y < TILE; y += 5) {
        const o = Math.floor(rnd() * 6);
        for (let x = 0; x < 6; x++) buf.set((o + x * 3) % TILE, y + (x % 2), c[1] ?? c[0]);
      }
      speck([c[0]], 8);
      break;
    case 'carpet':
      buf.rect(0, 0, TILE, 1, c[0]);
      buf.rect(0, TILE - 1, TILE, 1, c[0]);
      for (let y = 2; y < TILE; y += 3) for (let x = (y % 2) * 2; x < TILE; x += 4) buf.set(x, y, c[1] ?? c[0]);
      break;
    case 'soil':
      speck(c, Math.round(TILE * TILE * 0.18));
      for (let i = 0; i < 3; i++) buf.rect(Math.floor(rnd() * 12), 2 + i * 5, 4, 1, c[0]);
      break;
    case 'roof':
      for (let y = 0; y < TILE; y += 4) {
        buf.rect(0, y + 3, TILE, 1, c[0]);
        for (let x = (y / 4) % 2 ? 0 : 4; x < TILE; x += 8) buf.rect(x, y, 1, 3, c[0]);
      }
      speck([c[1] ?? c[0]], 5);
      break;
    case 'wallpaper':
      buf.rect(0, 14, TILE, 2, c[0]);
      for (let x = 0; x < TILE; x += 4) buf.rect(x, 0, 1, 14, c[1] ?? mix(def.base, '#000000', 0.06));
      speck([c[1] ?? c[0]], 3);
      break;
    default:
      break;
  }
  return buf;
}

export function renderFurniture(def: FurnitureDef): PixelBuffer {
  const buf = new PixelBuffer(def.size[0], def.size[1]);
  for (const [x, y, w, h, c] of def.parts ?? []) buf.rect(x, y, w, h, resolveTok(c));
  drawArtSimple(buf, def.art);
  return buf;
}
