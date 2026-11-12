/**
 * A tiny DOM-free pixel buffer. Everything visual in Channel Green (avatars, tiles,
 * furniture) is drawn into one of these from plain data, so the same art renders in the
 * browser, in tests and in docs tooling, and contributors only ever edit JSON.
 */

export type RGBA = [number, number, number, number];

export function hexToRgba(hex: string): RGBA {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6 && h.length !== 8) return [255, 0, 255, 255];
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return [255, 0, 255, 255];
  if (h.length === 6) return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
  return [(n >> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbaToHex([r, g, b]: RGBA): string {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

/** Mix a colour toward black (amount < 0) or white (amount > 0). */
export function shade(hex: string, amount: number): string {
  const [r, g, b, a] = hexToRgba(hex);
  const t = amount < 0 ? 0 : 255;
  const k = Math.abs(amount);
  return rgbaToHex([r + (t - r) * k, g + (t - g) * k, b + (t - b) * k, a]);
}

export function mix(a: string, b: string, t: number): string {
  const x = hexToRgba(a);
  const y = hexToRgba(b);
  return rgbaToHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t, 255]);
}

/** Deterministic PRNG so generated art is identical on every machine. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class PixelBuffer {
  readonly data: Uint8ClampedArray;
  constructor(readonly w: number, readonly h: number) {
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x: number, y: number): RGBA {
    if (!this.inside(x, y)) return [0, 0, 0, 0];
    const i = (y * this.w + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  set(x: number, y: number, c: RGBA | string): void {
    if (!this.inside(x, y)) return;
    const [r, g, b, a] = typeof c === 'string' ? hexToRgba(c) : c;
    const i = (y * this.w + x) * 4;
    this.data[i] = r;
    this.data[i + 1] = g;
    this.data[i + 2] = b;
    this.data[i + 3] = a;
  }

  rect(x: number, y: number, w: number, h: number, c: RGBA | string): void {
    const col = typeof c === 'string' ? hexToRgba(c) : c;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, col);
  }

  alphaAt(x: number, y: number): number {
    return this.inside(x, y) ? this.data[(y * this.w + x) * 4 + 3] : 0;
  }

  /** Copy opaque pixels of `src` onto this buffer. */
  blit(src: PixelBuffer, dx: number, dy: number, flipX = false): void {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const sx = flipX ? src.w - 1 - x : x;
        const i = (y * src.w + sx) * 4;
        if (src.data[i + 3] === 0) continue;
        this.set(dx + x, dy + y, [src.data[i], src.data[i + 1], src.data[i + 2], src.data[i + 3]]);
      }
    }
  }

  /** Returns a copy padded by 1px with a coloured outline around the opaque shape. */
  outlined(color: string): PixelBuffer {
    const out = new PixelBuffer(this.w + 2, this.h + 2);
    const c = hexToRgba(color);
    for (let y = -1; y <= this.h; y++) {
      for (let x = -1; x <= this.w; x++) {
        if (this.alphaAt(x, y) > 0) continue;
        if (this.alphaAt(x - 1, y) || this.alphaAt(x + 1, y) || this.alphaAt(x, y - 1) || this.alphaAt(x, y + 1)) {
          out.set(x + 1, y + 1, c);
        }
      }
    }
    out.blit(this, 1, 1);
    return out;
  }

  flippedX(): PixelBuffer {
    const out = new PixelBuffer(this.w, this.h);
    out.blit(this, 0, 0, true);
    return out;
  }

  opaqueCount(): number {
    let n = 0;
    for (let i = 3; i < this.data.length; i += 4) if (this.data[i] > 0) n++;
    return n;
  }

  /** FNV hash of the pixel data; used by tests to pin deterministic output. */
  checksum(): number {
    let h = 2166136261;
    for (let i = 0; i < this.data.length; i++) {
      h ^= this.data[i];
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
}
