import { greeting } from '../greeting';

const at = (hour: number) => new Date(2026, 9, 12, hour, 15);

describe('greeting', () => {
  it('puts a comma before the name', () => {
    expect(greeting('Riley', at(14), 0)).toBe('Hi, Riley');
  });

  it('fits the time of day', () => {
    expect(greeting('Riley', at(8), 0.99)).toBe('Good morning, Riley');
    expect(greeting('Riley', at(14), 0.99)).toBe('Good afternoon, Riley');
    expect(greeting('Riley', at(19), 0.99)).toBe('Good evening, Riley');
    expect(greeting('Riley', at(23), 0.5)).toBe('Up late, Riley?');
    expect(greeting('Riley', at(3), 0)).toBe('Up late, Riley?');
  });

  it('never says good morning in the evening', () => {
    for (let pick = 0; pick < 1; pick += 0.05) expect(greeting('Riley', at(19), pick)).not.toMatch(/morning/i);
  });

  it('falls back to "there" without a name', () => {
    expect(greeting('', at(14), 0.4)).toBe('Hey there');
  });
});
