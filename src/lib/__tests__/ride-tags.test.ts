import { rideTagLabels, toggleRideTag } from '../ride-tags';

describe('ride style tags', () => {
  it('picks and un-picks tags, kept in list order', () => {
    expect(toggleRideTag(['snacks'], 'quiet')).toEqual(['quiet', 'snacks']);
    expect(toggleRideTag(['quiet', 'snacks'], 'quiet')).toEqual(['snacks']);
  });

  it('swaps out the opposite tag', () => {
    expect(toggleRideTag(['quiet', 'music'], 'chatty')).toEqual(['chatty', 'music']);
    expect(toggleRideTag(['early_bird'], 'night_owl')).toEqual(['night_owl']);
  });

  it('stops at 4 tags', () => {
    expect(toggleRideTag(['quiet', 'music', 'snacks', 'early_bird'], 'podcasts')).toBeNull();
    // Swapping an opposite is fine even when full.
    expect(toggleRideTag(['quiet', 'music', 'snacks', 'early_bird'], 'chatty')).toEqual(['chatty', 'music', 'snacks', 'early_bird']);
  });

  it('shows labels', () => {
    expect(rideTagLabels(['snacks', 'quiet'])).toEqual(['Quiet ride', 'Snack stops']);
    expect(rideTagLabels(null)).toEqual([]);
  });
});
