/**
 * Pure helpers for the voice and video panel. No browser, no LiveKit import, so they are easy to test.
 */

/** Inside this distance (world pixels) a voice is at full volume. */
export const PROXIMITY_NEAR = 48;
/** Beyond this distance a voice cannot be heard at all. */
export const PROXIMITY_FAR = 240;

/** Volume from 0 to 1 for someone `distance` pixels away, fading in a straight line. */
export function proximityVolume(distance: number): number {
  if (!Number.isFinite(distance)) return 0;
  if (distance <= PROXIMITY_NEAR) return 1;
  if (distance >= PROXIMITY_FAR) return 0;
  return 1 - (distance - PROXIMITY_NEAR) / (PROXIMITY_FAR - PROXIMITY_NEAR);
}

/**
 * Whether we may receive (hear or see) someone. Blocked and muted players are never received.
 * A player we cannot identify yet is not received either: better silent for a moment than wrong.
 */
export function shouldReceive(uid: string | undefined, blocks: readonly string[], muted: readonly string[]): boolean {
  if (!uid) return false;
  return !blocks.includes(uid) && !muted.includes(uid);
}

export type MediaKindName = 'microphone' | 'camera';
export type MediaFailureCode = 'denied' | 'no-device' | 'in-use' | 'unsupported' | 'unknown';

export interface MediaFailure {
  code: MediaFailureCode;
  message: string;
}

const noun = (k: MediaKindName) => (k === 'microphone' ? 'microphone' : 'camera');

/** Turns whatever the browser or the LiveKit client threw into a calm sentence for the member. */
export function classifyMediaError(err: unknown, kind: MediaKindName): MediaFailure {
  const e = err as { name?: unknown; message?: unknown } | null | undefined;
  const name = typeof e?.name === 'string' ? e.name : '';
  const text = typeof e?.message === 'string' ? e.message : '';
  const n = noun(kind);
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError' || /permission|not allowed|denied/i.test(text)) {
    return { code: 'denied', message: `The ${n} is blocked. Allow it for this site in your browser settings, then try again.` };
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError' || /not found|no .*device|requested device/i.test(text)) {
    return { code: 'no-device', message: `No ${n} was found. Plug one in, then try again.` };
  }
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError' || /in use|could not start|not readable/i.test(text)) {
    return { code: 'in-use', message: `The ${n} could not start. Another app may be using it.` };
  }
  if (name === 'TypeError' || /unsupported|getUserMedia|insecure|secure context/i.test(text)) {
    return { code: 'unsupported', message: `This browser cannot use the ${n} here. A secure (https) page and an up-to-date browser are needed.` };
  }
  return { code: 'unknown', message: `The ${n} could not be turned on. Please try again.` };
}

/** What to say when joining the voice room failed. */
export function connectErrorMessage(err: unknown): string {
  const text = String((err as { message?: unknown } | null)?.message ?? '');
  if (/token|unauthor|401|403|permission|invalid/i.test(text)) return 'Voice would not let you in just now. Please try again in a moment.';
  if (/timeout|timed out|could not establish|websocket|network|fetch|failed to connect|ice/i.test(text)) {
    return 'Could not reach the voice service. Check your connection and try again.';
  }
  return 'Could not connect to voice right now.';
}

/** Numbers match LiveKit's DisconnectReason. An empty string means we ended it ourselves. */
export function disconnectMessage(reason: number | undefined): string {
  switch (reason) {
    case 1:
      return '';
    case 2:
      return 'You joined voice from another tab, so this one was disconnected.';
    case 3:
    case 5:
    case 10:
      return 'The voice room closed. You can join again.';
    case 4:
      return 'You were removed from voice in this room.';
    case 14:
    case 9:
    case 6:
      return 'The voice connection dropped and could not be restored. You can join again.';
    default:
      return 'Voice disconnected. You can join again.';
  }
}

export type PermState = 'granted' | 'denied' | 'prompt' | 'unknown';

export function permissionText(kind: MediaKindName, state: PermState): string {
  const label = kind === 'microphone' ? 'Microphone' : 'Camera';
  switch (state) {
    case 'granted':
      return `${label}: allowed by your browser`;
    case 'denied':
      return `${label}: blocked in your browser settings`;
    case 'prompt':
      return `${label}: your browser will ask when you switch it on`;
    default:
      return `${label}: permission unknown`;
  }
}

export interface Liveness {
  mic: boolean;
  camera: boolean;
}

/** Text for the always-visible "you are live" banner. Empty when nothing of yours is live. */
export function liveBanner(l: Liveness): string {
  if (l.mic && l.camera) return 'Your microphone and camera are live. Others in this room can hear and see you.';
  if (l.mic) return 'Your microphone is live. Others in this room can hear you.';
  if (l.camera) return 'Your camera is live. Others in this room can see you.';
  return '';
}

/** "Ada", "Ada and Bo", "Ada, Bo and Cy". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
