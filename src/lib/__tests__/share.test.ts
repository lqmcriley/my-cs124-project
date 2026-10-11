import { directionsLink, tripShareMessage } from '../share';
import type { TripWithDriver } from '../types';

const trip = {
  origin_name: 'Illini Union',
  dest_name: "O'Hare",
  origin_lat: 40.1,
  origin_lng: -88.2,
  dest_lat: 41.98,
  dest_lng: -87.9,
  departure_at: new Date('2026-10-20T09:00:00').toISOString(),
  driver: { full_name: 'Alma Mater' },
  car: { color: 'Silver', make: 'Honda', model: 'Civic', plate: 'ABC123' },
} as unknown as TripWithDriver;

describe('share my trip', () => {
  it('links to driving directions', () => {
    expect(directionsLink(trip)).toBe('https://www.google.com/maps/dir/?api=1&origin=40.1,-88.2&destination=41.98,-87.9&travelmode=driving');
  });

  it('includes the driver, car, plate and times', () => {
    const message = tripShareMessage(trip, new Date('2026-10-20T11:30:00'));
    expect(message).toContain("Illini Union → O'Hare");
    expect(message).toContain('Driver: Alma Mater');
    expect(message).toContain('Silver Honda Civic, plate ABC123');
    expect(message).toContain('Should arrive around:');
    expect(message).toContain('https://www.google.com/maps/dir/');
  });

  it('skips the arrival line when unknown', () => {
    expect(tripShareMessage(trip, null)).not.toContain('Should arrive');
  });
});
