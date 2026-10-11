// Payment handles (Venmo, Cash App, PayPal): cleaning up what people type,
// checking it, and building "pay" links. Tests: __tests__/payments.test.ts

export type PaymentMethods = {
  venmo_username: string | null;
  cashapp_cashtag: string | null;
  paypal_username: string | null;
};

// People paste all sorts of things: "@alma-m", "$AlmaM", "venmo.com/u/alma-m", "paypal.me/almam".
// Keep only the username part.
export function cleanHandle(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^(www\.)?(account\.)?(venmo\.com\/(u\/)?|cash\.app\/|paypal\.me\/)/i, '')
    .replace(/^[@$]/, '')
    .replace(/\/.*$/, '');
}

// The same rules the database uses.
export const HANDLE_RULES = {
  venmo: { pattern: /^[A-Za-z0-9_-]{5,30}$/, message: 'Venmo usernames are 5–30 letters, numbers, - or _.' },
  cashapp: { pattern: /^(?=.*[A-Za-z])[A-Za-z0-9]{1,20}$/, message: 'Cashtags are up to 20 letters and numbers.' },
  paypal: { pattern: /^[A-Za-z0-9]{1,20}$/, message: 'PayPal.me names are up to 20 letters and numbers.' },
} as const;

export type PaymentApp = keyof typeof HANDLE_RULES;

export function handleError(app: PaymentApp, value: string): string | undefined {
  if (!value) return undefined; // all handles are optional
  return HANDLE_RULES[app].pattern.test(value) ? undefined : HANDLE_RULES[app].message;
}

// Links that open each app with the amount filled in (used in Phase 4).
export function venmoPayLink(username: string, amount: number, note: string): string {
  const params = `txn=pay&recipients=${encodeURIComponent(username)}&amount=${amount.toFixed(2)}&note=${encodeURIComponent(note)}`;
  return `venmo://paycharge?${params}`;
}

export function venmoWebLink(username: string, amount: number, note: string): string {
  return `https://venmo.com/${encodeURIComponent(username)}?txn=pay&amount=${amount.toFixed(2)}&note=${encodeURIComponent(note)}`;
}

export function cashAppLink(cashtag: string, amount: number): string {
  return `https://cash.app/$${encodeURIComponent(cashtag)}/${amount.toFixed(2)}`;
}

export function payPalLink(username: string, amount: number): string {
  return `https://paypal.me/${encodeURIComponent(username)}/${amount.toFixed(2)}USD`;
}
