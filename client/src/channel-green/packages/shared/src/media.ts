import type { TapeDef } from './content';

/**
 * Watch Together and the Listening Room share one synchronised-playback model.
 * The server stores (position, at, playing); every client derives the current position from it.
 * Only embeds and direct links the member supplies are allowed - there is no ripping and no DRM handling.
 */

export type MediaChannel = 'watch' | 'listen';
export type MediaKind = 'youtube' | 'video' | 'audio' | 'tape';

export interface MediaSource {
  kind: MediaKind;
  /** youtube video id, https url, or tape id */
  ref: string;
  title: string;
}

export interface MediaState {
  channel: MediaChannel;
  source: MediaSource | null;
  playing: boolean;
  /** seconds into the media at server time `at` */
  position: number;
  at: number;
  rev: number;
  hostPid: string | null;
}

export function currentPosition(s: Pick<MediaState, 'playing' | 'position' | 'at'>, serverNow: number): number {
  return s.playing ? Math.max(0, s.position + (serverNow - s.at) / 1000) : s.position;
}

const VIDEO_EXT = /\.(mp4|webm|ogv|m4v)$/i;
const AUDIO_EXT = /\.(mp3|ogg|oga|wav|m4a|opus|flac|aac)$/i;

export function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
    const [a, b] = h.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  if (h.includes(':')) return h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80') || h === '::';
  return !h.includes('.');
}

export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\.|^m\./, '');
  let id: string | null = null;
  if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v');
    else {
      const m = u.pathname.match(/^\/(embed|shorts|live|v)\/([\w-]{11})/);
      id = m ? m[2] : null;
    }
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

export type SourceResult = { ok: true; source: MediaSource } | { ok: false; error: string };

export function parseMediaSource(
  channel: MediaChannel,
  kind: MediaKind,
  input: string,
  title: string | undefined,
  tapes: Record<string, TapeDef>,
): SourceResult {
  const raw = (input ?? '').trim();
  if (!raw || raw.length > 600) return { ok: false, error: 'Paste a link first.' };
  const t = (title ?? '').trim().slice(0, 80);
  if (kind === 'tape') {
    if (channel !== 'listen') return { ok: false, error: 'Tapes play in the Listening Room.' };
    const tape = tapes[raw];
    return tape ? { ok: true, source: { kind, ref: tape.id, title: `${tape.title} - ${tape.artist}` } } : { ok: false, error: 'That tape is not on the shelf.' };
  }
  if (kind === 'youtube') {
    if (channel !== 'watch') return { ok: false, error: 'YouTube links are for Watch Together.' };
    const id = parseYouTubeId(raw);
    return id ? { ok: true, source: { kind, ref: id, title: t || 'YouTube video' } } : { ok: false, error: 'That does not look like a YouTube link.' };
  }
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { ok: false, error: 'That is not a valid link.' };
  }
  if (u.protocol !== 'https:') return { ok: false, error: 'Links must start with https://.' };
  if (u.username || u.password) return { ok: false, error: 'Links with a login in them are not allowed.' };
  if (isPrivateHost(u.hostname)) return { ok: false, error: 'That address is private and cannot be shared.' };
  if (kind === 'video' && !VIDEO_EXT.test(u.pathname)) return { ok: false, error: 'Use a direct link to an mp4 or webm file.' };
  if (kind === 'audio' && !AUDIO_EXT.test(u.pathname)) return { ok: false, error: 'Use a direct link to an mp3, ogg or wav file.' };
  if (kind !== 'video' && kind !== 'audio') return { ok: false, error: 'Unknown source type.' };
  if (kind === 'video' && channel !== 'watch') return { ok: false, error: 'Video is for Watch Together.' };
  const fallback = decodeURIComponent(u.pathname.split('/').pop() || '').slice(0, 60) || 'Shared file';
  return { ok: true, source: { kind, ref: u.toString(), title: t || fallback } };
}
