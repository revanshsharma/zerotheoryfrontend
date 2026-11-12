import { randomAvatar, type AvatarConfig } from '@channel-green/shared';
import { registry } from './registry';
import { fetchJson } from './net';

/** Everything kept in the browser. Nothing here is personal data: a display name, an avatar and a list of pseudonymous ids you blocked. */
export interface LocalProfile {
  name: string;
  avatar: AvatarConfig;
  blocks: string[];
}

const KEY = 'cg.profile.v1';
const TOKEN = 'cg.token.v1';

export function loadProfile(): LocalProfile | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<LocalProfile>;
    if (typeof p.name !== 'string') return null;
    return { name: p.name, avatar: (p.avatar ?? randomAvatar(registry.avatar)) as AvatarConfig, blocks: Array.isArray(p.blocks) ? p.blocks.filter((b) => typeof b === 'string') : [] };
  } catch {
    return null;
  }
}

export function saveProfile(p: LocalProfile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage may be disabled; the session still works */
  }
}

export async function getToken(fresh = false): Promise<string> {
  if (!fresh) {
    try {
      const t = localStorage.getItem(TOKEN);
      if (t) return t;
    } catch {
      /* ignore */
    }
  }
  const { token } = await fetchJson<{ token: string }>('/auth/guest', { method: 'POST' });
  try {
    localStorage.setItem(TOKEN, token);
  } catch {
    /* ignore */
  }
  return token;
}

export async function saveRemote(p: LocalProfile): Promise<void> {
  try {
    const token = await getToken();
    await fetchJson('/profile', { method: 'PUT', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ name: p.name, avatar: p.avatar }) });
  } catch {
    /* the local copy is the source of truth for guests */
  }
}
