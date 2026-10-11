// Rules for the "Post a trip" and "Edit trip" forms, kept separate from the screens so they're easy to test.

import type { Parking } from './airport';
import { DEFAULT_GAS_PRICE, MAX_GAS_PRICE, MIN_GAS_PRICE, Place, TRIP_NOTES_MAX_LENGTH } from './config';
import type { Route } from './maps';
import type { Car, Luggage, Trip } from './types';

export type TripFormValues = {
  from: Place | null; // the pickup spot
  to: Place | null;
  route: Route | null;
  departure: Date | null;
  flexMinutes: number;
  seats: number;
  luggage: Luggage;
  notes: string;
  gasPrice: string; // text while typing
  // Airport trips (only used when `to` is an airport)
  flightNumber: string;
  flightDepartsAt: Date | null;
  flightInternational: boolean;
  parking: Parking;
  parkingLocation: string;
  shuttleMinutes: number;
};

export type TripFormErrors = Partial<Record<keyof TripFormValues, string>>;

export function emptyTripForm(car: Car): TripFormValues {
  return {
    from: null,
    to: null,
    route: null,
    departure: null,
    flexMinutes: 30,
    seats: car.seats,
    luggage: 'backpack',
    notes: '',
    gasPrice: DEFAULT_GAS_PRICE.toFixed(2),
    flightNumber: '',
    flightDepartsAt: null,
    flightInternational: false,
    parking: 'terminal',
    parkingLocation: '',
    shuttleMinutes: 20,
  };
}

// Fill the form from a saved trip, for editing.
export function tripFormFromTrip(trip: Trip): TripFormValues {
  return {
    from: { name: trip.origin_name, address: trip.origin_address, latitude: trip.origin_lat, longitude: trip.origin_lng },
    to: {
      name: trip.dest_name,
      address: trip.dest_address,
      latitude: trip.dest_lat,
      longitude: trip.dest_lng,
      isAirport: trip.is_airport,
    },
    route: { miles: trip.route_miles, minutes: trip.route_minutes ?? 0, encodedPolyline: trip.route_polyline ?? '', points: [] },
    departure: new Date(trip.departure_at),
    flexMinutes: trip.flex_minutes,
    seats: trip.seats_offered,
    luggage: trip.luggage,
    notes: trip.notes ?? '',
    gasPrice: trip.gas_price.toFixed(2),
    flightNumber: trip.flight_number ?? '',
    flightDepartsAt: trip.flight_departs_at ? new Date(trip.flight_departs_at) : null,
    flightInternational: trip.flight_international,
    parking: trip.parking,
    parkingLocation: trip.parking_location ?? '',
    shuttleMinutes: trip.parking === 'offsite' ? trip.shuttle_minutes : 20,
  };
}

// maxSeats is the car's seat count.
export function validateTripForm(values: TripFormValues, maxSeats: number, now: Date = new Date()): TripFormErrors {
  const errors: TripFormErrors = {};

  if (!values.from) errors.from = 'Choose a pickup spot.';
  if (!values.to) errors.to = 'Choose where you are going.';
  if (values.from && values.to && !values.route) errors.route = 'Waiting for the route. Check both places.';

  if (!values.departure) errors.departure = 'Pick a date and time.';
  else if (values.departure.getTime() <= now.getTime()) errors.departure = 'Departure must be in the future.';

  if (!Number.isInteger(values.seats) || values.seats < 1 || values.seats > maxSeats) {
    errors.seats = `Offer 1–${maxSeats} seats.`;
  }

  const gasPrice = Number(values.gasPrice);
  if (!values.gasPrice.trim() || !Number.isFinite(gasPrice) || gasPrice < MIN_GAS_PRICE || gasPrice > MAX_GAS_PRICE) {
    errors.gasPrice = `Enter a gas price between $${MIN_GAS_PRICE} and $${MAX_GAS_PRICE}.`;
  }

  if (values.notes.length > TRIP_NOTES_MAX_LENGTH) errors.notes = `Keep notes under ${TRIP_NOTES_MAX_LENGTH} characters.`;

  if (values.to?.isAirport) {
    if (values.flightNumber.trim().length > 10) errors.flightNumber = 'Flight numbers are 10 characters or fewer.';
    if (values.flightDepartsAt && values.departure && values.flightDepartsAt.getTime() <= values.departure.getTime()) {
      errors.flightDepartsAt = 'Your flight is before you leave. Check the times.';
    }
    if (values.parking === 'offsite' && !values.parkingLocation.trim()) {
      errors.parkingLocation = 'Say where you are parking, e.g. "Hilton Rosemont lot".';
    }
  }

  return errors;
}

// The airport columns. Non-airport trips get the defaults.
function airportColumns(values: TripFormValues) {
  const isAirport = values.to?.isAirport === true;
  const offsite = isAirport && values.parking === 'offsite';
  return {
    is_airport: isAirport,
    flight_number: isAirport ? values.flightNumber.trim().toUpperCase() || null : null,
    flight_departs_at: isAirport && values.flightDepartsAt ? values.flightDepartsAt.toISOString() : null,
    flight_international: isAirport && values.flightInternational,
    parking: offsite ? ('offsite' as const) : ('terminal' as const),
    parking_location: offsite ? values.parkingLocation.trim() : null,
    shuttle_minutes: offsite ? values.shuttleMinutes : 0,
  };
}

// Turn a valid form into a new row for the trips table. MPG always comes from the car.
export function toTripRow(driverId: string, car: Car, values: TripFormValues) {
  const { from, to, route, departure } = values;
  if (!from || !to || !route || !departure) throw new Error('Form is not complete');

  return {
    driver_id: driverId,
    car_id: car.id,
    origin_name: from.name,
    origin_address: from.address,
    origin_lat: from.latitude,
    origin_lng: from.longitude,
    dest_name: to.name,
    dest_address: to.address,
    dest_lat: to.latitude,
    dest_lng: to.longitude,
    route_miles: Math.round(route.miles * 10) / 10,
    route_minutes: Math.round(route.minutes),
    route_polyline: route.encodedPolyline,
    departure_at: departure.toISOString(),
    flex_minutes: values.flexMinutes,
    seats_offered: values.seats,
    pickup_spot: from.name,
    luggage: values.luggage,
    notes: values.notes.trim() || null,
    gas_price: Math.round(Number(values.gasPrice) * 100) / 100,
    mpg: car.mpg,
    ...airportColumns(values),
  };
}

// Only the columns a driver may change after posting (the database enforces the same list).
export function toTripUpdate(values: TripFormValues) {
  if (!values.departure) throw new Error('Form is not complete');
  return {
    departure_at: values.departure.toISOString(),
    flex_minutes: values.flexMinutes,
    seats_offered: values.seats,
    luggage: values.luggage,
    notes: values.notes.trim() || null,
    ...airportColumns(values),
  };
}
