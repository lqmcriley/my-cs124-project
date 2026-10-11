import { estimatedArrival, isLongTrip, longTripLabel } from '../long-trip';

describe('isLongTrip', () => {
  it('starts after 8 hours of driving', () => {
    expect(isLongTrip(150)).toBe(false); // Chicago
    expect(isLongTrip(480)).toBe(false);
    expect(isLongTrip(900)).toBe(true); // Connecticut
    expect(isLongTrip(null)).toBe(false);
  });
});

describe('estimatedArrival', () => {
  const leave = new Date('2026-12-15T07:00:00');

  it('adds a 20-minute break every 3 hours when going straight through', () => {
    // 15 hours of driving + 5 breaks (100 min) = 16 hr 40 min -> 11:40 PM
    expect(estimatedArrival(leave, 900, 'straight')).toEqual(new Date('2026-12-15T23:40:00'));
  });

  it('adds a night stop for overnight trips', () => {
    // same, plus 10 hours -> next morning 9:40 AM
    expect(estimatedArrival(leave, 900, 'overnight')).toEqual(new Date('2026-12-16T09:40:00'));
  });
});

describe('longTripLabel', () => {
  it('describes the plan', () => {
    expect(longTripLabel('overnight', 'Youngstown, OH')).toBe('2-day trip · overnight near Youngstown, OH');
    expect(longTripLabel('overnight', null)).toBe('2-day trip · overnight');
    expect(longTripLabel('straight', null)).toBe('Long drive · straight through');
    expect(longTripLabel(null, null)).toBeNull();
  });
});
