import { PixelBuffer, TILE, renderFurniture, renderTile, type MapDef, type Registry } from '@channel-green/shared';

export function bufToCanvas(buf: PixelBuffer, scale = 1): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = buf.w * scale;
  c.height = buf.h * scale;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  if (scale === 1) {
    ctx.putImageData(new ImageData(new Uint8ClampedArray(buf.data), buf.w, buf.h), 0, 0);
  } else {
    const tmp = bufToCanvas(buf, 1);
    ctx.drawImage(tmp, 0, 0, c.width, c.height);
  }
  return c;
}

const tileCache = new Map<string, HTMLCanvasElement>();
export function tileCanvas(reg: Registry, id: string, variant: number): HTMLCanvasElement | null {
  const key = `${id}:${variant}`;
  let c = tileCache.get(key);
  if (!c) {
    const def = reg.tiles[id];
    if (!def) return null;
    c = bufToCanvas(renderTile(def, variant));
    tileCache.set(key, c);
  }
  return c;
}

const furnCache = new Map<string, HTMLCanvasElement>();
export function furnitureCanvas(reg: Registry, id: string): HTMLCanvasElement | null {
  let c = furnCache.get(id);
  if (!c) {
    const def = reg.furniture[id];
    if (!def) return null;
    c = bufToCanvas(renderFurniture(def));
    furnCache.set(id, c);
  }
  return c;
}

/** Paints the ground of a map (tiles only) onto a canvas, 1 pixel per art pixel. */
export function renderGround(map: MapDef, reg: Registry): HTMLCanvasElement {
  const rows = map.tiles.rows;
  const cols = Math.max(...rows.map((r) => r.length));
  const c = document.createElement('canvas');
  c.width = cols * TILE;
  c.height = rows.length * TILE;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = map.background ?? '#0b1f15';
  ctx.fillRect(0, 0, c.width, c.height);
  rows.forEach((row, y) => {
    for (let x = 0; x < cols; x++) {
      const id = map.tiles.legend[row[x] ?? ''];
      if (!id) continue;
      const t = tileCanvas(reg, id, (x * 7 + y * 13 + ((x * y) % 5)) % 3);
      if (t) ctx.drawImage(t, x * TILE, y * TILE);
    }
  });
  return c;
}

/** Ground plus all furniture sorted back-to-front; a still picture of a room (thumbnails, landing page). */
export function renderMapPicture(map: MapDef, reg: Registry): HTMLCanvasElement {
  const c = renderGround(map, reg);
  const ctx = c.getContext('2d')!;
  const items = map.objects
    .map((o) => ({ o, f: reg.furniture[o.furniture] }))
    .filter((x) => x.f)
    .sort((a, b) => (a.f.flat ? -1 : 0) - (b.f.flat ? -1 : 0) || a.o.at[1] + a.f.size[1] + (a.o.depth ?? 0) - (b.o.at[1] + b.f.size[1] + (b.o.depth ?? 0)));
  for (const { o } of items) {
    const fc = furnitureCanvas(reg, o.furniture);
    if (fc) ctx.drawImage(fc, o.at[0], o.at[1]);
  }
  if (map.tint) {
    ctx.globalAlpha = map.tint.alpha;
    ctx.fillStyle = map.tint.color;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.globalAlpha = 1;
  }
  return c;
}
