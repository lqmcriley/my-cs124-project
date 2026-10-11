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

// Total length of a route line, in miles.
export function routeLengthMiles(route: LatLng[]): number {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) total += distanceMiles(route[i], route[i + 1]);
  return total;
}

// How close a route passes to a place, and how far along the route that is.
//   distanceMiles: shortest distance from the place to the route line
//   alongMiles:    distance along the line from its start to that closest point
// The closest point is found with a flat-map approximation around the place
// (fine within ~12 miles); distances along the route use real globe distances.
export function closestPointOnRoute(route: LatLng[], place: LatLng): { distanceMiles: number; alongMiles: number } | null {
  if (route.length < 2) return null;
  const milesPerDegLat = 69.0;
  const milesPerDegLng = 69.0 * Math.cos((place.latitude * Math.PI) / 180);
  const toXY = (p: LatLng) => ({ x: (p.longitude - place.longitude) * milesPerDegLng, y: (p.latitude - place.latitude) * milesPerDegLat });

  let best = { distanceMiles: Infinity, alongMiles: 0 };
  let travelled = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const a = toXY(route[i]);
    const b = toXY(route[i + 1]);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    // How far along this segment (0 to 1) the closest point is.
    const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / lengthSquared));
    const distance = Math.hypot(a.x + t * dx, a.y + t * dy);
    const segmentMiles = distanceMiles(route[i], route[i + 1]);
    if (distance < best.distanceMiles) best = { distanceMiles: distance, alongMiles: travelled + t * segmentMiles };
    travelled += segmentMiles;
  }
  return best;
}
