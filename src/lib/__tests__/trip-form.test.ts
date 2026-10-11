import { PICKUP_SPOTS, QUICK_PICKS } from '../config';
import { emptyTripForm, toTripRow, toTripUpdate, tripFormFromTrip, TripFormValues, validateTripForm } from '../trip-form';
import type { Car } from '../types';

const NOW = new Date('2026-10-10T12:00:00');
const car: Car = { id: 'car-1', owner_id: 'me', make: 'Honda', model: 'Civic', color: 'Silver', plate: 'ABC', mpg: 32, seats: 3 };
const indy = QUICK_PICKS.find((pick) => pick.name === 'Indianapolis')!;
const ohare = QUICK_PICKS.find((pick) => pick.name === "O'Hare")!;

const valid: TripFormValues = {
  ...emptyTripForm(car),
  from: PICKUP_SPOTS[0],
  to: indy,
  route: { miles: 151.27, minutes: 152.4, encodedPolyline: 'abc', points: [] },
  departure: new Date('2026-10-11T09:00:00'),
  flexMinutes: 60,
  luggage: 'carry_on',
  notes: '  Leaving from the north entrance  ',
  gasPrice: '3.49',
};

const airportTrip: TripFormValues = {
  ...valid,
  to: ohare,
  flightNumber: ' aa 1234 ',
  flightDepartsAt: new Date('2026-10-11T14:00:00'),
  flightInternational: true,
  parking: 'offsite',
  parkingLocation: ' Hilton Rosemont lot ',
  shuttleMinutes: 20,
};

describe('validateTripForm', () => {
  it('accepts a complete trip', () => {
    expect(validateTripForm(valid, car.seats, NOW)).toEqual({});
    expect(validateTripForm(airportTrip, car.seats, NOW)).toEqual({});
  });

  it('requires places and a time', () => {
    const errors = validateTripForm({ ...valid, from: null, to: null, route: null, departure: null }, car.seats, NOW);
    expect(Object.keys(errors).sort()).toEqual(['departure', 'from', 'to']);
  });

  it('waits for the route once both places are set', () => {
    expect(validateTripForm({ ...valid, route: null }, car.seats, NOW).route).toBeDefined();
  });

  it('rejects a departure in the past', () => {
    expect(validateTripForm({ ...valid, departure: new Date('2026-10-10T11:00:00') }, car.seats, NOW).departure).toBeDefined();
  });

  it('limits seats to the car', () => {
    expect(validateTripForm({ ...valid, seats: 4 }, car.seats, NOW).seats).toBeDefined();
    expect(validateTripForm({ ...valid, seats: 0 }, car.seats, NOW).seats).toBeDefined();
  });

  it.each(['0.5', '11', 'abc', ''])('rejects gas price %j', (gasPrice) => {
    expect(validateTripForm({ ...valid, gasPrice }, car.seats, NOW).gasPrice).toBeDefined();
  });

  it('catches a flight that leaves before the car does', () => {
    const errors = validateTripForm({ ...airportTrip, flightDepartsAt: new Date('2026-10-11T08:00:00') }, car.seats, NOW);
    expect(errors.flightDepartsAt).toBeDefined();
  });

  it('asks where you park when parking off-site', () => {
    expect(validateTripForm({ ...airportTrip, parkingLocation: ' ' }, car.seats, NOW).parkingLocation).toBeDefined();
    expect(validateTripForm({ ...airportTrip, parking: 'terminal', parkingLocation: '' }, car.seats, NOW)).toEqual({});
  });
});

describe('toTripRow', () => {
  it('uses the car MPG and tidies values', () => {
    expect(toTripRow('me', car, valid)).toMatchObject({
      driver_id: 'me',
      car_id: 'car-1',
      origin_name: 'Illini Union',
      dest_name: 'Indianapolis',
      route_miles: 151.3,
      route_minutes: 152,
      pickup_spot: 'Illini Union',
      notes: 'Leaving from the north entrance',
      gas_price: 3.49,
      mpg: 32,
      seats_offered: 3,
      flex_minutes: 60,
      is_airport: false,
      parking: 'terminal',
      shuttle_minutes: 0,
    });
  });

  it('saves flight and parking details for airport trips', () => {
    expect(toTripRow('me', car, airportTrip)).toMatchObject({
      is_airport: true,
      flight_number: 'AA 1234',
      flight_departs_at: new Date('2026-10-11T14:00:00').toISOString(),
      flight_international: true,
      parking: 'offsite',
      parking_location: 'Hilton Rosemont lot',
      shuttle_minutes: 20,
    });
  });

  it('ignores leftover airport fields when the destination is not an airport', () => {
    expect(toTripRow('me', car, { ...airportTrip, to: indy })).toMatchObject({
      is_airport: false,
      flight_number: null,
      parking: 'terminal',
      parking_location: null,
      shuttle_minutes: 0,
    });
  });
});

describe('editing', () => {
  it('round-trips a saved trip and only updates editable columns', () => {
    const row = { id: 't1', status: 'scheduled' as const, seats_booked: 0, late_cancel_count: 0, cancelled_at: null, driver_late_cancel: false, ...toTripRow('me', car, airportTrip) };
    const values = tripFormFromTrip(row);
    expect(validateTripForm(values, car.seats, NOW)).toEqual({});

    const update = toTripUpdate({ ...values, seats: 2 });
    expect(update).toMatchObject({ seats_offered: 2, parking: 'offsite', flight_number: 'AA 1234' });
    expect(update).not.toHaveProperty('gas_price');
    expect(update).not.toHaveProperty('route_miles');
    expect(update).not.toHaveProperty('mpg');
  });
});

describe('long trips', () => {
  const long = { ...valid, route: { miles: 965, minutes: 900, encodedPolyline: 'x', points: [] } };

  it('saves the overnight plan for long drives', () => {
    expect(toTripRow('me', car, { ...long, longTripPlan: 'overnight', overnightStop: ' Youngstown, OH ' })).toMatchObject({
      long_trip_plan: 'overnight',
      overnight_stop: 'Youngstown, OH',
    });
    expect(toTripRow('me', car, { ...long, longTripPlan: 'straight', overnightStop: 'leftover' })).toMatchObject({
      long_trip_plan: 'straight',
      overnight_stop: null,
    });
  });

  it('leaves normal trips without a plan', () => {
    expect(toTripRow('me', car, valid)).toMatchObject({ long_trip_plan: null, overnight_stop: null });
  });
});
