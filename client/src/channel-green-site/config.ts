// Where the Channel Green live server (realtime) lives. Set at build time, see .env.example.
// If it is empty, the section is honest about it: the world is not connected, and no game starts.
declare const __CG_REALTIME_URL__: string;

export const REALTIME_URL: string = (typeof __CG_REALTIME_URL__ === "string" ? __CG_REALTIME_URL__ : "").trim().replace(/\/+$/, "");
export const realtimeConfigured: boolean = REALTIME_URL.length > 0;

export const BASE = "/channel-green";

/** Channel Green was written for the root of a site. Here it lives under /channel-green. */
export function cgPath(href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  if (href === BASE || href.startsWith(`${BASE}/`)) return href;
  return href === "/" ? BASE : `${BASE}${href}`;
}
