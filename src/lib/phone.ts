// Phone numbers: turn what people type into one standard form (+12175550123)
// and show it nicely ((217) 555-0123). Tests: __tests__/phone.test.ts

// Returns "+1XXXXXXXXXX" for US numbers, "+<digits>" for numbers typed with a
// country code, or null if it doesn't look like a phone number.
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+')) return digits.length >= 10 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

export function formatPhone(stored: string): string {
  const match = stored.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : stored;
}
