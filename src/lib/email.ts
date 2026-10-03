import { ALLOWED_EMAIL_DOMAIN } from './config';

// "  NetID@Illinois.EDU " -> "netid@illinois.edu"
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

// True only for addresses like "netid@illinois.edu".
// The database checks this too, so a modified app can't get around it.
export function isIllinoisEmail(raw: string): boolean {
  const parts = normalizeEmail(raw).split('@');
  if (parts.length !== 2) return false;

  const [name, domain] = parts;
  return name.length > 0 && !/\s/.test(name) && domain === ALLOWED_EMAIL_DOMAIN;
}
