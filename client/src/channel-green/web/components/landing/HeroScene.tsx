import { useEffect, useRef } from 'react';
import {
  FRAME_H,
  FRAME_NAMES,
  FRAME_W,
  DIRECTIONS,
  buildCollisionMap,
  canStand,
  randomAvatar,
  renderAvatarSheet,
  type Direction,
} from '@channel-green/shared';
import { bufToCanvas, renderMapPicture } from '@cg/lib/art';
import { registry } from '@cg/lib/registry';

interface Walker {
  x: number;
  y: number;
  tx: number;
  ty: number;
  dir: Direction;
  wait: number;
  sheet: HTMLCanvasElement;
  name: string;
}

const NAMES = ['moss', 'pip', 'juniper', 'wren', 'basil'];

/** The real town square, drawn from the same art data the game uses, with a few villagers wandering. */
export function HeroScene({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const map = registry.maps['town-square'];
    const pic = renderMapPicture(map, registry);
    const col = buildCollisionMap(map, registry);
    const W = pic.width;
    const H = 360;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const spots: [number, number][] = [];
    for (let y = 150; y < 340; y += 8) for (let x = 24; x < W - 24; x += 8) if (canStand(col, x, y)) spots.push([x, y]);
    const walkers: Walker[] = NAMES.map((name, i) => {
      const [x, y] = spots[Math.floor(rnd() * spots.length)];
      return { x, y, tx: x, ty: y, dir: 'down', wait: rnd() * 2000, sheet: bufToCanvas(renderAvatarSheet(randomAvatar(registry.avatar, 100 + i * 31), registry.avatar)), name };
    });
    const flies = Array.from({ length: 28 }, () => ({ x: rnd() * W, y: rnd() * H, ph: rnd() * 10 }));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const dusk = ctx.createLinearGradient(0, 0, 0, H);
    dusk.addColorStop(0, 'rgba(70,42,96,0.34)');
    dusk.addColorStop(0.55, 'rgba(214,110,70,0.26)');
    dusk.addColorStop(1, 'rgba(255,150,80,0.3)');
    let raf = 0;
    let last = performance.now();
    const frame = (t: number) => {
      const dt = Math.min(t - last, 60) / 1000;
      last = t;
      ctx.drawImage(pic, 0, 0, W, H, 0, 0, W, H);
      const sorted = [...walkers].sort((a, b) => a.y - b.y);
      for (const w of sorted) {
        let moving = false;
        if (!reduce) {
          if (w.wait > 0) w.wait -= dt * 1000;
          else {
            const dx = w.tx - w.x;
            const dy = w.ty - w.y;
            const d = Math.hypot(dx, dy);
            if (d < 1.5) {
              const [nx, ny] = spots[Math.floor(rnd() * spots.length)];
              if (Math.hypot(nx - w.x, ny - w.y) < 90) {
                w.tx = nx;
                w.ty = ny;
              }
              w.wait = 600 + rnd() * 2500;
            } else {
              const sx = (dx / d) * 34 * dt;
              const sy = (dy / d) * 34 * dt;
              if (canStand(col, w.x + sx, w.y + sy)) {
                w.x += sx;
                w.y += sy;
                moving = true;
                w.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
              } else {
                w.tx = w.x;
                w.ty = w.y;
              }
            }
          }
        }
        const r = DIRECTIONS.indexOf(w.dir);
        const c = FRAME_NAMES.indexOf((moving ? `walk${Math.floor(t / 125) % 4}` : `idle${Math.floor(t / 600) % 2}`) as (typeof FRAME_NAMES)[number]);
        ctx.drawImage(w.sheet, c * FRAME_W, r * FRAME_H, FRAME_W, FRAME_H, Math.round(w.x - FRAME_W / 2), Math.round(w.y - FRAME_H), FRAME_W, FRAME_H);
      }
      ctx.fillStyle = dusk;
      ctx.fillRect(0, 0, W, H);
      for (const f of flies) {
        if (!reduce) {
          f.x += Math.sin(t / 900 + f.ph) * 0.12;
          f.y += Math.cos(t / 1100 + f.ph) * 0.1;
        }
        ctx.globalAlpha = 0.25 + 0.75 * Math.max(0, Math.sin(t / 500 + f.ph));
        ctx.fillStyle = '#d9ff9a';
        ctx.fillRect(Math.round(f.x), Math.round(f.y), 2, 2);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} className={`pixelated block w-full ${className}`} aria-label="A small pixel town square at dusk with a few villagers walking around" role="img" />;
}
