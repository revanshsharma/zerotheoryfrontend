import { z } from 'zod';
import { PixelBuffer, shade, mix, mulberry32 } from './pixel';
import type { Art, AvatarPart, AvatarSlot, Registry, Swatch } from './content';

export type AvatarRegistry = Registry['avatar'];

export const NONE = 'none';

export const AvatarConfigSchema = z.object({
  body: z.string().max(48),
  skin: z.string().max(48),
  hair: z.string().max(48),
  hairColor: z.string().max(48),
  hat: z.string().max(48),
  hatColor: z.string().max(48),
  face: z.string().max(48),
  neck: z.string().max(48),
  neckColor: z.string().max(48),
  top: z.string().max(48),
  topColor: z.string().max(48),
  bottom: z.string().max(48),
  bottomColor: z.string().max(48),
  shoes: z.string().max(48),
  shoesColor: z.string().max(48),
});
export type AvatarConfig = z.infer<typeof AvatarConfigSchema>;

export const DIRECTIONS = ['down', 'up', 'left', 'right'] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const SPRITE_W = 16;
export const SPRITE_H = 28;
/** Frames include a 1px outline on every side. */
export const FRAME_W = SPRITE_W + 2;
export const FRAME_H = SPRITE_H + 2;
export const FRAME_NAMES = ['idle0', 'idle1', 'walk0', 'walk1', 'walk2', 'walk3'] as const;
export type FrameName = (typeof FRAME_NAMES)[number];

const OPTIONAL_SLOTS: AvatarSlot[] = ['hair', 'hat', 'face', 'neck'];

export function partsFor(reg: AvatarRegistry, slot: AvatarSlot): AvatarPart[] {
  return reg.parts.filter((p) => p.slot === slot);
}

function pick<T extends { id: string }>(list: T[], id: string, fallback?: string): T | undefined {
  return list.find((x) => x.id === id) ?? list.find((x) => x.id === fallback) ?? list[0];
}

/** Returns a config in which every field is a real id from the registry. Unknown ids are replaced, never trusted. */
export function sanitizeAvatar(input: unknown, reg: AvatarRegistry): AvatarConfig {
  const raw = (typeof input === 'object' && input ? input : {}) as Record<string, unknown>;
  const str = (k: string) => (typeof raw[k] === 'string' ? (raw[k] as string) : '');
  const swatch = (k: string, list: Swatch[]) => pick(list, str(k))?.id ?? '';
  const part = (slot: AvatarSlot, k: string) => {
    const v = str(k);
    const list = partsFor(reg, slot);
    if (OPTIONAL_SLOTS.includes(slot) && (v === NONE || v === '')) return NONE;
    return pick(list, v)?.id ?? (OPTIONAL_SLOTS.includes(slot) ? NONE : '');
  };
  return {
    body: pick(reg.bodies, str('body'), 'regular')?.id ?? '',
    skin: swatch('skin', reg.skins),
    hair: part('hair', 'hair'),
    hairColor: swatch('hairColor', reg.hairColors),
    hat: part('hat', 'hat'),
    hatColor: swatch('hatColor', reg.clothColors),
    face: part('face', 'face'),
    neck: part('neck', 'neck'),
    neckColor: swatch('neckColor', reg.clothColors),
    top: part('top', 'top'),
    topColor: swatch('topColor', reg.clothColors),
    bottom: part('bottom', 'bottom'),
    bottomColor: swatch('bottomColor', reg.clothColors),
    shoes: part('shoes', 'shoes'),
    shoesColor: swatch('shoesColor', reg.clothColors),
  };
}

export function randomAvatar(reg: AvatarRegistry, seed = Date.now()): AvatarConfig {
  const r = mulberry32(seed);
  const one = <T,>(l: T[]): T => l[Math.floor(r() * l.length)];
  const opt = (slot: AvatarSlot) => (r() < 0.45 && slot !== 'hair' ? NONE : one(partsFor(reg, slot)).id);
  return sanitizeAvatar(
    {
      body: one(reg.bodies).id,
      skin: one(reg.skins).id,
      hair: opt('hair'),
      hairColor: one(reg.hairColors).id,
      hat: r() < 0.7 ? NONE : one(partsFor(reg, 'hat')).id,
      hatColor: one(reg.clothColors).id,
      face: opt('face'),
      neck: r() < 0.7 ? NONE : one(partsFor(reg, 'neck')).id,
      neckColor: one(reg.clothColors).id,
      top: one(partsFor(reg, 'top')).id,
      topColor: one(reg.clothColors).id,
      bottom: one(partsFor(reg, 'bottom')).id,
      bottomColor: one(reg.clothColors).id,
      shoes: one(partsFor(reg, 'shoes')).id,
      shoesColor: one(reg.clothColors).id,
    },
    reg,
  );
}

// ---------------------------------------------------------------- rendering

type Palette = Record<string, string>;
const FIXED: Palette = {
  K: '#2a1d1a', W: '#faf6ec', A: '#f3e6c8', a: '#c9b894', B: '#e07a5f', O: '#e8955a', G: '#2f6b47', N: '#9dff6a',
  Y: '#e8c15a', R: '#b5483a', P: '#e8a0b0', D: '#5a3a2a', L: '#8e7cc3', U: '#4a78a0',
};

function swatchColors(list: Swatch[], id: string): { main: string; shade: string } {
  const s = pick(list, id);
  const main = s?.main ?? '#888888';
  return { main, shade: s?.shade ?? shade(main, -0.18) };
}

function resolver(base: Palette, main: string, sh: string, extra?: Record<string, string>) {
  const pal: Palette = { ...FIXED, ...base, C: main, c: sh, ...extra };
  return (t: string): string => (t.startsWith('#') ? t : (pal[t] ?? '#ff00ff'));
}

function drawArt(buf: PixelBuffer, art: Art | undefined, ox: number, oy: number, res: (t: string) => string): void {
  if (!art) return;
  const [ax, ay] = art.at ?? [0, 0];
  for (const [x, y, w, h, c] of art.rects ?? []) buf.rect(ox + ax + x, oy + ay + y, w, h, res(c));
  (art.rows ?? []).forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '.' || ch === ' ') continue;
      buf.set(ox + ax + i, oy + ay + j, art.palette?.[ch] ?? res(ch));
    }
  });
}

type View = 'down' | 'up' | 'side';

interface FramePose {
  bob: number;
  /** -1 left leg lifted, 1 right leg lifted, 0 flat (down/up views); for side view: stride -1..1 */
  stride: number;
  armSwing: number;
}

const POSES: Record<FrameName, FramePose> = {
  idle0: { bob: 0, stride: 0, armSwing: 0 },
  idle1: { bob: 1, stride: 0, armSwing: 0 },
  walk0: { bob: 1, stride: -1, armSwing: -1 },
  walk1: { bob: 0, stride: 0, armSwing: 0 },
  walk2: { bob: 1, stride: 1, armSwing: 1 },
  walk3: { bob: 0, stride: 0, armSwing: 0 },
};

function renderView(cfg: AvatarConfig, reg: AvatarRegistry, view: View, pose: FramePose): PixelBuffer {
  const buf = new PixelBuffer(SPRITE_W, SPRITE_H);
  const body = pick(reg.bodies, cfg.body, 'regular');
  const L = body?.legLength ?? 6;
  const T = body?.torsoWidth ?? 8;
  const skin = swatchColors(reg.skins, cfg.skin);
  const hairC = swatchColors(reg.hairColors, cfg.hairColor);
  const topC = swatchColors(reg.clothColors, cfg.topColor);
  const botC = swatchColors(reg.clothColors, cfg.bottomColor);
  const shoeC = swatchColors(reg.clothColors, cfg.shoesColor);
  const hatC = swatchColors(reg.clothColors, cfg.hatColor);
  const neckC = swatchColors(reg.clothColors, cfg.neckColor);
  const base: Palette = { S: skin.main, s: skin.shade, H: hairC.main, h: hairC.shade };

  const legsTop = SPRITE_H - L;
  const torsoTop = legsTop - 7 + pose.bob;
  const headTop = torsoTop - 9;
  const originHead = headTop - 4;
  const torsoX = view === 'side' ? 5 : Math.floor((SPRITE_W - T) / 2);
  const torsoW = view === 'side' ? Math.max(6, T - 2) : T;

  const top = partOf(reg, cfg.top);
  const bottom = partOf(reg, cfg.bottom);
  const shoes = partOf(reg, cfg.shoes);

  const bottomRes = resolver(base, botC.main, botC.shade);
  const shoeRes = resolver(base, shoeC.main, shoeC.shade);
  const topRes = resolver(base, topC.main, topC.shade);

  // legs
  const coverage = bottom?.coverage ?? 1;
  const shoeH = shoes?.height ?? 2;
  const drawLeg = (x: number, w: number, lift: number) => {
    const len = L - lift;
    for (let j = 0; j < len; j++) {
      const y = legsTop + j;
      const fromBottom = L - lift - j;
      let col: string;
      if (fromBottom <= shoeH && shoes && shoes.id !== 'barefoot') col = shoeRes(j === len - 1 && shoes.sole ? shoes.sole : 'C');
      else col = j < Math.round(L * coverage) ? bottomRes('C') : skin.main;
      buf.rect(x, y, w, 1, col);
    }
    if (len > 1) buf.rect(x + w - 1, legsTop, 1, Math.max(0, len - shoeH), j2(bottomRes, skin, coverage, L));
  };
  if (view === 'side') {
    if (pose.stride === 0) {
      drawLeg(6, 4, 0);
    } else {
      const a = pose.stride === -1 ? 4 : 9;
      const b = pose.stride === -1 ? 9 : 4;
      drawLeg(b, 3, 1);
      drawLeg(a, 3, 0);
    }
  } else {
    drawLeg(4, 3, pose.stride === -1 ? 1 : 0);
    drawLeg(9, 3, pose.stride === 1 ? 1 : 0);
  }

  // arms (behind the torso in side view is the far arm; near arm drawn after torso)
  const sleeves = top?.sleeves ?? 'short';
  const armLen = 6;
  const drawArm = (x: number, y: number, w: number) => {
    for (let j = 0; j < armLen; j++) {
      const covered = sleeves === 'long' ? j < armLen - 1 : sleeves === 'short' ? j < 2 : false;
      buf.rect(x, y + j, w, 1, covered ? topC.main : skin.main);
    }
    if (sleeves !== 'none') buf.rect(x, y + (sleeves === 'long' ? armLen - 2 : 1), w, 1, topC.shade);
  };
  if (view !== 'side') {
    drawArm(torsoX - 2, torsoTop + 1 + (pose.armSwing === -1 ? 1 : pose.armSwing === 1 ? -1 : 0), 2);
    drawArm(torsoX + torsoW, torsoTop + 1 + (pose.armSwing === 1 ? 1 : pose.armSwing === -1 ? -1 : 0), 2);
  }

  // torso
  buf.rect(torsoX, torsoTop, torsoW, 7, topC.main);
  buf.rect(torsoX, torsoTop + 6, torsoW, 1, topC.shade);
  buf.rect(torsoX, torsoTop, 1, 6, topC.shade);
  drawArt(buf, top?.views?.[view], 0, torsoTop, topRes);

  if (view === 'side') {
    const swingX = 7 + pose.armSwing * 2;
    drawArm(swingX, torsoTop + 1, 2);
  }

  // bottom flare (skirt)
  if (bottom?.flare) {
    buf.rect(torsoX - 1, torsoTop + 6, torsoW + 2, 3, botC.main);
    buf.rect(torsoX - 1, torsoTop + 8, torsoW + 2, 1, botC.shade);
  }

  // head
  const hx = 3;
  const headRows: [number, number][] = [[1, 8], [0, 10], [0, 10], [0, 10], [0, 10], [0, 10], [0, 10], [0, 10], [1, 8]];
  headRows.forEach(([off, w], j) => buf.rect(hx + off, headTop + j, w, 1, j === 8 ? skin.shade : skin.main));
  if (view === 'down') {
    buf.rect(5, headTop + 5, 1, 2, FIXED.K);
    buf.rect(10, headTop + 5, 1, 2, FIXED.K);
    const blush = mix(skin.main, FIXED.B, 0.55);
    buf.set(4, headTop + 7, blush);
    buf.set(11, headTop + 7, blush);
  } else if (view === 'side') {
    buf.set(2, headTop + 5, skin.main);
    buf.set(2, headTop + 6, skin.shade);
    buf.rect(4, headTop + 5, 1, 2, FIXED.K);
    buf.set(5, headTop + 7, mix(skin.main, FIXED.B, 0.55));
  }

  // neck, hair, face, hat
  const neck = partOf(reg, cfg.neck);
  if (neck) drawArt(buf, neck.views?.[view], 0, originHead, resolver(base, neckC.main, neckC.shade));
  const hat = partOf(reg, cfg.hat);
  const hair = partOf(reg, cfg.hair);
  if (hair && !(hat?.hidesHair)) drawArt(buf, hair.views?.[view], 0, originHead, resolver(base, hairC.main, hairC.shade));
  const face = partOf(reg, cfg.face);
  if (face && view !== 'up') drawArt(buf, face.views?.[view], 0, originHead, resolver(base, '#2a1d1a', '#000000'));
  if (hat) drawArt(buf, hat.views?.[view], 0, originHead, resolver(base, hatC.main, hatC.shade));
  return buf;
}

function j2(res: (t: string) => string, skin: { main: string }, coverage: number, L: number): string {
  // dark inner-edge of the leg: shaded cloth when covered, shaded skin otherwise
  return coverage > 0.5 ? shade(res('C'), -0.14) : shade(skin.main, -0.14);
}

function partOf(reg: AvatarRegistry, id: string): AvatarPart | undefined {
  if (!id || id === NONE) return undefined;
  return reg.parts.find((p) => p.id === id);
}

export type AvatarFrames = Record<`${Direction}-${FrameName}`, PixelBuffer>;

/** Renders all 24 frames (4 directions x 6 poses) of an avatar, each with a dark outline. */
export function renderAvatarFrames(input: unknown, reg: AvatarRegistry): AvatarFrames {
  const cfg = sanitizeAvatar(input, reg);
  const out = {} as AvatarFrames;
  for (const name of FRAME_NAMES) {
    const pose = POSES[name];
    const down = renderView(cfg, reg, 'down', pose).outlined('#2a1d1a');
    const up = renderView(cfg, reg, 'up', pose).outlined('#2a1d1a');
    const left = renderView(cfg, reg, 'side', pose).outlined('#2a1d1a');
    out[`down-${name}`] = down;
    out[`up-${name}`] = up;
    out[`left-${name}`] = left;
    out[`right-${name}`] = left.flippedX();
  }
  return out;
}

/** Packs all frames into one horizontal-grid sheet: columns = FRAME_NAMES, rows = DIRECTIONS. */
export function renderAvatarSheet(input: unknown, reg: AvatarRegistry): PixelBuffer {
  const frames = renderAvatarFrames(input, reg);
  const sheet = new PixelBuffer(FRAME_W * FRAME_NAMES.length, FRAME_H * DIRECTIONS.length);
  DIRECTIONS.forEach((d, r) => FRAME_NAMES.forEach((n, c) => sheet.blit(frames[`${d}-${n}`], c * FRAME_W, r * FRAME_H)));
  return sheet;
}
