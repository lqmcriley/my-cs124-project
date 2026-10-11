import { reliabilitySummary } from '../reliability';

const stats = (completed: number, late_cancels = 0, no_shows = 0) => ({ user_id: 'u', completed, late_cancels, no_shows });

describe('reliabilitySummary', () => {
  it('calls people without trips "New"', () => {
    expect(reliabilitySummary(undefined)).toEqual({ label: 'New', tone: 'neutral' });
    expect(reliabilitySummary(stats(0))).toEqual({ label: 'New', tone: 'neutral' });
  });

  it('shows a perfect record in green', () => {
    expect(reliabilitySummary(stats(1))).toEqual({ label: 'Shows up 1 of 1 trip', tone: 'good' });
    expect(reliabilitySummary(stats(9))).toEqual({ label: 'Shows up 9 of 9 trips', tone: 'good' });
  });

  it('counts late cancels and no-shows against you', () => {
    expect(reliabilitySummary(stats(8, 1, 1))).toEqual({ label: 'Shows up 8 of 10 trips', tone: 'waiting' });
    expect(reliabilitySummary(stats(1, 1, 1))).toEqual({ label: 'Shows up 1 of 3 trips', tone: 'bad' });
  });
});
