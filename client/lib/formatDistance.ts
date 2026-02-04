export function formatDistance(valueKm: number): string {
  if (valueKm < 1) {
    const meters = Math.round(valueKm * 1000);
    return `${meters}m`;
  }
  return `${valueKm.toFixed(1)} km`;
}

export function formatDistanceShort(valueKm: number): string {
  if (valueKm < 1) {
    const meters = Math.round(valueKm * 1000);
    return `${meters}m`;
  }
  return `${valueKm.toFixed(1)}`;
}
