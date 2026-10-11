// Booking rules the screens use: what a rider would pay, whether they can
// request, and sorting My trips. Pure functions, tested in __tests__/booking.test.ts.
// (The database checks the same rules again when a request is actually made.)

import type { MyTrips } from './booking-api';
import { riderShare } from './pricing';
import type { RequestStatus, Trip, TripRequest } from './types';

// What this rider would pay: now and if the car fills up.
// `alreadyBooked` = this rider is approved, so they're already counted in seats_booked.
export function riderEstimate(trip: Trip, riderMiles: number | null, alreadyBooked = false) {
  const miles = riderMiles ?? trip.route_miles;
  const input = { riderMiles: miles, mpg: trip.mpg, gasPrice: trip.gas_price };
  const riders = alreadyBooked ? trip.seats_booked : trip.seats_booked + 1;
  return {
    miles,
    now: riderShare({ ...input, peopleInCar: riders + 1 }), // riders + driver
    ifFull: riderShare({ ...input, peopleInCar: trip.seats_offered + 1 }),
  };
}

// Why this person can't request a seat right now, or null if they can.
export function requestBlocker(trip: Trip, userId: string, myRequest: TripRequest | null, now: Date = new Date()): string | null {
  if (trip.driver_id === userId) return "This is your trip.";
  if (trip.status === 'cancelled') return 'This trip was cancelled.';
  if (new Date(trip.departure_at).getTime() <= now.getTime()) return 'This trip already left.';
  if (myRequest && (myRequest.status === 'pending' || myRequest.status === 'approved')) return 'You already requested a seat.';
  if (trip.seats_booked >= trip.seats_offered) return 'This trip is full.';
  return null;
}

export const REQUEST_STATUS_TEXT: Record<RequestStatus, string> = {
  pending: 'Waiting for the driver',
  approved: "You're in",
  declined: 'Declined',
  cancelled: 'Cancelled',
};

// Upcoming = scheduled and hasn't left yet. Everything else is past.
export function isUpcoming(trip: Trip, now: Date = new Date()): boolean {
  return trip.status === 'scheduled' && new Date(trip.departure_at).getTime() > now.getTime();
}

export function splitMyTrips(myTrips: MyTrips, now: Date = new Date()) {
  const byTime = <T extends Trip>(a: T, b: T) => new Date(a.departure_at).getTime() - new Date(b.departure_at).getTime();
  const upcomingDriving = myTrips.driving.filter((trip) => isUpcoming(trip, now)).sort(byTime);
  const upcomingRiding = myTrips.riding.filter((request) => isUpcoming(request.trip, now) && request.status !== 'declined');

  return {
    // Requests waiting for your answer, on trips that haven't left.
    needsAnswer: upcomingDriving.filter((trip) => trip.pendingCount > 0),
    upcoming: {
      driving: upcomingDriving,
      riding: upcomingRiding.sort((a, b) => byTime(a.trip, b.trip)),
    },
    past: {
      driving: myTrips.driving.filter((trip) => !isUpcoming(trip, now)).sort((a, b) => byTime(b, a)),
      riding: myTrips.riding
        .filter((request) => !upcomingRiding.includes(request))
        .sort((a, b) => byTime(b.trip, a.trip)),
    },
  };
}
