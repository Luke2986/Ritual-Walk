export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface RawFix extends LatLng {
  timestamp: number;
  accuracy: number | null;
  speed: number | null;
}

const EARTH_RADIUS_M = 6371000;
const MAX_ACCURACY_M = 25;
const MAX_WALKING_SPEED_MS = 7;
const MIN_STEP_M = 5;

const toRad = (deg: number) => (deg * Math.PI) / 180;

export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Drops noisy fixes: poor accuracy, jitter while standing still, and jumps faster than a person can move.
export function isAcceptableFix(fix: RawFix, previous: RawFix | null): boolean {
  if (fix.accuracy !== null && fix.accuracy > MAX_ACCURACY_M) return false;
  if (fix.speed !== null && fix.speed > MAX_WALKING_SPEED_MS) return false;
  if (!previous) return true;

  const meters = distanceMeters(previous, fix);
  if (meters < MIN_STEP_M) return false;

  const seconds = (fix.timestamp - previous.timestamp) / 1000;
  return seconds <= 0 || meters / seconds <= MAX_WALKING_SPEED_MS;
}

export function pathDistanceKm(
  points: (LatLng & { segment: number })[],
): number {
  let meters = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].segment === points[i - 1].segment) {
      meters += distanceMeters(points[i - 1], points[i]);
    }
  }
  return meters / 1000;
}

function perpendicularMeters(p: LatLng, a: LatLng, b: LatLng): number {
  // Local equirectangular projection centred on `a`; accurate enough at walking scale.
  const cosLat = Math.cos(toRad(a.latitude));
  const dx = toRad(b.longitude - a.longitude) * cosLat * EARTH_RADIUS_M;
  const dy = toRad(b.latitude - a.latitude) * EARTH_RADIUS_M;
  const px = toRad(p.longitude - a.longitude) * cosLat * EARTH_RADIUS_M;
  const py = toRad(p.latitude - a.latitude) * EARTH_RADIUS_M;

  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(px, py);

  const t = Math.max(0, Math.min(1, (px * dx + py * dy) / lengthSq));
  return Math.hypot(px - t * dx, py - t * dy);
}

function douglasPeucker(points: LatLng[], toleranceM: number): LatLng[] {
  if (points.length < 3) return points;

  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];

  while (stack.length) {
    const [start, end] = stack.pop()!;
    let maxDist = 0;
    let index = -1;
    for (let i = start + 1; i < end; i++) {
      const d = perpendicularMeters(points[i], points[start], points[end]);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (index !== -1 && maxDist > toleranceM) {
      keep[index] = 1;
      stack.push([start, index], [index, end]);
    }
  }

  return points.filter((_, i) => keep[i] === 1);
}

export function simplifyPath(points: LatLng[], maxPoints: number): LatLng[] {
  let tolerance = 2;
  let simplified = douglasPeucker(points, tolerance);
  while (simplified.length > maxPoints) {
    tolerance *= 2;
    simplified = douglasPeucker(points, tolerance);
  }
  return simplified.map(({ latitude, longitude }) => ({ latitude, longitude }));
}
