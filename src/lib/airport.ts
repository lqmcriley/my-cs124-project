// Airport trip timing: work backwards from a flight to a suggested leave time.
//
//   leave by = flight time − terminal buffer (2 hr domestic / 3 hr international)
//              − shuttle ride (if parking off-site) − drive time − traffic cushion
//
// Rounded down to the nearest 5 minutes. Tests: __tests__/airport.test.ts

import { AIRPORT_ARRIVAL_BUFFER_MINUTES, AIRPORT_TRAFFIC_BUFFER_MINUTES } from './config';

const MINUTE = 60 * 1000;

export type Parking = 'terminal' | 'offsite';

export function suggestedLeaveTime(input: {
  flightDepartsAt: Date;
  international: boolean;
  driveMinutes: number;
  shuttleMinutes: number; // 0 for terminal drop-off
}): Date {
  const buffer = AIRPORT_ARRIVAL_BUFFER_MINUTES[input.international ? 'international' : 'domestic'];
  const totalMinutes = buffer + input.shuttleMinutes + input.driveMinutes + AIRPORT_TRAFFIC_BUFFER_MINUTES;
  const leave = new Date(input.flightDepartsAt.getTime() - totalMinutes * MINUTE);
  leave.setMinutes(Math.floor(leave.getMinutes() / 5) * 5, 0, 0);
  return leave;
}

// When the group should reach the terminal: leave time + drive + shuttle.
export function terminalArrival(input: { departure: Date; driveMinutes: number; shuttleMinutes: number }): Date {
  return new Date(input.departure.getTime() + (input.driveMinutes + input.shuttleMinutes) * MINUTE);
}
