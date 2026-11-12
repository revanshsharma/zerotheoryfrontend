/** Decisions for the join flow when the server turns a saved token away. Kept free of browser code so it can be tested. */

export const GUEST_SIGN_IN_FAILED = "Couldn't sign you in as a guest. Is the realtime server running?";

/** True when the server said the sign-in token was not accepted ("auth" from older servers, or a message about the token or signing in). */
export function isAuthFailure(message: string): boolean {
  return /^\s*auth\s*$|token|sign/i.test(message);
}

/** Guest tokens carry `kind: "guest"` and a `guest:` subject. Anything else (for example a Supabase user token) is a real account. */
export function isGuestToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const part = token.split('.')[1];
  if (!part) return false;
  try {
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = typeof atob === 'function' ? atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)) : Buffer.from(b64, 'base64').toString('utf8');
    const p = JSON.parse(json) as { kind?: unknown; sub?: unknown };
    return p.kind === 'guest' && typeof p.sub === 'string' && p.sub.startsWith('guest:');
  } catch {
    return false;
  }
}

/** Retry once with a brand new guest token, but never turn a signed-in account into a guest. */
export function shouldRemintGuest(message: string, token: string | null | undefined, alreadyRetried: boolean): boolean {
  return !alreadyRetried && isAuthFailure(message) && isGuestToken(token);
}

/** What to show the player when the join finally fails. */
export function joinErrorMessage(message: string, wasGuest: boolean): string {
  if (isAuthFailure(message)) return wasGuest ? GUEST_SIGN_IN_FAILED : 'Could not sign you in. Please sign in again.';
  return message;
}
