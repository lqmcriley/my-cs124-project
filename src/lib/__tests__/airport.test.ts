import { suggestedLeaveTime, terminalArrival } from '../airport';

const flight = new Date('2026-10-20T10:00:00');

describe('suggestedLeaveTime', () => {
  it('works back from a domestic flight with terminal drop-off', () => {
    // 10:00 − 2h buffer − 2h30 drive − 30 min traffic = 5:00
    const leave = suggestedLeaveTime({ flightDepartsAt: flight, international: false, driveMinutes: 150, shuttleMinutes: 0 });
    expect(leave).toEqual(new Date('2026-10-20T05:00:00'));
  });

  it('adds an extra hour for international and the shuttle ride', () => {
    // 10:00 − 3h − 20 min shuttle − 2h30 drive − 30 min = 3:40
    const leave = suggestedLeaveTime({ flightDepartsAt: flight, international: true, driveMinutes: 150, shuttleMinutes: 20 });
    expect(leave).toEqual(new Date('2026-10-20T03:40:00'));
  });

  it('rounds down to 5 minutes', () => {
    // 10:00 − 2h − 2h33 − 30 = 4:57 -> 4:55
    const leave = suggestedLeaveTime({ flightDepartsAt: flight, international: false, driveMinutes: 153, shuttleMinutes: 0 });
    expect(leave).toEqual(new Date('2026-10-20T04:55:00'));
  });
});

describe('terminalArrival', () => {
  it('adds the drive and the shuttle', () => {
    const arrival = terminalArrival({ departure: new Date('2026-10-20T05:00:00'), driveMinutes: 150, shuttleMinutes: 20 });
    expect(arrival).toEqual(new Date('2026-10-20T07:50:00'));
  });
});
