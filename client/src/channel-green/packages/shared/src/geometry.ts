import type { MapDef, FurnitureDef, TileDef, PortalDef } from './content';
import { TILE } from './worldart';

export interface Rect { x: number; y: number; w: number; h: number }

/** Feet hitbox of a player, in pixels, relative to the player's position (their feet). */
export const PLAYER_BOX = { w: 8, h: 5 };
export const PLAYER_SPEED = 60; // pixels per second

export interface CollisionMap {
  id: string;
  width: number; // pixels
  height: number;
  cols: number;
  rows: number;
  solidTiles: boolean[]; // rows*cols
  solidRects: Rect[];
  portals: (PortalDef & { px: Rect })[];
  spawns: Record<string, [number, number]>; // pixel coords (feet)
}

export interface ContentLookup {
  tiles: Record<string, TileDef>;
  furniture: Record<string, FurnitureDef>;
}

export function buildCollisionMap(map: MapDef, reg: ContentLookup): CollisionMap {
  const rows = map.tiles.rows.length;
  const cols = Math.max(...map.tiles.rows.map((r) => r.length));
  const solidTiles: boolean[] = new Array(rows * cols).fill(true);
  map.tiles.rows.forEach((row, y) => {
    for (let x = 0; x < cols; x++) {
      const ch = row[x];
      const tileId = ch ? map.tiles.legend[ch] : undefined;
      const solid = tileId ? !!reg.tiles[tileId]?.solid : true;
      solidTiles[y * cols + x] = solid;
    }
  });
  const solidRects: Rect[] = [];
  for (const o of map.objects) {
    const f = reg.furniture[o.furniture];
    if (!f?.footprint) continue;
    solidRects.push({ x: o.at[0] + f.footprint[0], y: o.at[1] + f.footprint[1], w: f.footprint[2], h: f.footprint[3] });
  }
  return {
    id: map.id,
    width: cols * TILE,
    height: rows * TILE,
    cols,
    rows,
    solidTiles,
    solidRects,
    portals: map.portals.map((p) => ({ ...p, px: { x: p.rect[0] * TILE, y: p.rect[1] * TILE, w: p.rect[2] * TILE, h: p.rect[3] * TILE } })),
    spawns: Object.fromEntries(Object.entries(map.spawns).map(([k, v]) => [k, [v[0] * TILE + TILE / 2, v[1] * TILE + TILE - 1]])),
  };
}

export function feetBox(x: number, y: number): Rect {
  return { x: x - PLAYER_BOX.w / 2, y: y - PLAYER_BOX.h, w: PLAYER_BOX.w, h: PLAYER_BOX.h };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** True when a player standing with their feet at (x, y) is not inside a wall or furniture. */
export function canStand(map: CollisionMap, x: number, y: number): boolean {
  const b = feetBox(x, y);
  if (b.x < 0 || b.y < 0 || b.x + b.w > map.width || b.y + b.h > map.height) return false;
  const x0 = Math.floor(b.x / TILE);
  const x1 = Math.floor((b.x + b.w - 0.001) / TILE);
  const y0 = Math.floor(b.y / TILE);
  const y1 = Math.floor((b.y + b.h - 0.001) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (map.solidTiles[ty * map.cols + tx]) return false;
  for (const r of map.solidRects) if (rectsOverlap(b, r)) return false;
  return true;
}

/** Walks the straight segment in small steps; every step must be standable. */
export function pathClear(map: CollisionMap, x0: number, y0: number, x1: number, y1: number): boolean {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist / 3));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (!canStand(map, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
  }
  return true;
}

export function portalAt(map: CollisionMap, x: number, y: number): (PortalDef & { px: Rect }) | undefined {
  const b = feetBox(x, y);
  return map.portals.find((p) => rectsOverlap(b, p.px));
}

/** Breadth-first search over the tile grid; used by tests to prove that every spawn and portal is reachable. */
export function reachableTiles(map: CollisionMap, startX: number, startY: number): Set<number> {
  const seen = new Set<number>();
  const sx = Math.floor(startX / TILE);
  const sy = Math.floor(startY / TILE);
  const q: [number, number][] = [[sx, sy]];
  const stand = (tx: number, ty: number) => canStand(map, tx * TILE + TILE / 2, ty * TILE + TILE - 2);
  while (q.length) {
    const [x, y] = q.pop() as [number, number];
    const k = y * map.cols + x;
    if (x < 0 || y < 0 || x >= map.cols || y >= map.rows || seen.has(k) || !stand(x, y)) continue;
    seen.add(k);
    q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return seen;
}
