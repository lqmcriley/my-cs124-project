import { closestPointOnRoute, decodePolyline, distanceMiles } from '../geo';

describe('distanceMiles', () => {
  it('measures campus to the Chicago Loop (~127 miles straight-line)', () => {
    const miles = distanceMiles({ latitude: 40.1092, longitude: -88.2272 }, { latitude: 41.8783, longitude: -87.6244 });
    expect(miles).toBeGreaterThan(120);
    expect(miles).toBeLessThan(130);
  });

  it('is zero for the same point', () => {
    expect(distanceMiles({ latitude: 40, longitude: -88 }, { latitude: 40, longitude: -88 })).toBe(0);
  });
});

describe('decodePolyline', () => {
  it("decodes Google's documented example", () => {
    expect(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual([
      { latitude: 38.5, longitude: -120.2 },
      { latitude: 40.7, longitude: -120.95 },
      { latitude: 43.252, longitude: -126.453 },
    ]);
  });

  it('returns nothing for an empty string', () => {
    expect(decodePolyline('')).toEqual([]);
  });
});


describe('closestPointOnRoute', () => {
  // A straight east-west route along 40°N, from 88°W to 86°W (about 106 miles).
  const route = [
    { latitude: 40, longitude: -88 },
    { latitude: 40, longitude: -87 },
    { latitude: 40, longitude: -86 },
  ];

  it('finds a place just off the middle of the route', () => {
    // About 7 miles north of the halfway point.
    const result = closestPointOnRoute(route, { latitude: 40.1, longitude: -87 })!;
    expect(result.distanceMiles).toBeCloseTo(6.9, 0);
    expect(result.alongMiles).toBeGreaterThan(50);
    expect(result.alongMiles).toBeLessThan(55);
  });

  it('measures past the end of the route to the end point', () => {
    const result = closestPointOnRoute(route, { latitude: 40, longitude: -85 })!;
    expect(result.distanceMiles).toBeGreaterThan(50);
  });

  it('needs at least two points', () => {
    expect(closestPointOnRoute([route[0]], route[0])).toBeNull();
  });
});
