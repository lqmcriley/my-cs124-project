// Filtering trips for the "Find a ride" screen. Pure functions, tested in __tests__/trip-search.test.ts.

import { ALONG_ROUTE_MIN_MILES, ALONG_ROUTE_RADIUS_MILES, Place, SEARCH_RADIUS_MILES } from './config';
import { closestPointOnRoute, decodePolyline, distanceMiles, LatLng, routeLengthMiles } from './geo';
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

// A trip that doesn't end at your destination but passes near it on the way.
export type AlongMatch = {
  distanceMiles: number; // how far your destination is from the route
  riderMiles: number; // roughly how far you'd ride (from the pickup to that point)
};

export type TripMatch<T> = { trip: T; along: AlongMatch | null };

// Route points are decoded once per trip and remembered.
const routeCache = new Map<string, LatLng[]>();
function routePoints(trip: Trip): LatLng[] {
  if (!trip.route_polyline) return [];
  let points = routeCache.get(trip.id);
  if (!points) {
    points = decodePolyline(trip.route_polyline);
    routeCache.set(trip.id, points);
  }
  return points;
}

// Does this trip's route pass near the destination (but not right at the start)?
export function alongTheWay(trip: Trip, destination: LatLng): AlongMatch | null {
  const closest = closestPointOnRoute(routePoints(trip), destination);
  if (!closest || closest.distanceMiles > ALONG_ROUTE_RADIUS_MILES) return null;
  // The simplified route line is a bit shorter than the real road distance,
  // so use the fraction of the way along and apply it to the trip's road miles.
  const fraction = closest.alongMiles / (routeLengthMiles(routePoints(trip)) || 1);
  const riderMiles = Math.min(trip.route_miles, fraction * trip.route_miles);
  if (riderMiles < ALONG_ROUTE_MIN_MILES) return null;
  return { distanceMiles: closest.distanceMiles, riderMiles: Math.round(riderMiles * 10) / 10 };
}

// Like filterTrips, but when you search a destination it also includes trips
// that pass near it on the way somewhere farther. Trips ending at your
// destination come first; "along the way" trips follow, each soonest first.
export function searchTrips<T extends Trip>(trips: T[], search: TripSearch, now: Date = new Date()): TripMatch<T>[] {
  const direct = filterTrips(trips, search, now).map((trip) => ({ trip, along: null }));
  if (!search.to) return direct;

  const directIds = new Set(direct.map((match) => match.trip.id));
  const along = filterTrips(trips, { ...search, to: null }, now)
    .filter((trip) => !directIds.has(trip.id))
    .map((trip) => ({ trip, along: alongTheWay(trip, search.to!) }))
    .filter((match): match is TripMatch<T> & { along: AlongMatch } => match.along !== null);

  return [...direct, ...along];
}

// Passing your stop between screens (search → trip page → request) in the link.
export type StopParams = { stopName?: string; stopAddress?: string; stopLat?: string; stopLng?: string };

export function stopToParams(stop: Place): StopParams {
  return { stopName: stop.name, stopAddress: stop.address, stopLat: String(stop.latitude), stopLng: String(stop.longitude) };
}

export function stopFromParams(params: StopParams): Place | null {
  const latitude = Number(params.stopLat);
  const longitude = Number(params.stopLng);
  if (!params.stopName || !Number.isFinite(latitude) || !Number.isFinite(longitude) || params.stopLat === undefined) return null;
  return { name: params.stopName, address: params.stopAddress ?? '', latitude, longitude };
}
