// Ride style: up to 4 optional tags on your profile, like "Quiet ride" or
// "Snack stops", shown on your trips so people can find a good match.
// Same list as the ride_tags check in supabase/migrations/*_ride_tags.sql.

export const RIDE_TAGS = [
  { value: 'quiet', label: 'Quiet ride' },
  { value: 'chatty', label: 'Down to chat' },
  { value: 'music', label: 'Music on' },
  { value: 'podcasts', label: 'Podcasts' },
  { value: 'snacks', label: 'Snack stops' },
  { value: 'early_bird', label: 'Early bird' },
  { value: 'night_owl', label: 'Night owl' },
  { value: 'pet_friendly', label: 'Pet friendly' },
] as const;

export type RideTag = (typeof RIDE_TAGS)[number]['value'];

export const MAX_RIDE_TAGS = 4;

// Picking one of these un-picks the other.
const OPPOSITES: Partial<Record<RideTag, RideTag>> = {
  quiet: 'chatty',
  chatty: 'quiet',
  early_bird: 'night_owl',
  night_owl: 'early_bird',
};

export function rideTagLabel(tag: string): string {
  return RIDE_TAGS.find((option) => option.value === tag)?.label ?? tag;
}

// Labels in the list's order, e.g. ["Quiet ride", "Snack stops"].
export function rideTagLabels(tags: readonly string[] | null | undefined): string[] {
  return RIDE_TAGS.filter((option) => tags?.includes(option.value)).map((option) => option.label);
}

// Tap a tag: picks it (dropping its opposite) or un-picks it. Returns null
// when you already have the maximum, so the screen can say so.
export function toggleRideTag(tags: readonly RideTag[], tag: RideTag): RideTag[] | null {
  if (tags.includes(tag)) return tags.filter((existing) => existing !== tag);
  const withoutOpposite = tags.filter((existing) => existing !== OPPOSITES[tag]);
  if (withoutOpposite.length >= MAX_RIDE_TAGS) return null;
  return RIDE_TAGS.map((option) => option.value).filter((value) => value === tag || withoutOpposite.includes(value));
}
