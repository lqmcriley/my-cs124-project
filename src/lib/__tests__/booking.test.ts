import { requestBlocker, riderEstimate, splitMyTrips } from '../booking';
import type { RequestWithTrip, TripRequest, TripWithDriver } from '../types';

const NOW = new Date('2026-10-10T12:00:00');

function trip(id: string, departure: string, extra: Partial<TripWithDriver> = {}): TripWithDriver {
  return {
    id,
    driver_id: 'driver',
    car_id: 'car',
    origin_name: 'Illini Union',
    origin_address: '',
    origin_lat: 40.1,
    origin_lng: -88.2,
    dest_name: "O'Hare",
    dest_address: '',
    dest_lat: 41.98,
    dest_lng: -87.9,
    route_miles: 150,
    route_minutes: 150,
    route_polyline: null,
    departure_at: new Date(departure).toISOString(),
    flex_minutes: 30,
    seats_offered: 3,
    seats_booked: 0,
    pickup_spot: 'Illini Union',
    luggage: 'backpack',
    notes: null,
    gas_price: 3.49,
    mpg: 30,
    status: 'scheduled',
    is_airport: true,
    flight_number: null,
    flight_departs_at: null,
    flight_international: false,
    parking: 'terminal',
    parking_location: null,
    shuttle_minutes: 0,
    driver: { id: 'driver', full_name: 'Alma Mater', avatar_url: null, year: null, major: null, bio: null, chat_preference: 'talk' },
    car: null,
    ...extra,
  };
}

function request(id: string, t: TripWithDriver, status: TripRequest['status']): RequestWithTrip {
  return {
    id,
    trip_id: t.id,
    rider_id: 'me',
    status,
    rider_miles: null,
    dropoff_name: null,
    dropoff_address: null,
    message: null,
    parking_acknowledged: false,
    decided_at: null,
    created_at: NOW.toISOString(),
    trip: t,
  };
}

describe('riderEstimate', () => {
  it('prices an empty car for 2 people and a full car for 4', () => {
    // $17.45 of gas: ÷2 = 8.72, ÷4 = 4.36
    expect(riderEstimate(trip('t', '2026-10-11T09:00:00'), null)).toEqual({ miles: 150, now: 8.72, ifFull: 4.36 });
  });

  it('gets cheaper once others are booked', () => {
    expect(riderEstimate(trip('t', '2026-10-11T09:00:00', { seats_booked: 1 }), null).now).toBe(5.81);
  });

  it("doesn't count an approved rider twice", () => {
    // 1 booked rider (you) + driver = 2 people
    expect(riderEstimate(trip('t', '2026-10-11T09:00:00', { seats_booked: 1 }), null, true).now).toBe(8.72);
  });

  it('charges partial riders for their miles only', () => {
    expect(riderEstimate(trip('t', '2026-10-11T09:00:00'), 75).now).toBe(4.36);
  });
});

describe('requestBlocker', () => {
  const open = trip('t', '2026-10-11T09:00:00');

  it('lets a rider request an open trip', () => {
    expect(requestBlocker(open, 'me', null, NOW)).toBeNull();
  });

  it('blocks the driver, full, cancelled and past trips', () => {
    expect(requestBlocker(open, 'driver', null, NOW)).toMatch(/your trip/);
    expect(requestBlocker({ ...open, seats_booked: 3 }, 'me', null, NOW)).toMatch(/full/);
    expect(requestBlocker({ ...open, status: 'cancelled' }, 'me', null, NOW)).toMatch(/cancelled/);
    expect(requestBlocker(trip('t', '2026-10-09T09:00:00'), 'me', null, NOW)).toMatch(/left/);
  });

  it('blocks a second request but allows one after a decline', () => {
    expect(requestBlocker(open, 'me', request('r', open, 'pending'), NOW)).toMatch(/already/);
    expect(requestBlocker(open, 'me', request('r', open, 'declined'), NOW)).toBeNull();
  });
});

describe('splitMyTrips', () => {
  it('sorts trips into upcoming, past and needs-an-answer', () => {
    const soon = { ...trip('soon', '2026-10-11T09:00:00'), pendingCount: 2 };
    const later = { ...trip('later', '2026-10-15T09:00:00'), pendingCount: 0 };
    const old = { ...trip('old', '2026-10-01T09:00:00'), pendingCount: 1 };
    const cancelled = { ...trip('cxl', '2026-10-20T09:00:00', { status: 'cancelled' }), pendingCount: 0 };
    const rideSoon = request('r1', trip('ride-soon', '2026-10-12T09:00:00'), 'approved');
    const rideDeclined = request('r2', trip('ride-declined', '2026-10-13T09:00:00'), 'declined');
    const rideOld = request('r3', trip('ride-old', '2026-10-02T09:00:00'), 'approved');

    const result = splitMyTrips({ driving: [later, old, soon, cancelled], riding: [rideOld, rideDeclined, rideSoon] }, NOW);

    expect(result.needsAnswer.map((t) => t.id)).toEqual(['soon']);
    expect(result.upcoming.driving.map((t) => t.id)).toEqual(['soon', 'later']);
    expect(result.upcoming.riding.map((r) => r.id)).toEqual(['r1']);
    expect(result.past.driving.map((t) => t.id)).toEqual(['cxl', 'old']);
    expect(result.past.riding.map((r) => r.id)).toEqual(['r2', 'r3']);
  });
});
