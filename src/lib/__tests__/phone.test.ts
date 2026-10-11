import { formatPhone, normalizePhone } from '../phone';

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
