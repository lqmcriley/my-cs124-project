// Turns technical error messages into plain sentences people can act on.
// Messages we wrote ourselves (like "This trip is full.") pass through unchanged.

export const NETWORK_MESSAGE = "Can't reach the internet. Check your connection and try again.";
export const SIGNED_OUT_MESSAGE = 'Your sign-in expired. Please sign out and sign back in.';
export const NOT_SET_UP_MESSAGE = "That part of the app isn't ready yet. Please try again later.";
export const NOT_ALLOWED_MESSAGE = "You don't have permission to do that.";
export const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

const RULES: { match: RegExp; message: string }[] = [
  { match: /network request failed|failed to fetch|fetch failed|network error|timed? ?out|offline/i, message: NETWORK_MESSAGE },
  { match: /jwt|not authenticated|refresh token|session (missing|expired)/i, message: SIGNED_OUT_MESSAGE },
  // A database change hasn't been run yet (a new migration is missing).
  { match: /schema cache|could not find the (function|table)|does not exist/i, message: NOT_SET_UP_MESSAGE },
  { match: /row-level security|permission denied/i, message: NOT_ALLOWED_MESSAGE },
  { match: /duplicate key|already exists/i, message: "That's already saved." },
  { match: /violates check constraint|invalid input syntax/i, message: "Something in that form doesn't look right. Check it and try again." },
  { match: /payload too large|exceeded the maximum allowed size/i, message: 'That photo is too big. Try a smaller one.' },
];

export function friendlyError(error: unknown, fallback = GENERIC_MESSAGE): string {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  if (!raw.trim()) return fallback;
  const rule = RULES.find((candidate) => candidate.match.test(raw));
  if (rule) {
    if (__DEV__) console.warn('[error]', raw); // keep the real message for debugging
    return rule.message;
  }
  return raw;
}
