import { decodePolyline, distanceMiles } from '../geo';

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
