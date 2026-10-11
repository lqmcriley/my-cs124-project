// "Share my trip": a text message for a friend with who you're riding with and
// where you're going. Pure function, tested in __tests__/share.test.ts.

import { formatDeparture } from './format';
import type { TripWithDriver } from './types';

export function directionsLink(trip: Pick<TripWithDriver, 'origin_lat' | 'origin_lng' | 'dest_lat' | 'dest_lng'>): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${trip.origin_lat},${trip.origin_lng}&destination=${trip.dest_lat},${trip.dest_lng}&travelmode=driving`;
}

export function tripShareMessage(trip: TripWithDriver, arrival: Date | null): string {
  const car = trip.car ? `${trip.car.color} ${trip.car.make} ${trip.car.model}, plate ${trip.car.plate}` : 'car details not added';
  const lines = [
    `I'm taking a Hitch Illini carpool.`,
    `${trip.origin_name} → ${trip.dest_name}`,
    `Leaving: ${formatDeparture(new Date(trip.departure_at))}`,
    arrival ? `Should arrive around: ${formatDeparture(arrival)}` : null,
    `Driver: ${trip.driver.full_name}`,
    `Car: ${car}`,
    `Route: ${directionsLink(trip)}`,
  ];
  return lines.filter(Boolean).join('\n');
}
