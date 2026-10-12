// Turning numbers and dates into friendly text.

export function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatMiles(miles: number): string {
  return `${Math.round(miles)} mi`;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

// "Fri, Oct 10 · 9:30 AM"
export function formatDeparture(date: Date): string {
  const day = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatDay(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatFlex(minutes: number): string {
  return minutes < 60 ? `±${minutes} min` : `±${minutes / 60} hr`;
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}

// The one name to show for someone: their nickname if they set one, else their
// first name ("Louis Quinn" who goes by "Quinn" shows as "Quinn").
export function shortName(person: { full_name: string; short_name?: string | null; nickname?: string | null } | null | undefined): string {
  if (!person) return '';
  return person.nickname?.trim() || person.short_name?.trim() || firstName(person.full_name);
}
