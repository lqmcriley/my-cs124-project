// Long trips (8+ hours of driving): straight through or an overnight stop.
// Everyone books and pays for their own room; that's never part of the gas split.
// Pure functions, tested in __tests__/long-trip.test.ts.

import { BREAK_EVERY_MINUTES, BREAK_MINUTES, LONG_TRIP_MINUTES, OVERNIGHT_STOP_HOURS } from './config';

export type LongTripPlan = 'straight' | 'overnight';

export function isLongTrip(driveMinutes: number | null | undefined): boolean {
  return (driveMinutes ?? 0) > LONG_TRIP_MINUTES;
}

// When you'd arrive: the drive, plus short breaks, plus a night's stop if overnight.
export function estimatedArrival(departure: Date, driveMinutes: number, plan: LongTripPlan | null): Date {
  const breaks = Math.floor(driveMinutes / BREAK_EVERY_MINUTES) * BREAK_MINUTES;
  const overnight = plan === 'overnight' ? OVERNIGHT_STOP_HOURS * 60 : 0;
  return new Date(departure.getTime() + (driveMinutes + breaks + overnight) * 60 * 1000);
}

// "2-day trip · overnight near Youngstown, OH" or "Long drive · straight through".
export function longTripLabel(plan: LongTripPlan | null, stop: string | null): string | null {
  if (plan === 'overnight') return `2-day trip · overnight${stop ? ` near ${stop}` : ''}`;
  if (plan === 'straight') return 'Long drive · straight through';
  return null;
}

export const ROOM_RULE =
  "Everyone books and pays for their own room. Hotel costs aren't part of the gas split. Sort out the details in the group chat.";
