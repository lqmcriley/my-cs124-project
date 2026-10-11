// Ratings and reviews: who you can rate after a trip, and how ratings display.
// Pure functions, tested in __tests__/reviews.test.ts.

import type { Trip, TripRider } from './types';

export type RatingSummary = { user_id: string; average: number; count: number };

export const REVIEW_WINDOW_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

// "★ 4.8 (12)", or null if nobody has rated them yet.
export function formatRating(summary: RatingSummary | undefined): string | null {
  if (!summary || summary.count === 0) return null;
  return `★ ${Number(summary.average).toFixed(1)} (${summary.count})`;
}

// Reviews open once the trip has left and stay open for 14 days.
export function canReviewNow(trip: Trip, now: Date = new Date()): boolean {
  if (trip.status === 'cancelled') return false;
  const left = new Date(trip.departure_at).getTime();
  return left <= now.getTime() && now.getTime() - left < REVIEW_WINDOW_DAYS * DAY_MS;
}

export type Reviewable = { id: string; name: string; avatarUrl: string | null; role: 'Driver' | 'Rider' };

// Everyone else who was in the car: the driver and approved riders, minus you.
export function peopleToReview(
  trip: Trip & { driver: { full_name: string; avatar_url: string | null } },
  riders: TripRider[],
  userId: string,
): Reviewable[] {
  const everyone: Reviewable[] = [
    { id: trip.driver_id, name: trip.driver.full_name, avatarUrl: trip.driver.avatar_url, role: 'Driver' },
    ...riders.map((rider) => ({ id: rider.rider_id, name: rider.first_name, avatarUrl: rider.avatar_url, role: 'Rider' as const })),
  ];
  return everyone.filter((person) => person.id !== userId);
}
