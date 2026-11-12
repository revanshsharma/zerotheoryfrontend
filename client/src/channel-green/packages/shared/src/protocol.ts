import { z } from 'zod';
import { AvatarConfigSchema, type AvatarConfig, type Direction } from './avatar';
import type { MediaChannel, MediaKind, MediaState } from './media';

/** Limits shared by the server (authoritative) and the client (so the UI can say no politely first). */
export const LIMITS = {
  chatMax: 280,
  dmMax: 280,
  confessionMax: 400,
  noteMax: 120,
  reportReasonMax: 300,
  roomNameMax: 32,
  blocksMax: 500,
} as const;

export const DIR_INDEX: Record<Direction, number> = { down: 0, up: 1, left: 2, right: 3 };
export const INDEX_DIR: Direction[] = ['down', 'up', 'left', 'right'];

export const FLAG_MOVING = 1;
export const FLAG_SEATED = 2;

export interface PublicPlayer {
  pid: string;
  /** stable pseudonym used for blocking; reveals nothing about the account */
  uid: string;
  name: string;
  avatar: AvatarConfig;
  x: number;
  y: number;
  dir: Direction;
  flags: number;
  role: 'player' | 'host' | 'guide';
}

export type RoomMode = 'public' | 'invite';

export interface RoomInfo {
  instanceId: string;
  mapId: string;
  name: string;
  mode: RoomMode;
  code?: string;
  hostPid: string | null;
  locked: boolean;
  silenced: boolean;
  population: number;
  capacity: number;
}

export interface ChatMessage {
  id: string;
  scope: 'room' | 'dm' | 'system';
  ts: number;
  from?: { pid: string; uid: string; name: string };
  to?: { pid: string; name: string };
  text: string;
}

export interface Confession {
  id: string;
  text: string;
  ts: number;
  hearts: number;
}

export type RequestKind = 'wave' | 'hug' | 'chat' | 'sit' | 'invite';
export interface IncomingRequest {
  id: string;
  kind: RequestKind;
  from: { pid: string; uid: string; name: string };
  note?: string;
  /** for invite: the room code */
  code?: string;
  expiresAt: number;
}

export type Ack<T = object> = (res: ({ ok: true } & T) | { ok: false; error: string }) => void;

export interface JoinOk {
  me: PublicPlayer;
  room: RoomInfo;
  map: string;
  players: PublicPlayer[];
  serverNow: number;
  features: { voice: boolean; voiceReason?: string; persistence: 'memory' | 'supabase' };
  media: Partial<Record<MediaChannel, MediaState>>;
  history: ChatMessage[];
  moderator: boolean;
}

// ----------------------------------------------------------------- client -> server payloads

const pid = z.string().min(1).max(40);
const nameField = z.string().max(80);

export const JoinSchema = z.object({
  token: z.string().max(2000).optional(),
  name: nameField,
  avatar: z.unknown(),
  map: z.string().max(48).optional(),
  code: z.string().max(20).optional(),
  blocks: z.array(z.string().max(40)).max(LIMITS.blocksMax).optional(),
});
export type JoinPayload = z.infer<typeof JoinSchema>;

export const MoveSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  dir: z.enum(['down', 'up', 'left', 'right']),
  moving: z.boolean(),
  seq: z.number().int().nonnegative().optional(),
});
export type MovePayload = z.infer<typeof MoveSchema>;

export const ChatSchema = z.object({ text: z.string().max(2000), to: pid.optional(), cid: z.string().max(40).optional() });
export const EmoteSendSchema = z.object({ id: z.string().max(32) });
export const InteractSchema = z.object({ object: z.number().int().min(0).max(1000) });
export const PortalUseSchema = z.object({ portal: z.string().max(48) });
export const RequestSendSchema = z.object({
  to: pid,
  kind: z.enum(['wave', 'hug', 'chat', 'sit', 'invite']),
  note: z.string().max(200).optional(),
});
export const RequestRespondSchema = z.object({ id: z.string().max(40), accept: z.boolean() });
export const BlockSchema = z.object({ uid: z.string().max(40) });
export const ReportSchema = z.object({
  pid: pid.optional(),
  confession: z.string().max(40).optional(),
  reason: z.enum(['harassment', 'hate', 'spam', 'sexual', 'self-harm', 'impersonation', 'other']),
  details: z.string().max(LIMITS.reportReasonMax).optional(),
});
export const RoomCreateSchema = z.object({ map: z.string().max(48), name: z.string().max(80).optional() });
export const RoomJoinSchema = z.object({ code: z.string().max(20) });
export const RoomModSchema = z.object({
  action: z.enum(['kick', 'ban', 'silence-player', 'unsilence-player', 'lock', 'unlock', 'silence-room', 'unsilence-room', 'make-host']),
  pid: pid.optional(),
});
export const MediaSetSchema = z.object({
  channel: z.enum(['watch', 'listen']),
  kind: z.enum(['youtube', 'video', 'audio', 'tape']),
  input: z.string().max(700),
  title: z.string().max(100).optional(),
});
export const MediaControlSchema = z.object({
  channel: z.enum(['watch', 'listen']),
  action: z.enum(['play', 'pause', 'seek', 'stop']),
  position: z.number().finite().min(0).max(60 * 60 * 24).optional(),
});
export const ChannelSchema = z.object({ channel: z.enum(['watch', 'listen']) });
export const ConfessionPostSchema = z.object({ text: z.string().max(2000) });
export const ConfessionIdSchema = z.object({ id: z.string().max(40) });
export const VoiceTokenSchema = z.object({ scope: z.enum(['room']).default('room') });
export const ModActionSchema = z.object({
  action: z.enum(['hide-confession', 'ban-user']),
  id: z.string().max(40),
});

// ----------------------------------------------------------------- event maps

export interface ClientToServer {
  join: (p: JoinPayload, ack: Ack<JoinOk>) => void;
  move: (p: MovePayload) => void;
  'chat:send': (p: z.infer<typeof ChatSchema>, ack?: Ack) => void;
  emote: (p: z.infer<typeof EmoteSendSchema>) => void;
  interact: (p: z.infer<typeof InteractSchema>, ack?: Ack<{ result: InteractResult }>) => void;
  'portal:use': (p: z.infer<typeof PortalUseSchema>, ack?: Ack) => void;
  'request:send': (p: z.infer<typeof RequestSendSchema>, ack?: Ack) => void;
  'request:respond': (p: z.infer<typeof RequestRespondSchema>, ack?: Ack) => void;
  'safety:block': (p: z.infer<typeof BlockSchema>, ack?: Ack) => void;
  'safety:unblock': (p: z.infer<typeof BlockSchema>, ack?: Ack) => void;
  'safety:report': (p: z.infer<typeof ReportSchema>, ack?: Ack) => void;
  'room:create': (p: z.infer<typeof RoomCreateSchema>, ack?: Ack) => void;
  'room:join': (p: z.infer<typeof RoomJoinSchema>, ack?: Ack) => void;
  'room:leave': (ack?: Ack) => void;
  'room:mod': (p: z.infer<typeof RoomModSchema>, ack?: Ack) => void;
  'media:set': (p: z.infer<typeof MediaSetSchema>, ack?: Ack) => void;
  'media:control': (p: z.infer<typeof MediaControlSchema>, ack?: Ack) => void;
  'media:state': (p: z.infer<typeof ChannelSchema>, ack?: Ack<{ state: MediaState | null }>) => void;
  'confession:list': (ack: Ack<{ items: Confession[] }>) => void;
  'confession:post': (p: z.infer<typeof ConfessionPostSchema>, ack?: Ack) => void;
  'confession:heart': (p: z.infer<typeof ConfessionIdSchema>, ack?: Ack) => void;
  'voice:token': (p: z.infer<typeof VoiceTokenSchema>, ack: Ack<VoiceTokenOk>) => void;
  'mod:action': (p: z.infer<typeof ModActionSchema>, ack?: Ack) => void;
  'time:ping': (ack: (serverNow: number) => void) => void;
}

export type VoiceTokenOk =
  | { enabled: true; url: string; token: string; room: string; proximity: boolean }
  | { enabled: false; reason: string; proximity: boolean };

export type InteractResult =
  | { kind: 'inspect'; text: string; name: string }
  | { kind: 'sit'; x: number; y: number; dir: Direction }
  | { kind: 'panel'; panel: 'watch' | 'listen' | 'confession' | 'noticeboard' }
  | { kind: 'wish' };

export interface ServerToClient {
  'player:join': (p: PublicPlayer) => void;
  'player:leave': (p: { pid: string }) => void;
  /** compact movement batch: [pid, x, y, dirIndex, flags] */
  'world:state': (rows: [string, number, number, number, number][]) => void;
  'pos:correct': (p: { x: number; y: number; seq?: number }) => void;
  'chat:msg': (m: ChatMessage) => void;
  emote: (p: { pid: string; id: string; glyph: string }) => void;
  'request:incoming': (r: IncomingRequest) => void;
  'request:result': (r: { id: string; accepted: boolean; by: string; kind: RequestKind }) => void;
  'request:effect': (r: { kind: RequestKind; a: string; b: string }) => void;
  notice: (n: { level: 'info' | 'warn'; text: string }) => void;
  'room:changed': (p: JoinOk) => void;
  'room:info': (r: RoomInfo) => void;
  'player:update': (p: { pid: string; role?: PublicPlayer['role']; silenced?: boolean }) => void;
  'media:state': (s: MediaState) => void;
  'confession:new': (c: Confession) => void;
  'confession:removed': (p: { id: string }) => void;
  'confession:hearts': (p: { id: string; hearts: number }) => void;
  wish: (p: { pid: string; name: string }) => void;
  kicked: (p: { reason: string }) => void;
}

export type { MediaChannel, MediaKind, MediaState, AvatarConfig, Direction };
export { AvatarConfigSchema };
