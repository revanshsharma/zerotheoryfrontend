import { io, type Socket } from 'socket.io-client';
import type { ClientToServer, ServerToClient } from '@channel-green/shared';

export type Net = Socket<ServerToClient, ClientToServer>;

export function realtimeUrl(): string {
  const env = process.env.NEXT_PUBLIC_REALTIME_URL;
  if (env) return env.replace(/\/+$/, '');
  if (typeof window !== 'undefined') return `${window.location.protocol}//${window.location.hostname}:4001`;
  return 'http://localhost:4001';
}

export function connectNet(): Net {
  return io(realtimeUrl(), { transports: ['websocket', 'polling'], reconnection: true, reconnectionDelay: 800, reconnectionDelayMax: 5000, autoConnect: true }) as Net;
}

/** Promise wrapper over the ack-style protocol. Rejects with a human message. */
export function call<T = object>(net: Net, event: string, data?: unknown, timeoutMs = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('The server took too long to answer.')), timeoutMs);
    const done = (res: { ok: boolean; error?: string } & T) => {
      clearTimeout(t);
      if (res && res.ok) resolve(res);
      else reject(new Error(res?.error || 'Something went wrong.'));
    };
    const anyNet = net as unknown as { emit: (...a: unknown[]) => void };
    if (data === undefined) anyNet.emit(event, done);
    else anyNet.emit(event, data, done);
  });
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(realtimeUrl() + path, init);
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error || `Request failed (${res.status})`);
  return (await res.json()) as T;
}
