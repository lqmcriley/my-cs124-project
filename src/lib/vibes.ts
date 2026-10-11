// "Vibe check": how someone likes a ride, on 5-stop sliders (0–4).
// Shown on profiles, trip pages and requests so riders and drivers can match.
// Add or rename a vibe here (and add its column in a migration).

import type Ionicons from '@expo/vector-icons/Ionicons';

type IconName = keyof typeof Ionicons.glyphMap;

export const VIBES = [
  { key: 'vibe_chat', title: 'Chat', low: 'Quiet ride', high: 'Talk my ear off', lowIcon: 'volume-mute-outline', highIcon: 'chatbubbles-outline' },
  { key: 'vibe_music', title: 'Music', low: 'No music', high: 'Aux cord DJ', lowIcon: 'headset-outline', highIcon: 'musical-notes-outline' },
  { key: 'vibe_temp', title: 'Temperature', low: 'Keep it cold', high: 'Crank the heat', lowIcon: 'snow-outline', highIcon: 'sunny-outline' },
  { key: 'vibe_windows', title: 'Windows', low: 'Windows up', high: 'Windows down', lowIcon: 'contract-outline', highIcon: 'leaf-outline' },
  { key: 'vibe_stops', title: 'Stops', low: 'Straight there', high: 'Snack stops welcome', lowIcon: 'flash-outline', highIcon: 'fast-food-outline' },
] as const satisfies readonly { key: string; title: string; low: string; high: string; lowIcon: IconName; highIcon: IconName }[];

export type VibeKey = (typeof VIBES)[number]['key'];
export type Vibes = Record<VibeKey, number>;

export const VIBE_MAX = 4; // stops are 0, 1, 2, 3, 4
export const DEFAULT_VIBES: Vibes = { vibe_chat: 2, vibe_music: 2, vibe_temp: 2, vibe_windows: 2, vibe_stops: 2 };

// Words for where the slider sits, e.g. "Quiet ride", "Leans quiet ride", "Either way".
export function vibeLabel(vibe: (typeof VIBES)[number], value: number): string {
  if (value <= 0) return vibe.low;
  if (value >= VIBE_MAX) return vibe.high;
  if (value === 1) return `Leans ${vibe.low.toLowerCase()}`;
  if (value === 3) return `Leans ${vibe.high.toLowerCase()}`;
  return 'Either way';
}

// The older two-choice setting, kept in sync for anything that still uses it.
export function chatPreferenceFromVibe(chat: number): 'quiet' | 'talk' {
  return chat <= 1 ? 'quiet' : 'talk';
}

// Read vibes from a profile row. Missing values (older databases) become "Either way".
export function vibesFrom(row: Partial<Record<VibeKey, number | null>> | null | undefined): Vibes {
  return Object.fromEntries(VIBES.map((vibe) => [vibe.key, row?.[vibe.key] ?? DEFAULT_VIBES[vibe.key]])) as Vibes;
}

export function hasVibes(row: Partial<Record<VibeKey, number | null>> | null | undefined): boolean {
  return VIBES.some((vibe) => typeof row?.[vibe.key] === 'number');
}
