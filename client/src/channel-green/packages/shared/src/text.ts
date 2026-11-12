/** Text hygiene shared by client (preflight) and server (authoritative). */

// zero-width, bidi override/isolate and BOM characters are never needed in chat and are used for spoofing
const INVISIBLE = /[​-‏‪-‮⁠-⁤⁦-⁩﻿­]/g;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001F\u007F-\u009F]/g;

export function sanitizeText(input: unknown, max: number): string {
  if (typeof input !== 'string') return '';
  let s = input.normalize('NFC').replace(CONTROL, ' ').replace(INVISIBLE, '');
  // limit stacked combining marks ("zalgo") to 2 per base character
  s = s.replace(/(\p{M}{3,})/gu, (m) => m.slice(0, 2));
  s = s.replace(/\s+/g, ' ').trim();
  const chars = Array.from(s);
  return chars.length > max ? chars.slice(0, max).join('').trim() : s;
}

export const NAME_MIN = 2;
export const NAME_MAX = 20;

/** Usernames: letters, numbers, spaces and . _ - ' only. Returns null when nothing usable remains. */
export function sanitizeName(input: unknown): string | null {
  const cleaned = sanitizeText(input, 40).replace(/[^\p{L}\p{N} ._'-]/gu, '').replace(/\s+/g, ' ').trim();
  const name = Array.from(cleaned).slice(0, NAME_MAX).join('').trim();
  return Array.from(name).length >= NAME_MIN ? name : null;
}

/** Light-weight detection of the things that make chat spammy. */
export function spamScore(text: string): number {
  let score = 0;
  const links = (text.match(/https?:\/\/|www\./gi) ?? []).length;
  score += links * 2;
  if (/(.)\1{9,}/u.test(text)) score += 2; // aaaaaaaaaa
  const letters = text.replace(/[^\p{L}]/gu, '');
  if (letters.length >= 12 && letters === letters.toUpperCase() && letters !== letters.toLowerCase()) score += 1;
  return score;
}

export function normalizeForFilter(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[@4]/g, 'a')
    .replace(/[3]/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[$5]/g, 's')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Returns true when the text contains any blocked term as a whole word (or, for long terms, as a substring). */
export function matchesBlocklist(text: string, terms: readonly string[]): boolean {
  const norm = ` ${normalizeForFilter(text)} `;
  const squashed = norm.replace(/ /g, '');
  return terms.some((t) => {
    const term = normalizeForFilter(t);
    if (!term) return false;
    if (norm.includes(` ${term} `)) return true;
    return term.length >= 6 && squashed.includes(term.replace(/ /g, ''));
  });
}
