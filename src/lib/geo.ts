// Small map math helpers. No network calls here, so it's easy to test.

export type LatLng = { latitude: number; longitude: number };

export const METERS_PER_MILE = 1609.344;

// Straight-line distance between two points, in miles (haversine formula).
export function distanceMiles(a: LatLng, b: LatLng): number {
  const earthRadiusMiles = 3958.8;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(h));
}

// Google sends routes as an "encoded polyline" string. This turns it back into points.
// Format: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  function nextValue(): number {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  }

  while (index < encoded.length) {
    lat += nextValue();
    lng += nextValue();
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}
