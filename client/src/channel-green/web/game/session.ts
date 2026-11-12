import {
  FLAG_SEATED,
  INDEX_DIR,
  LIMITS,
  type ChatMessage,
  type Confession,
  type IncomingRequest,
  type InteractResult,
  type JoinOk,
  type MediaChannel,
  type MediaKind,
  type MediaState,
  type PublicPlayer,
  type RequestKind,
  type RoomInfo,
  type VoiceTokenOk,
} from '@channel-green/shared';
import { call, connectNet, fetchJson, type Net } from '@cg/lib/net';
import { GUEST_SIGN_IN_FAILED, isGuestToken, joinErrorMessage, shouldRemintGuest } from './joinRetry';
import { getToken, saveProfile, type LocalProfile } from '@cg/lib/profile';
import { expandShortcodes } from '@cg/lib/emoji';
import { audio } from './audio';
import { registry } from '@cg/lib/registry';

export type Status = 'idle' | 'connecting' | 'ready' | 'offline' | 'kicked' | 'error';
export type PanelId = 'chat' | 'people' | 'avatar' | 'rooms' | 'watch' | 'listen' | 'confession' | 'voice' | 'noticeboard' | 'help' | null;

export interface Toast {
  id: number;
  level: 'info' | 'warn';
  text: string;
}

export interface Snapshot {
  status: Status;
  error: string;
  me: PublicPlayer | null;
  room: RoomInfo | null;
  mapId: string;
  players: PublicPlayer[];
  chat: ChatMessage[];
  unread: number;
  requests: IncomingRequest[];
  media: Partial<Record<MediaChannel, MediaState>>;
  features: JoinOk['features'];
  moderator: boolean;
  panel: PanelId;
  toasts: Toast[];
  blocks: string[];
  muted: string[];
  note: { title: string; text: string } | null;
  nearby: { label: string; kind: 'object' | 'portal' } | null;
  selected: string | null;
}

/** Things the Phaser scene listens for. Position updates never go through React. */
export type SceneEvent =
  | { type: 'room'; join: JoinOk }
  | { type: 'join'; player: PublicPlayer }
  | { type: 'leave'; pid: string }
  | { type: 'update'; pid: string }
  | { type: 'say'; pid: string; text: string }
  | { type: 'emote'; pid: string; glyph: string }
  | { type: 'effect'; kind: RequestKind; a: string; b: string }
  | { type: 'wish'; pid: string }
  | { type: 'correct'; x: number; y: number }
  | { type: 'seat'; x: number; y: number; dir: 'down' | 'up' | 'left' | 'right' };

const EMPTY_FEATURES: JoinOk['features'] = { voice: false, persistence: 'memory' };

export class GameSession {
  net: Net | null = null;
  profile: LocalProfile;
  /** live player objects; x and y are mutated in place by the movement stream */
  players = new Map<string, PublicPlayer>();
  me: PublicPlayer | null = null;
  clockOffset = 0;
  private snap: Snapshot;
  private subs = new Set<() => void>();
  private sceneSubs = new Set<(e: SceneEvent) => void>();
  private toastId = 1;
  private confessionCache: Confession[] = [];
  private confessionSubs = new Set<(c: Confession[]) => void>();
  private mediaSubs = new Set<(s: MediaState) => void>();
  private voiceStop: (() => void) | null = null;
  private disposed = false;

  constructor(profile: LocalProfile) {
    this.profile = profile;
    this.snap = {
      status: 'idle',
      error: '',
      me: null,
      room: null,
      mapId: '',
      players: [],
      chat: [],
      unread: 0,
      requests: [],
      media: {},
      features: EMPTY_FEATURES,
      moderator: false,
      panel: null,
      toasts: [],
      blocks: profile.blocks,
      muted: [],
      note: null,
      nearby: null,
      selected: null,
    };
  }

  // ---------------------------------------------------------------- store plumbing

  subscribe = (fn: () => void) => {
    this.subs.add(fn);
    return () => {
      this.subs.delete(fn);
    };
  };
  getSnapshot = () => this.snap;
  private set(patch: Partial<Snapshot>) {
    this.snap = { ...this.snap, ...patch };
    this.subs.forEach((f) => f());
  }
  onScene(fn: (e: SceneEvent) => void) {
    this.sceneSubs.add(fn);
    return () => {
      this.sceneSubs.delete(fn);
    };
  }
  private emitScene(e: SceneEvent) {
    this.sceneSubs.forEach((f) => f(e));
  }
  private refreshPlayers() {
    const list = [...this.players.values()].sort((a, b) => a.name.localeCompare(b.name));
    this.set({ players: list, me: this.me ? { ...this.me } : null });
  }

  serverNow(): number {
    return Date.now() + this.clockOffset;
  }

  // ---------------------------------------------------------------- connection

  async start() {
    this.set({ status: 'connecting', error: '' });
    let token: string;
    try {
      token = await getToken();
    } catch {
      this.set({ status: 'offline', error: 'The Channel Green server is not answering right now.' });
      return;
    }
    if (this.disposed) return;
    const net = connectNet();
    this.net = net;
    const joinWith = (t: string) => call<JoinOk>(net, 'join', { token: t, name: this.profile.name, avatar: this.profile.avatar, map: 'town-square', blocks: this.profile.blocks });
    const doJoin = async () => {
      let retried = false;
      for (;;) {
        try {
          const res = await joinWith(token);
          this.applyJoin(res, true);
          return;
        } catch (e) {
          const msg = (e as Error).message;
          if (this.disposed) return;
          if (shouldRemintGuest(msg, token, retried)) {
            // The saved guest pass no longer verifies (for example the server restarted with a new secret). Get a new one, once.
            retried = true;
            try {
              token = await getToken(true);
            } catch {
              this.set({ status: 'error', error: GUEST_SIGN_IN_FAILED });
              return;
            }
            continue;
          }
          this.set({ status: 'error', error: joinErrorMessage(msg, isGuestToken(token)) });
          return;
        }
      }
    };
    net.on('connect', () => {
      void doJoin();
    });
    net.on('connect_error', () => {
      if (this.snap.status !== 'ready') this.set({ status: 'offline', error: 'The Channel Green server is not answering right now.' });
    });
    net.on('disconnect', (reason) => {
      if (this.disposed) return;
      if (reason === 'io client disconnect') return;
      this.set({ status: 'offline', error: 'Connection lost. Trying to get you back in...' });
    });
    this.wire(net);
  }

  /** The room the player is in right now, so a scene that starts late (or restarts) can draw it. */
  lastJoin: JoinOk | null = null;

  private applyJoin(j: JoinOk, first: boolean) {
    this.lastJoin = j;
    this.me = j.me;
    this.clockOffset = j.serverNow - Date.now();
    this.players.clear();
    for (const p of j.players) this.players.set(p.pid, p);
    const history = j.history.filter((m) => !m.from || !this.snap.blocks.includes(m.from.uid));
    this.set({
      status: 'ready',
      error: '',
      room: j.room,
      mapId: j.map,
      chat: first ? history : [...history, ...this.snap.chat.filter((m) => m.scope === 'dm')].slice(-200),
      requests: first ? [] : this.snap.requests,
      media: j.media,
      features: j.features,
      moderator: j.moderator,
      note: null,
      nearby: null,
      selected: null,
    });
    this.refreshPlayers();
    this.stopVoice();
    audio().setSoundscape(registry.soundscapes[registry.maps[j.map]?.ambience ?? ''] ?? null);
    this.emitScene({ type: 'room', join: j });
    void this.refineClock();
  }

  private async refineClock() {
    const net = this.net;
    if (!net) return;
    const samples: number[] = [];
    for (let i = 0; i < 3; i++) {
      const t0 = Date.now();
      const sn = await new Promise<number>((resolve) => {
        const t = setTimeout(() => resolve(NaN), 2000);
        (net as unknown as { emit: (...a: unknown[]) => void }).emit('time:ping', (n: number) => {
          clearTimeout(t);
          resolve(n);
        });
      });
      const t1 = Date.now();
      if (Number.isFinite(sn)) samples.push(sn + (t1 - t0) / 2 - t1);
    }
    if (samples.length) this.clockOffset = samples.sort((a, b) => a - b)[Math.floor(samples.length / 2)];
  }

  private wire(net: Net) {
    net.on('player:join', (p) => {
      if (this.snap.blocks.includes(p.uid)) return;
      this.players.set(p.pid, p);
      this.refreshPlayers();
      this.emitScene({ type: 'join', player: p });
    });
    net.on('player:leave', ({ pid }) => {
      this.players.delete(pid);
      this.refreshPlayers();
      this.emitScene({ type: 'leave', pid });
    });
    net.on('world:state', (rows) => {
      for (const [pid, x, y, d, flags] of rows) {
        if (pid === this.me?.pid) continue;
        const p = this.players.get(pid);
        if (!p) continue;
        p.x = x;
        p.y = y;
        p.dir = INDEX_DIR[d] ?? 'down';
        p.flags = flags;
      }
    });
    net.on('pos:correct', ({ x, y }) => this.emitScene({ type: 'correct', x, y }));
    net.on('chat:msg', (m) => this.onChat(m));
    net.on('emote', ({ pid, glyph }) => {
      if (this.isHiddenPid(pid)) return;
      this.emitScene({ type: 'emote', pid, glyph });
    });
    net.on('request:incoming', (r) => {
      if (this.snap.blocks.includes(r.from.uid)) return;
      this.set({ requests: [...this.snap.requests, r] });
      audio().blip('wave');
      setTimeout(() => this.dropRequest(r.id), Math.max(1000, r.expiresAt - this.serverNow()));
    });
    net.on('request:result', (r) => {
      const who = this.players.get(r.by)?.name ?? 'Someone';
      this.toast(r.accepted ? `${who} said yes.` : `${who} is not up for that right now.`, 'info');
    });
    net.on('request:effect', (r) => {
      this.emitScene({ type: 'effect', kind: r.kind, a: r.a, b: r.b });
      audio().blip(r.kind === 'hug' ? 'heart' : 'wave');
    });
    net.on('notice', (n) => this.toast(n.text, n.level));
    net.on('room:changed', (j) => {
      audio().blip('door');
      this.applyJoin(j, false);
    });
    net.on('room:info', (r) => this.set({ room: r }));
    net.on('player:update', (u) => {
      const p = u.pid === this.me?.pid ? this.me : this.players.get(u.pid);
      if (p && u.role) p.role = u.role;
      this.refreshPlayers();
      this.emitScene({ type: 'update', pid: u.pid });
    });
    net.on('media:state', (s) => {
      this.set({ media: { ...this.snap.media, [s.channel]: s } });
      this.mediaSubs.forEach((f) => f(s));
    });
    net.on('confession:new', (c) => {
      this.confessionCache = [c, ...this.confessionCache];
      this.confessionSubs.forEach((f) => f(this.confessionCache));
    });
    net.on('confession:removed', ({ id }) => {
      this.confessionCache = this.confessionCache.filter((c) => c.id !== id);
      this.confessionSubs.forEach((f) => f(this.confessionCache));
    });
    net.on('confession:hearts', ({ id, hearts }) => {
      this.confessionCache = this.confessionCache.map((c) => (c.id === id ? { ...c, hearts } : c));
      this.confessionSubs.forEach((f) => f(this.confessionCache));
    });
    net.on('wish', ({ pid, name }) => {
      this.emitScene({ type: 'wish', pid });
      if (pid !== this.me?.pid) this.toast(`${name} made a wish at the well.`, 'info');
    });
    net.on('kicked', ({ reason }) => {
      this.set({ status: 'kicked', error: reason });
      net.disconnect();
    });
  }

  private onChat(m: ChatMessage) {
    if (m.from && (this.snap.blocks.includes(m.from.uid) || this.snap.muted.includes(m.from.uid))) return;
    const chat = [...this.snap.chat, m].slice(-200);
    const mine = m.from?.pid === this.me?.pid;
    const open = this.snap.panel === 'chat';
    this.set({ chat, unread: mine || open ? 0 : this.snap.unread + 1 });
    if (m.scope !== 'system' && m.from && !mine) audio().blip('message');
    if (m.scope === 'room' && m.from) this.emitScene({ type: 'say', pid: m.from.pid, text: m.text });
    if (m.scope === 'dm' && m.from && !mine && !open) this.toast(`${m.from.name} sent you a private message.`, 'info');
  }

  private isHiddenPid(pid: string) {
    const p = this.players.get(pid);
    return !!p && (this.snap.blocks.includes(p.uid) || this.snap.muted.includes(p.uid));
  }

  // ---------------------------------------------------------------- UI state

  toast(text: string, level: 'info' | 'warn' = 'info') {
    const t = { id: this.toastId++, level, text };
    this.set({ toasts: [...this.snap.toasts.slice(-3), t] });
    setTimeout(() => this.set({ toasts: this.snap.toasts.filter((x) => x.id !== t.id) }), 5200);
  }
  openPanel(p: PanelId) {
    this.set({ panel: this.snap.panel === p ? null : p, unread: p === 'chat' ? 0 : this.snap.unread });
  }
  closePanel() {
    this.set({ panel: null });
  }
  setNearby(n: Snapshot['nearby']) {
    const cur = this.snap.nearby;
    if (cur?.label === n?.label && cur?.kind === n?.kind) return;
    this.set({ nearby: n });
  }
  select(pid: string | null) {
    this.set({ selected: pid, panel: pid ? 'people' : this.snap.panel });
  }
  closeNote() {
    this.set({ note: null });
  }
  dropRequest(id: string) {
    if (this.snap.requests.some((r) => r.id === id)) this.set({ requests: this.snap.requests.filter((r) => r.id !== id) });
  }

  // ---------------------------------------------------------------- actions

  private async act<T = object>(event: string, data?: unknown): Promise<T | null> {
    if (!this.net) return null;
    try {
      return await call<T>(this.net, event, data);
    } catch (e) {
      this.toast((e as Error).message, 'warn');
      return null;
    }
  }

  move(x: number, y: number, dir: string, moving: boolean, seq?: number) {
    this.net?.volatile.emit('move', { x, y, dir: dir as 'down', moving, seq });
    if (this.me) {
      this.me.x = x;
      this.me.y = y;
      this.me.dir = dir as 'down';
    }
  }

  async say(raw: string, to?: string): Promise<boolean> {
    const text = expandShortcodes(raw).trim().slice(0, LIMITS.chatMax);
    if (!text) return false;
    const r = await this.act('chat:send', { text, to });
    return !!r;
  }
  emote(id: string) {
    this.net?.emit('emote', { id });
  }
  async interact(index: number) {
    const r = await this.act<{ result: InteractResult }>('interact', { object: index });
    if (!r) return;
    const res = r.result;
    if (res.kind === 'inspect') this.set({ note: { title: res.name, text: res.text } });
    else if (res.kind === 'sit') {
      if (this.me) {
        this.me.x = res.x;
        this.me.y = res.y;
        this.me.dir = res.dir;
        this.me.flags = FLAG_SEATED;
      }
      this.emitScene({ type: 'seat', x: res.x, y: res.y, dir: res.dir });
    } else if (res.kind === 'panel') {
      this.set({ panel: res.panel === 'noticeboard' ? 'noticeboard' : res.panel });
    }
  }
  async usePortal(id: string) {
    await this.act('portal:use', { portal: id });
  }
  async sendRequest(to: string, kind: RequestKind, note?: string) {
    const r = await this.act('request:send', { to, kind, note });
    if (r) this.toast(kind === 'invite' ? 'Invite sent.' : 'Sent. They can say yes or no.', 'info');
  }
  async respond(id: string, accept: boolean) {
    this.dropRequest(id);
    await this.act('request:respond', { id, accept });
  }
  async block(uid: string) {
    if (this.snap.blocks.includes(uid)) return;
    const blocks = [...this.snap.blocks, uid].slice(-LIMITS.blocksMax);
    this.profile = { ...this.profile, blocks };
    saveProfile(this.profile);
    this.set({ blocks, chat: this.snap.chat.filter((m) => m.from?.uid !== uid) });
    for (const p of [...this.players.values()]) {
      if (p.uid === uid) {
        this.players.delete(p.pid);
        this.emitScene({ type: 'leave', pid: p.pid });
      }
    }
    this.refreshPlayers();
    await this.act('safety:block', { uid });
    this.toast('Blocked. You will not see or hear from them.', 'info');
  }
  async unblock(uid: string) {
    const blocks = this.snap.blocks.filter((b) => b !== uid);
    this.profile = { ...this.profile, blocks };
    saveProfile(this.profile);
    this.set({ blocks });
    await this.act('safety:unblock', { uid });
    this.toast('Unblocked. You can see each other again.', 'info');
  }
  /** Mute only hides someone for this visit, on your screen. */
  mute(uid: string, on: boolean) {
    const muted = on ? [...new Set([...this.snap.muted, uid])] : this.snap.muted.filter((m) => m !== uid);
    this.set({ muted });
  }
  async report(pid: string | undefined, reason: string, details?: string, confession?: string) {
    const r = await this.act('safety:report', { pid, reason, details, confession });
    if (r) this.toast('Thank you. The report went to the people who look after this place.', 'info');
    return !!r;
  }
  async createRoom(map: string, name?: string) {
    await this.act('room:create', { map, name });
  }
  async joinRoom(code: string) {
    await this.act('room:join', { code: code.trim().toUpperCase() });
  }
  async leaveRoom() {
    await this.act('room:leave');
  }
  async mod(action: string, pid?: string) {
    await this.act('room:mod', { action, pid });
  }
  async changeAvatar(profile: LocalProfile) {
    // The server takes name and avatar at join time; a quick reconnect applies the change everywhere.
    this.profile = { ...profile, blocks: this.snap.blocks };
    saveProfile(this.profile);
    this.net?.disconnect();
    this.net?.removeAllListeners();
    this.players.clear();
    await this.start();
  }

  // ---------------------------------------------------------------- media

  async mediaSet(channel: MediaChannel, kind: MediaKind, input: string, title?: string) {
    return !!(await this.act('media:set', { channel, kind, input, title }));
  }
  async mediaControl(channel: MediaChannel, action: 'play' | 'pause' | 'seek' | 'stop', position?: number) {
    return !!(await this.act('media:control', { channel, action, position }));
  }
  onMedia(fn: (s: MediaState) => void) {
    this.mediaSubs.add(fn);
    return () => {
      this.mediaSubs.delete(fn);
    };
  }

  // ---------------------------------------------------------------- confessions

  async loadConfessions() {
    const r = await this.act<{ items: Confession[] }>('confession:list');
    if (r) {
      this.confessionCache = r.items;
      this.confessionSubs.forEach((f) => f(this.confessionCache));
    }
    return this.confessionCache;
  }
  onConfessions(fn: (c: Confession[]) => void) {
    this.confessionSubs.add(fn);
    fn(this.confessionCache);
    return () => {
      this.confessionSubs.delete(fn);
    };
  }
  async confess(text: string) {
    return !!(await this.act('confession:post', { text }));
  }
  async heart(id: string) {
    await this.act('confession:heart', { id });
  }

  // ---------------------------------------------------------------- voice

  async voiceToken(): Promise<VoiceTokenOk | null> {
    return this.act<VoiceTokenOk>('voice:token', { scope: 'room' }) as Promise<VoiceTokenOk | null>;
  }
  setVoiceStop(fn: (() => void) | null) {
    this.voiceStop = fn;
  }
  private stopVoice() {
    this.voiceStop?.();
    this.voiceStop = null;
  }

  async publicConfig() {
    return fetchJson<{ voice: boolean; persistence: string; accounts: boolean }>('/config');
  }

  dispose() {
    this.disposed = true;
    this.stopVoice();
    audio().setSoundscape(null);
    audio().stopTapePlayback();
    this.net?.removeAllListeners();
    this.net?.disconnect();
    this.net = null;
    this.subs.clear();
    this.sceneSubs.clear();
  }
}
