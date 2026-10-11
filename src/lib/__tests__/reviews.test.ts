import { canReviewNow, formatRating, peopleToReview } from '../reviews';
import type { TripWithDriver } from '../types';

const NOW = new Date('2026-10-20T12:00:00');
const trip = (departure: string, extra: Partial<TripWithDriver> = {}) =>
  ({
    driver_id: 'driver',
    departure_at: new Date(departure).toISOString(),
    status: 'scheduled',
    driver: { full_name: 'Alma Mater', avatar_url: null },
    ...extra,
  }) as TripWithDriver;

describe('formatRating', () => {
  it('shows average and count, or nothing for unrated people', () => {
    expect(formatRating({ user_id: 'u', average: 4.83, count: 12 })).toBe('★ 4.8 (12)');
    expect(formatRating({ user_id: 'u', average: 5, count: 1 })).toBe('★ 5.0 (1)');
    expect(formatRating(undefined)).toBeNull();
  });
});

describe('canReviewNow', () => {
  it('opens after departure for 14 days', () => {
    expect(canReviewNow(trip('2026-10-21T09:00:00'), NOW)).toBe(false); // not left yet
    expect(canReviewNow(trip('2026-10-20T09:00:00'), NOW)).toBe(true);
    expect(canReviewNow(trip('2026-10-01T09:00:00'), NOW)).toBe(false); // too long ago
    expect(canReviewNow(trip('2026-10-20T09:00:00', { status: 'cancelled' }), NOW)).toBe(false);
  });
});

describe('peopleToReview', () => {
  const riders = [
    { rider_id: 'me', first_name: 'Me', avatar_url: null },
    { rider_id: 'red', first_name: 'Red', avatar_url: null },
  ];

  it('lists everyone else in the car', () => {
    expect(peopleToReview(trip('2026-10-20T09:00:00'), riders, 'me').map((p) => [p.id, p.role])).toEqual([
      ['driver', 'Driver'],
      ['red', 'Rider'],
    ]);
  });

  it('lets the driver review their riders', () => {
    expect(peopleToReview(trip('2026-10-20T09:00:00'), riders, 'driver').map((p) => p.id)).toEqual(['me', 'red']);
  });
});
