import * as Phaser from 'phaser';
import {
  FLAG_MOVING,
  FLAG_SEATED,
  FRAME_H,
  FRAME_NAMES,
  FRAME_W,
  DIRECTIONS,
  PLAYER_SPEED,
  TILE,
  buildCollisionMap,
  canStand,
  portalAt,
  renderAvatarSheet,
  hashString,
  type CollisionMap,
  type Direction,
  type FurnitureDef,
  type JoinOk,
  type MapDef,
  type PublicPlayer,
} from '@channel-green/shared';
import { bufToCanvas, furnitureCanvas, renderGround } from '@cg/lib/art';
import { registry } from '@cg/lib/registry';
import type { GameSession, SceneEvent } from './session';
import type { Controls } from './controls';
import { moodFor, type GradeStop, type Mood } from './mood';

type Obj = Phaser.GameObjects.GameObject;

interface Avatar {
  pid: string;
  sprite: Phaser.GameObjects.Sprite;
  name: Phaser.GameObjects.Text;
  bubble?: Phaser.GameObjects.Text;
  bubbleUntil: number;
  glyph?: Phaser.GameObjects.Text;
  glyphUntil: number;
  x: number;
  y: number;
  moving: boolean;
  seated: boolean;
  dir: Direction;
  texKey: string;
  role: PublicPlayer['role'];
}

const FONT = '"Pixelify Sans", "Jost", system-ui, sans-serif';
const REACH = 26;

export class WorldScene extends Phaser.Scene {
  private session!: GameSession;
  private controls!: Controls;
  private map!: MapDef;
  private col!: CollisionMap;
  private roomObjs: Obj[] = [];
  private avatars = new Map<string, Avatar>();
  private myX = 0;
  private myY = 0;
  private myDir: Direction = 'down';
  private moving = false;
  private seated = false;
  private lastSend = 0;
  private lastSentMoving = false;
  private seq = 0;
  private portalSince = 0;
  private portalLock = 0;
  private fx: ((t: number, dt: number) => void)[] = [];
  private prompt!: Phaser.GameObjects.Text;
  private unsub: (() => void) | null = null;
  private zoomLevel = 3;
  private nearIndex = -1;
  private nearPortal = '';
  private ready = false;
  private pendingJoin: JoinOk | null = null;
  private reduce = false;

  constructor() {
    super('world');
  }

  init(data: { session: GameSession; controls: Controls }) {
    this.session = data.session;
    this.controls = data.controls;
  }

  create() {
    this.reduce = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    this.cameras.main.setBackgroundColor('#0b1f15');
    this.scale.on('resize', () => this.fit());
    this.fit();
    this.prompt = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '8px', color: '#faf5e8', backgroundColor: '#14301fcc', padding: { x: 3, y: 1 } }).setOrigin(0.5, 1).setDepth(99999).setVisible(false);
    this.prompt.setResolution(this.textRes());
    this.unsub = this.session.onScene((e) => this.onEvent(e));
    this.controls.onAction = () => this.act();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Obj[]) => {
      if (over.length) return;
      this.session.select(null);
      void p;
    });
    this.events.once('shutdown', () => this.cleanup());
    this.ready = true;
    if (process.env.NODE_ENV !== 'production') {
      // development-only hook used by the browser test script; never present in a production build
      (window as unknown as Record<string, unknown>).__cgDev = {
        canStand: (x: number, y: number) => !!this.col && canStand(this.col, x, y),
        size: () => ({ w: this.col?.width ?? 0, h: this.col?.height ?? 0 }),
        pos: () => ({ x: this.myX, y: this.myY }),
        portals: () => this.col?.portals.map((p) => ({ id: p.id, label: p.label, to: p.to, x: p.px.x + p.px.w / 2, y: p.px.y + p.px.h / 2 })) ?? [],
        controls: this.controls,
        session: this.session,
      };
    }
    if (!this.pendingJoin && this.session.lastJoin) this.pendingJoin = this.session.lastJoin;
    if (this.pendingJoin) this.loadRoom(this.pendingJoin);
  }

  /** Text is drawn sharper than the pixel grid. The plain canvas fallback (no WebGL) does not scale it back down, so keep it at 1 there. */
  private textRes() {
    return this.game.renderer.type === Phaser.CANVAS ? 1 : this.zoomLevel * 2;
  }

  private cleanup() {
    this.unsub?.();
    this.controls.onAction = null;
  }

  /** Leave room under the HUD (top bar and emote bar) so portal labels and the floor are never hidden behind it. */
  private setCamBounds() {
    if (!this.col) return;
    const small = this.scale.width < 640;
    const top = Math.ceil((small ? 64 : 48) / this.zoomLevel);
    const bottom = Math.ceil((small ? 150 : 70) / this.zoomLevel);
    this.cameras.main.setBounds(0, -top, this.col.width, this.col.height + top + bottom);
  }

  private fit() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.zoomLevel = Math.max(2, Math.min(5, Math.floor(Math.min(w / 300, h / 190))));
    this.cameras.main.setZoom(this.zoomLevel);
    this.setCamBounds();
    if (this.prompt) this.prompt.setResolution(this.textRes());
    for (const a of this.avatars.values()) {
      a.name.setResolution(this.textRes());
      a.bubble?.setResolution(this.textRes());
      a.glyph?.setResolution(this.textRes());
    }
  }

  // ------------------------------------------------------------------ events

  private onEvent(e: SceneEvent) {
    switch (e.type) {
      case 'room':
        if (!this.ready) this.pendingJoin = e.join;
        else this.loadRoom(e.join);
        break;
      case 'join':
        this.addAvatar(e.player);
        break;
      case 'leave':
        this.removeAvatar(e.pid);
        break;
      case 'update': {
        const a = this.avatars.get(e.pid);
        const p = this.session.players.get(e.pid);
        if (a && p) a.role = p.role;
        break;
      }
      case 'say':
        this.showBubble(e.pid, e.text);
        break;
      case 'emote':
        this.showGlyph(e.pid, e.glyph);
        break;
      case 'effect':
        this.showGlyph(e.a, e.kind === 'hug' ? '🫂' : e.kind === 'wave' ? '👋' : '💚');
        this.showGlyph(e.b, e.kind === 'hug' ? '🫂' : e.kind === 'wave' ? '👋' : '💚');
        break;
      case 'wish':
        this.showGlyph(e.pid, '🌠');
        break;
      case 'correct':
        this.myX = e.x;
        this.myY = e.y;
        this.seated = false;
        break;
      case 'seat':
        this.myX = e.x;
        this.myY = e.y;
        this.myDir = e.dir;
        this.seated = true;
        break;
    }
  }

  // ------------------------------------------------------------------ room building

  private clearRoom() {
    this.tweens.killAll();
    this.roomObjs.forEach((o) => o.destroy());
    this.roomObjs = [];
    this.avatars.forEach((a) => this.destroyAvatar(a));
    this.avatars.clear();
    this.fx = [];
  }

  private track<T extends Obj>(o: T): T {
    this.roomObjs.push(o);
    return o;
  }

  private loadRoom(j: JoinOk) {
    this.clearRoom();
    const map = registry.maps[j.map];
    if (!map) return;
    this.map = map;
    this.col = buildCollisionMap(map, registry);
    const key = `ground:${map.id}`;
    if (!this.textures.exists(key)) this.textures.addCanvas(key, renderGround(map, registry));
    this.track(this.add.image(0, 0, key).setOrigin(0, 0).setDepth(-100000));

    // furniture, sorted by feet line so players walk behind and in front
    map.objects.forEach((o, i) => {
      const def = registry.furniture[o.furniture];
      if (!def) return;
      const tk = `f:${o.furniture}`;
      if (!this.textures.exists(tk)) {
        const c = furnitureCanvas(registry, o.furniture);
        if (!c) return;
        this.textures.addCanvas(tk, c);
      }
      const img = this.track(this.add.image(o.at[0], o.at[1], tk).setOrigin(0, 0));
      img.setDepth(def.flat ? -50000 + o.at[1] : o.at[1] + def.size[1] + (o.depth ?? 0));
      this.animateFurniture(img, def, i);
      if (def.light) this.addLight(o.at[0] + def.light.x, o.at[1] + def.light.y, def);
    });

    const w = this.col.width;
    const h = this.col.height;
    const mood = moodFor(map.id);
    this.applyMood(map.id, mood, w, h);
    for (const e of map.effects) if (!mood.skipEffects?.includes(e.type)) this.addEffect(e.type, e.count ?? 20, e.color);
    this.addMotes(mood, w, h);

    // portal glow so doors can be found
    for (const p of this.col.portals) {
      const g = this.track(this.add.rectangle(p.px.x, p.px.y, p.px.w, p.px.h, 0x9dff6a, 0.12).setOrigin(0, 0).setDepth(-49000));
      if (!this.reduce) this.tweens.add({ targets: g, alpha: 0.28, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const label = this.track(
        this.add.text(p.px.x + p.px.w / 2, p.px.y + p.px.h / 2, p.label, { fontFamily: FONT, fontSize: '7px', color: '#e8f7cf', stroke: '#0b1f15', strokeThickness: 2 }).setOrigin(0.5).setDepth(89000).setAlpha(0.85),
      );
      label.setResolution(this.textRes());
    }

    this.myX = j.me.x;
    this.myY = j.me.y;
    this.myDir = j.me.dir;
    this.seated = (j.me.flags & FLAG_SEATED) !== 0;
    this.moving = false;
    this.portalLock = this.time.now + 1600;
    this.portalSince = 0;

    this.avatarFor(j.me);
    this.addAvatar(j.me, true);
    for (const p of j.players) this.addAvatar(p);

    const cam = this.cameras.main;
    this.setCamBounds();
    cam.centerOn(this.myX, this.myY - 12);
    const me = this.avatars.get(j.me.pid);
    if (me) cam.startFollow(me.sprite, true, 0.12, 0.12);
    cam.setRoundPixels(true);
  }

  private animateFurniture(img: Phaser.GameObjects.Image, def: FurnitureDef, i: number) {
    if (this.reduce && def.anim !== 'tv') return;
    switch (def.anim) {
      case 'sway':
        img.setOrigin(0.5, 1).setPosition(img.x + def.size[0] / 2, img.y + def.size[1]);
        this.tweens.add({ targets: img, angle: { from: -1.4, to: 1.4 }, duration: 2600 + (i % 5) * 300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        break;
      case 'flicker':
      case 'glow':
        this.tweens.add({ targets: img, alpha: { from: 1, to: 0.82 }, duration: 900 + (i % 4) * 250, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        break;
      case 'bob':
        this.tweens.add({ targets: img, y: img.y - 1, duration: 1400 + (i % 3) * 300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        break;
      case 'tv': {
        const colors = [0xffffff, 0xcfe0ff, 0xfff0d0, 0xd8ffe0];
        let n = 0;
        this.fx.push((t) => {
          if (Math.floor(t / 450) !== n) {
            n = Math.floor(t / 450);
            img.setTint(colors[n % colors.length]);
          }
        });
        break;
      }
      default:
        break;
    }
  }

  private lightTex(radius: number, color: string): string {
    const key = `light:${radius}:${color}`;
    if (!this.textures.exists(key)) {
      const c = document.createElement('canvas');
      c.width = c.height = radius * 2;
      const ctx = c.getContext('2d')!;
      const g = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
      g.addColorStop(0, color + 'ff');
      g.addColorStop(0.4, color + '66');
      g.addColorStop(1, color + '00');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, radius * 2, radius * 2);
      this.textures.addCanvas(key, c);
    }
    return key;
  }

  private addLight(x: number, y: number, def: FurnitureDef) {
    const l = def.light;
    if (!l) return;
    const img = this.track(this.add.image(x, y, this.lightTex(Math.round(l.radius), l.color)).setBlendMode(Phaser.BlendModes.ADD).setDepth(90001));
    const base = l.intensity * 0.7;
    img.setAlpha(base);
    if (this.reduce) return;
    if (l.flicker) this.tweens.add({ targets: img, alpha: base * (1 - l.flicker * 2), duration: 170 + Math.random() * 200, yoyo: true, repeat: -1 });
    else this.tweens.add({ targets: img, alpha: base * 0.9, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  private addEffect(type: string, count: number, color?: string) {
    const W = this.col.width;
    const H = this.col.height;
    const col = color ? Phaser.Display.Color.HexStringToColor(color).color : undefined;
    const n = Math.min(count, 80);
    const items = Array.from({ length: n }, () => {
      const size = type === 'rain' ? 1 : type === 'stars' ? 1 : 2;
      const r = this.track(this.add.rectangle(Math.random() * W, Math.random() * H, size, type === 'rain' ? 4 : size, col ?? 0xffffff, 0.8).setDepth(90002));
      return { r, ph: Math.random() * 10, sp: 0.5 + Math.random(), x: r.x, y: r.y };
    });
    const colors: Record<string, number> = { fireflies: 0xd9ff9a, leaves: 0xc9683a, stars: 0xfff4c8, rain: 0xa8c8ff, dust: 0xfaf5e8, smoke: 0xb8b8b0, lanterns: 0xffb060, petals: 0xffc0d0, snow: 0xffffff };
    items.forEach((it) => it.r.setFillStyle(col ?? colors[type] ?? 0xffffff));
    this.fx.push((t, dt) => {
      const s = dt / 1000;
      for (const it of items) {
        const r = it.r;
        switch (type) {
          case 'fireflies':
            it.x += Math.sin(t / 900 + it.ph) * 8 * s;
            it.y += Math.cos(t / 1100 + it.ph) * 6 * s;
            r.setAlpha(0.2 + 0.8 * Math.max(0, Math.sin(t / 500 + it.ph)));
            break;
          case 'leaves':
          case 'petals':
            it.y += 9 * it.sp * s;
            it.x += Math.sin(t / 700 + it.ph) * 12 * s;
            if (it.y > H) it.y = -4;
            break;
          case 'rain':
            it.y += 120 * it.sp * s;
            it.x -= 12 * s;
            if (it.y > H) {
              it.y = -6;
              it.x = Math.random() * W;
            }
            r.setAlpha(0.35);
            break;
          case 'snow':
            it.y += 14 * it.sp * s;
            it.x += Math.sin(t / 900 + it.ph) * 6 * s;
            if (it.y > H) it.y = -4;
            break;
          case 'stars':
            r.setAlpha(0.25 + 0.75 * Math.abs(Math.sin(t / 900 + it.ph)));
            break;
          case 'smoke':
          case 'lanterns':
            it.y -= 5 * it.sp * s;
            it.x += Math.sin(t / 1000 + it.ph) * 4 * s;
            if (it.y < -4) it.y = H;
            r.setAlpha(type === 'lanterns' ? 0.55 + 0.3 * Math.sin(t / 400 + it.ph) : 0.2);
            break;
          default:
            it.x += Math.sin(t / 1400 + it.ph) * 3 * s;
            it.y += Math.cos(t / 1700 + it.ph) * 2 * s;
            r.setAlpha(0.15 + 0.2 * Math.sin(t / 800 + it.ph));
        }
        r.setPosition(it.x, it.y);
      }
    });
  }

  // ------------------------------------------------------------------ mood (dusk grade, lamp pools, drifting specks)

  private gradeTex(key: string, w: number, h: number, stops: GradeStop[]): string {
    if (!this.textures.exists(key)) {
      const c = document.createElement('canvas');
      c.width = 4;
      c.height = Math.max(2, Math.round(h));
      const ctx = c.getContext('2d')!;
      const g = ctx.createLinearGradient(0, 0, 0, c.height);
      for (const [o, col, a] of stops) {
        const r = parseInt(col.slice(1, 3), 16);
        const gr = parseInt(col.slice(3, 5), 16);
        const b = parseInt(col.slice(5, 7), 16);
        g.addColorStop(o, `rgba(${r},${gr},${b},${a})`);
      }
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 4, c.height);
      this.textures.addCanvas(key, c);
    }
    void w;
    return key;
  }

  private applyMood(id: string, mood: Mood, w: number, h: number) {
    const day = this.track(this.add.image(0, 0, this.gradeTex(`grade:${id}`, w, h, mood.grade)).setOrigin(0, 0).setDisplaySize(w, h).setDepth(90000));
    let night: Phaser.GameObjects.Image | null = null;
    if (mood.sunset) {
      night = this.track(this.add.image(0, 0, this.gradeTex(`grade:${id}:night`, w, h, mood.sunset.night)).setOrigin(0, 0).setDisplaySize(w, h).setDepth(90000).setAlpha(this.reduce ? 0.35 : 0));
      const stars = Array.from({ length: mood.sunset.stars }, () => {
        const r = this.track(this.add.rectangle(Math.random() * w, Math.random() * h * 0.7, 1, 1, 0xfff4c8, 0).setDepth(90003));
        return { r, ph: Math.random() * 10 };
      });
      const cycle = { t: this.reduce ? 0.35 : 0 };
      if (!this.reduce) this.tweens.add({ targets: cycle, t: 1, duration: 150000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.fx.push((t) => {
        night?.setAlpha(cycle.t);
        day.setAlpha(1 - cycle.t * 0.55);
        for (const s of stars) s.r.setAlpha(cycle.t * (this.reduce ? 0.7 : 0.25 + 0.75 * Math.abs(Math.sin(t / 900 + s.ph))));
      });
    }
    for (const g of mood.glows ?? []) {
      const img = this.track(this.add.image(g.x, g.y, this.lightTex(g.r, g.color)).setBlendMode(Phaser.BlendModes.ADD).setDepth(90001).setAlpha(g.alpha));
      if (g.breathe && !this.reduce) this.tweens.add({ targets: img, alpha: g.alpha * 0.72, duration: 2600 + Math.random() * 1800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
  }

  private addMotes(mood: Mood, W: number, H: number) {
    for (const m of mood.motes ?? []) {
      const col = Phaser.Display.Color.HexStringToColor(m.color).color;
      const n = Math.min(m.count, 40);
      const items = Array.from({ length: n }, () => {
        const size = m.type === 'dust' ? 1 : 2;
        const r = this.track(this.add.rectangle(Math.random() * W, Math.random() * H, size, size, col, 0.5).setDepth(90004));
        return { r, x: r.x, y: r.y, ph: Math.random() * 10, sp: 0.4 + Math.random() };
      });
      if (this.reduce) {
        items.forEach((it) => it.r.setAlpha(m.type === 'dust' ? 0.25 : 0.5));
        continue;
      }
      this.fx.push((t, dt) => {
        const s = dt / 1000;
        for (const it of items) {
          switch (m.type) {
            case 'fireflies':
              it.x += Math.sin(t / 1300 + it.ph) * 7 * s;
              it.y += Math.cos(t / 1700 + it.ph) * 5 * s;
              it.r.setAlpha(0.1 + 0.8 * Math.max(0, Math.sin(t / 700 + it.ph)));
              break;
            case 'embers':
              it.y -= 6 * it.sp * s;
              it.x += Math.sin(t / 900 + it.ph) * 4 * s;
              if (it.y < -4) it.y = H;
              it.r.setAlpha(0.3 + 0.5 * Math.abs(Math.sin(t / 500 + it.ph)));
              break;
            case 'pollen':
              it.x += (3 + Math.sin(t / 2000 + it.ph) * 3) * it.sp * s;
              it.y += Math.cos(t / 1800 + it.ph) * 2.5 * s;
              if (it.x > W + 4) it.x = -4;
              it.r.setAlpha(0.25 + 0.4 * Math.abs(Math.sin(t / 1100 + it.ph)));
              break;
            default:
              it.x += (1.5 + Math.sin(t / 2600 + it.ph) * 2) * it.sp * s;
              it.y += Math.cos(t / 3100 + it.ph) * 1.8 * s;
              if (it.x > W + 4) it.x = -4;
              it.r.setAlpha(0.12 + 0.22 * Math.abs(Math.sin(t / 1500 + it.ph)));
          }
          it.r.setPosition(it.x, it.y);
        }
      });
    }
  }

  // ------------------------------------------------------------------ avatars

  /** One texture per distinct look; frames are named like "down-walk2". */
  private avatarFor(p: PublicPlayer): string {
    const key = `av:${hashString(JSON.stringify(p.avatar)).toString(36)}`;
    if (!this.textures.exists(key)) {
      const sheet = bufToCanvas(renderAvatarSheet(p.avatar, registry.avatar));
      const tex = this.textures.addCanvas(key, sheet);
      if (tex) {
        DIRECTIONS.forEach((d, r) => FRAME_NAMES.forEach((n, c) => tex.add(`${d}-${n}`, 0, c * FRAME_W, r * FRAME_H, FRAME_W, FRAME_H)));
      }
    }
    return key;
  }

  private addAvatar(p: PublicPlayer, isMe = false) {
    if (this.avatars.has(p.pid) || !this.map) return;
    const texKey = this.avatarFor(p);
    const sprite = this.add.sprite(p.x, p.y, texKey, `${p.dir}-idle0`).setOrigin(0.5, 1 - 1 / FRAME_H);
    if (!isMe) {
      sprite.setInteractive({ useHandCursor: true });
      sprite.on('pointerdown', () => this.session.select(p.pid));
    }
    const name = this.add
      .text(p.x, p.y - FRAME_H - 1, p.name, { fontFamily: FONT, fontSize: '7px', color: isMe ? '#9dff6a' : '#faf5e8', stroke: '#0b1f15', strokeThickness: 2 })
      .setOrigin(0.5, 1);
    name.setResolution(this.textRes());
    this.roomObjs.push(sprite, name);
    this.avatars.set(p.pid, {
      pid: p.pid,
      sprite,
      name,
      bubbleUntil: 0,
      glyphUntil: 0,
      x: p.x,
      y: p.y,
      moving: false,
      seated: false,
      dir: p.dir,
      texKey,
      role: p.role,
    });
  }

  private destroyAvatar(a: Avatar) {
    a.sprite.destroy();
    a.name.destroy();
    a.bubble?.destroy();
    a.glyph?.destroy();
  }

  private removeAvatar(pid: string) {
    const a = this.avatars.get(pid);
    if (!a) return;
    this.destroyAvatar(a);
    this.avatars.delete(pid);
  }

  private showBubble(pid: string, text: string) {
    const a = this.avatars.get(pid);
    if (!a) return;
    a.bubble?.destroy();
    const short = text.length > 64 ? text.slice(0, 61) + '...' : text;
    a.bubble = this.add
      .text(a.x, a.y - FRAME_H - 9, short, { fontFamily: FONT, fontSize: '7px', color: '#2a1d1a', backgroundColor: '#faf5e8', padding: { x: 3, y: 2 }, wordWrap: { width: 96 }, align: 'center' })
      .setOrigin(0.5, 1)
      .setDepth(95000);
    a.bubble.setResolution(this.textRes());
    a.bubbleUntil = this.time.now + 4500 + short.length * 40;
  }

  private showGlyph(pid: string, glyph: string) {
    const a = this.avatars.get(pid);
    if (!a) return;
    a.glyph?.destroy();
    a.glyph = this.add.text(a.x, a.y - FRAME_H - 4, glyph, { fontFamily: FONT, fontSize: '12px' }).setOrigin(0.5, 1).setDepth(95001);
    a.glyph.setResolution(this.textRes());
    a.glyphUntil = this.time.now + 2200;
  }

  // ------------------------------------------------------------------ interaction

  private nearestObject(): { index: number; label: string } | null {
    let best = -1;
    let bestD = REACH;
    let label = '';
    this.map.objects.forEach((o, i) => {
      const def = registry.furniture[o.furniture];
      if (!def?.interaction) return;
      const x0 = o.at[0];
      const y0 = o.at[1];
      const dx = Math.max(x0 - this.myX, 0, this.myX - (x0 + def.size[0]));
      const dy = Math.max(y0 - this.myY, 0, this.myY - (y0 + def.size[1]));
      const d = Math.hypot(dx, dy);
      if (d < bestD) {
        bestD = d;
        best = i;
        label = o.label ?? def.prompt ?? (def.interaction.kind === 'sit' ? 'Sit' : def.name);
      }
    });
    return best >= 0 ? { index: best, label } : null;
  }

  act() {
    if (!this.ready || !this.map) return;
    if (this.nearPortal) void this.session.usePortal(this.nearPortal);
    else if (this.nearIndex >= 0) void this.session.interact(this.nearIndex);
  }

  /** Called from the on-screen action button. */
  actionButton() {
    this.act();
  }

  // ------------------------------------------------------------------ frame loop

  update(time: number, delta: number) {
    if (!this.ready || !this.map) return;
    // Movement is integrated in fixed slices from real elapsed time, so speed does not depend on the frame rate
    // (a slow phone covers the same distance per second as a fast desktop; the cap only stops a tab that was asleep from jumping).
    let left = Math.min(delta, 250) / 1000;
    while (left > 0) {
      const slice = Math.min(left, 1 / 60);
      this.stepMe(slice, time);
      left -= slice;
    }
    this.stepAvatars(time, Math.min(delta, 250) / 1000);
    this.fx.forEach((f) => f(time, delta));

    // prompts: doors first, then things
    const portal = portalAt(this.col, this.myX, this.myY);
    const near = this.nearestObject();
    this.nearIndex = near?.index ?? -1;
    const pad = this.col.portals.find((p) => Math.hypot(p.px.x + p.px.w / 2 - this.myX, p.px.y + p.px.h / 2 - this.myY) < 22);
    this.nearPortal = pad?.id ?? '';
    const label = pad ? `Go to ${pad.label}` : near?.label ?? '';
    this.session.setNearby(label ? { label, kind: pad ? 'portal' : 'object' } : null);
    if (label) {
      this.prompt.setText(`E  ${label}`).setPosition(this.myX, this.myY - FRAME_H - 14).setVisible(true);
    } else this.prompt.setVisible(false);

    // stepping onto a door walks through it
    if (portal && time > this.portalLock) {
      if (!this.portalSince) this.portalSince = time;
      else if (time - this.portalSince > 220) {
        this.portalLock = time + 2500;
        this.portalSince = 0;
        void this.session.usePortal(portal.id);
      }
    } else this.portalSince = 0;
  }

  private stepMe(dt: number, time: number) {
    const v = this.controls.vector();
    let dx = v.x;
    let dy = v.y;
    const wants = dx !== 0 || dy !== 0;
    if (this.seated && wants) this.standUp(dx, dy);
    if (!this.seated && wants) {
      const len = Math.hypot(dx, dy) || 1;
      dx = (dx / len) * PLAYER_SPEED * dt;
      dy = (dy / len) * PLAYER_SPEED * dt;
      let moved = false;
      if (dx !== 0 && canStand(this.col, this.myX + dx, this.myY)) {
        this.myX += dx;
        moved = true;
      }
      if (dy !== 0 && canStand(this.col, this.myX, this.myY + dy)) {
        this.myY += dy;
        moved = true;
      }
      if (Math.abs(v.x) >= Math.abs(v.y) && v.x !== 0) this.myDir = v.x > 0 ? 'right' : 'left';
      else if (v.y !== 0) this.myDir = v.y > 0 ? 'down' : 'up';
      this.moving = moved;
    } else if (!this.seated) this.moving = false;

    const changed = this.moving !== this.lastSentMoving;
    if (!this.seated && (this.moving ? time - this.lastSend > 66 : changed)) {
      this.lastSend = time;
      this.lastSentMoving = this.moving;
      this.session.move(this.myX, this.myY, this.myDir, this.moving, ++this.seq);
    }
    const me = this.session.me;
    if (me) {
      const a = this.avatars.get(me.pid);
      if (a) {
        a.x = this.myX;
        a.y = this.myY;
        a.dir = this.myDir;
        a.moving = this.moving;
        a.seated = this.seated;
      }
    }
  }

  private standUp(dx: number, dy: number) {
    const tries: [number, number][] = [];
    for (const dist of [6, 10, 14, 18, 22]) {
      tries.push([Math.sign(dx) * dist, Math.sign(dy) * dist], [Math.sign(dx) * dist, 0], [0, Math.sign(dy) * dist], [0, dist], [dist, 0], [-dist, 0], [0, -dist]);
    }
    for (const [ox, oy] of tries) {
      if ((ox || oy) && canStand(this.col, this.myX + ox, this.myY + oy)) {
        this.myX += ox;
        this.myY += oy;
        this.seated = false;
        this.session.move(this.myX, this.myY, this.myDir, false, ++this.seq);
        return;
      }
    }
  }

  private stepAvatars(time: number, dt: number) {
    // frame-rate independent easing toward the last server position (about 28% per frame at 60 fps)
    const ease = 1 - Math.exp(-dt * 19.7);
    const myPid = this.session.me?.pid;
    for (const a of this.avatars.values()) {
      if (a.pid !== myPid) {
        const p = this.session.players.get(a.pid);
        if (p) {
          const dx = p.x - a.x;
          const dy = p.y - a.y;
          if (Math.hypot(dx, dy) > 80) {
            a.x = p.x;
            a.y = p.y;
          } else {
            a.x += dx * ease;
            a.y += dy * ease;
          }
          a.dir = p.dir;
          a.moving = (p.flags & FLAG_MOVING) !== 0 || Math.hypot(dx, dy) > 0.6;
          a.seated = (p.flags & FLAG_SEATED) !== 0;
          a.role = p.role;
        }
      }
      const walk = a.moving && !a.seated;
      const frame = walk ? `walk${Math.floor(time / 125) % 4}` : `idle${Math.floor(time / 600) % 2}`;
      const x = Math.round(a.x);
      const y = Math.round(a.y);
      a.sprite.setPosition(x, y + (a.seated ? 2 : 0)).setFrame(`${a.dir}-${frame}`).setDepth(y);
      const top = y - FRAME_H;
      a.name.setPosition(x, top - 1).setDepth(y + 1);
      if (a.role !== 'player') a.name.setColor(a.role === 'guide' ? '#e8955a' : '#f1e3c1');
      if (a.bubble) {
        if (time > a.bubbleUntil) {
          a.bubble.destroy();
          a.bubble = undefined;
        } else a.bubble.setPosition(x, top - 9);
      }
      if (a.glyph) {
        if (time > a.glyphUntil) {
          a.glyph.destroy();
          a.glyph = undefined;
        } else {
          const rise = (1 - (a.glyphUntil - time) / 2200) * 8;
          a.glyph.setPosition(x, top - 4 - rise);
        }
      }
    }
  }
}
