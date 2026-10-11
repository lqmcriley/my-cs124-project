import { carColorHex } from '../car-color';

describe('carColorHex', () => {
  it('understands common colors, ignoring capitals', () => {
    expect(carColorHex('Silver')).toBe('#B9BEC6');
    expect(carColorHex('RED')).toBe('#C8102E');
    expect(carColorHex('grey')).toBe(carColorHex('gray'));
  });

  it('uses the color word in longer descriptions', () => {
    expect(carColorHex('Metallic blue')).toBe('#2563C9');
  });

  it('darkens and lightens', () => {
    expect(carColorHex('dark blue')).not.toBe(carColorHex('blue'));
    expect(carColorHex('light blue')).not.toBe(carColorHex('blue'));
    expect(carColorHex('dark blue')).toBe('#184083');
  });

  it('falls back to gray for unknown or missing colors', () => {
    expect(carColorHex('sparkly unicorn')).toBe('#9AA3AE');
    expect(carColorHex('')).toBe('#9AA3AE');
    expect(carColorHex(null)).toBe('#9AA3AE');
  });
});
