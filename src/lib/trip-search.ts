// Filtering trips for the "Find a ride" screen. Pure functions, tested in __tests__/trip-search.test.ts.

import { SEARCH_RADIUS_MILES } from './config';
import { distanceMiles, LatLng } from './geo';
import type { Trip } from './types';

export type SearchArea = LatLng & { radiusMiles?: number };

export type TripSearch = {
  from: SearchArea | null;
  to: SearchArea | null;
  date: Date | null; // null = any day
};

function isNear(point: LatLng, area: SearchArea): boolean {
  return distanceMiles(point, area) <= (area.radiusMiles ?? SEARCH_RADIUS_MILES);
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Scheduled trips that haven't left yet and match the search, soonest first.
export function filterTrips<T extends Trip>(trips: T[], search: TripSearch, now: Date = new Date()): T[] {
  return trips
    .filter((trip) => trip.status === 'scheduled' && trip.seats_booked < trip.seats_offered) // hide full trips
    .filter((trip) => new Date(trip.departure_at).getTime() > now.getTime())
    .filter((trip) => !search.date || isSameLocalDay(new Date(trip.departure_at), search.date))
    .filter((trip) => !search.from || isNear({ latitude: trip.origin_lat, longitude: trip.origin_lng }, search.from))
    .filter((trip) => !search.to || isNear({ latitude: trip.dest_lat, longitude: trip.dest_lng }, search.to))
    .sort((a, b) => new Date(a.departure_at).getTime() - new Date(b.departure_at).getTime());
}
