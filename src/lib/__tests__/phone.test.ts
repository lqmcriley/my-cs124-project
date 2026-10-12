import { formatPhone, isCompleteUsPhone, normalizePhone } from '../phone';

describe('normalizePhone', () => {
  it.each([
    ['(217) 555-0123', '+12175550123'],
    ['217.555.0123', '+12175550123'],
    ['1-217-555-0123', '+12175550123'],
    ['+44 20 7946 0958', '+442079460958'],
  ])('%j -> %j', (raw, expected) => {
    expect(normalizePhone(raw)).toBe(expected);
  });

  it.each(['', 'call me', '555-0123', '+12'])('rejects %j', (raw) => {
    expect(normalizePhone(raw)).toBeNull();
  });
});

describe('formatPhone', () => {
  it('shows US numbers the usual way', () => {
    expect(formatPhone('+12175550123')).toBe('(217) 555-0123');
    expect(formatPhone('+442079460958')).toBe('+442079460958');
  });
});

describe('isCompleteUsPhone', () => {
  it('is complete at 10 digits, however it is typed', () => {
    expect(isCompleteUsPhone('2175550123')).toBe(true);
    expect(isCompleteUsPhone('(217) 555-0123')).toBe(true);
    expect(isCompleteUsPhone('217555012')).toBe(false);
  });

  it('waits for 11 digits when the number starts with 1', () => {
    expect(isCompleteUsPhone('1217555012')).toBe(false);
    expect(isCompleteUsPhone('12175550123')).toBe(true);
  });

  it('never auto-completes international numbers', () => {
    expect(isCompleteUsPhone('+442071234567')).toBe(false);
  });
});
