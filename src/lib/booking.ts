// Booking rules the screens use: what a rider would pay, whether they can
// request, and sorting My trips. Pure functions, tested in __tests__/booking.test.ts.
// (The database checks the same rules again when a request is actually made.)

import type { MyTrips } from './booking-api';
import { RideLeg, riderShare, splitGasByRide } from './pricing';
import type { RequestStatus, Trip, TripRequest } from './types';

// Riders who split the gas: everyone approved, plus anyone who cancelled
// within 24 hours (they still owe, so the others don't pay more).
export function payingRiders(trip: Trip): number {
  return trip.seats_booked + (trip.late_cancel_count ?? 0); // ?? 0: older databases without this column
}

const DAY_MS = 24 * 60 * 60 * 1000;

// True if it's less than 24 hours before the trip leaves (cancelling now is "late").
export function isWithin24Hours(trip: Trip, now: Date = new Date()): boolean {
  return new Date(trip.departure_at).getTime() - now.getTime() < DAY_MS;
}

// Did the driver move the trip a lot after this rider was approved? Then the
// rider can drop out for free (the database checks the same thing).
export function movedAfterApproval(trip: Trip, request: TripRequest | null): boolean {
  if (!request || request.status !== 'approved' || !trip.departure_moved_at) return false;
  return new Date(trip.departure_moved_at).getTime() > new Date(request.decided_at ?? request.created_at).getTime();
}

// What this rider would pay: now and if the car fills up.
// `alreadyBooked` = this rider is approved, so they're already counted in seats_booked.
export function riderEstimate(trip: Trip, riderMiles: number | null, alreadyBooked = false) {
  const miles = riderMiles ?? trip.route_miles;
  const input = { riderMiles: miles, mpg: trip.mpg, gasPrice: trip.gas_price };
  const riders = alreadyBooked ? payingRiders(trip) : payingRiders(trip) + 1;
  return {
    miles,
    now: riderShare({ ...input, peopleInCar: riders + 1 }), // riders + driver
    ifFull: riderShare({ ...input, peopleInCar: trip.seats_offered + 1 }),
  };
}

// Why this person can't request a seat right now, or null if they can.
export function requestBlocker(trip: Trip, userId: string, myRequest: TripRequest | null, now: Date = new Date()): string | null {
  if (trip.driver_id === userId) return "This is your trip.";
  if (trip.is_sample) return "This is a sample trip to show how Hitch Illini works, so you can't request a seat.";
  if (trip.status === 'cancelled') return 'This trip was cancelled.';
  if (new Date(trip.departure_at).getTime() <= now.getTime()) return 'This trip already left.';
  if (myRequest && (myRequest.status === 'pending' || myRequest.status === 'approved')) return 'You already requested a seat.';
  if (trip.seats_booked >= trip.seats_offered) return 'This trip is full.';
  return null;
}

// What each paying rider owes once the trip has left. Everyone who pays a share
// (approved riders and late cancellers) is a "leg": an id plus how far they ride
// (null = the whole way). Each stretch of road is split between whoever is in the
// car for it, so getting off early costs less and nobody covers anyone else.
export function fairSplit(trip: Trip, legs: RideLeg[]) {
  return splitGasByRide({ routeMiles: trip.route_miles, mpg: trip.mpg, gasPrice: trip.gas_price, riders: legs });
}

// The note that goes with a payment, e.g. "Hitch Illini gas: Illini Union → O'Hare, Sun, Oct 18".
export function paymentNote(trip: Trip): string {
  const day = new Date(trip.departure_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return `Hitch Illini gas: ${trip.origin_name} → ${trip.dest_name}, ${day}`;
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
