import { PICKUP_SPOTS, QUICK_PICKS } from '../config';
import { filterTrips } from '../trip-search';
import type { Trip } from '../types';

const NOW = new Date('2026-10-10T12:00:00');
const union = PICKUP_SPOTS[0];
const ohare = QUICK_PICKS.find((pick) => pick.name === "O'Hare")!;
const indy = QUICK_PICKS.find((pick) => pick.name === 'Indianapolis')!;

function trip(id: string, to: { latitude: number; longitude: number }, departure: string, extra: Partial<Trip> = {}): Trip {
  return {
    id,
    driver_id: 'd',
    car_id: 'c',
    origin_name: union.name,
    origin_address: union.address,
    origin_lat: union.latitude,
    origin_lng: union.longitude,
    dest_name: id,
    dest_address: '',
    dest_lat: to.latitude,
    dest_lng: to.longitude,
    route_miles: 150,
    route_minutes: 150,
    route_polyline: null,
    departure_at: new Date(departure).toISOString(),
    flex_minutes: 30,
    seats_offered: 3,
    pickup_spot: union.name,
    luggage: 'backpack',
    notes: null,
    gas_price: 3.49,
    mpg: 30,
    status: 'scheduled',
    is_airport: false,
    flight_number: null,
    flight_departs_at: null,
    flight_international: false,
    parking: 'terminal',
    parking_location: null,
    shuttle_minutes: 0,
    seats_booked: 0,
    late_cancel_count: 0,
    cancelled_at: null,
    driver_late_cancel: false,
    ...extra,
  };
}

const trips = [
  trip('indy-sat', indy, '2026-10-11T09:00:00'),
  trip('ohare-fri', ohare, '2026-10-10T18:00:00'),
  trip('ohare-sun', ohare, '2026-10-12T08:00:00'),
  trip('ohare-past', ohare, '2026-10-09T08:00:00'),
  trip('ohare-cancelled', ohare, '2026-10-13T08:00:00', { status: 'cancelled' }),
  trip('downtown-oharish', { latitude: 41.99, longitude: -87.9 }, '2026-10-14T08:00:00'),
];

const ids = (list: Trip[]) => list.map((t) => t.id);

describe('filterTrips', () => {
  it('shows upcoming scheduled trips, soonest first', () => {
    expect(ids(filterTrips(trips, { from: null, to: null, date: null }, NOW))).toEqual([
      'ohare-fri',
      'indy-sat',
      'ohare-sun',
      'downtown-oharish',
    ]);
  });

  it('filters by destination area', () => {
    expect(ids(filterTrips(trips, { from: null, to: ohare, date: null }, NOW))).toEqual([
      'ohare-fri',
      'ohare-sun',
      'downtown-oharish',
    ]);
  });

  it('filters by day', () => {
    expect(ids(filterTrips(trips, { from: null, to: null, date: new Date('2026-10-12T00:00:00') }, NOW))).toEqual([
      'ohare-sun',
    ]);
  });

  it('hides full trips', () => {
    const full = trip('full', ohare, '2026-10-11T08:00:00', { seats_offered: 2, seats_booked: 2 });
    expect(ids(filterTrips([full], { from: null, to: null, date: null }, NOW))).toEqual([]);
  });

  it('filters by start area', () => {
    const farAway = { latitude: 41.0, longitude: -85.0 };
    expect(filterTrips(trips, { from: farAway, to: null, date: null }, NOW)).toEqual([]);
    expect(filterTrips(trips, { from: union, to: null, date: null }, NOW)).toHaveLength(4);
  });
});
