// Italian decimals: "3,2 km", not "3.2 km".
export function formatDecimal(value: number, digits: number): string {
  return value.toLocaleString("it-IT", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatDistance(valueKm: number): string {
  if (valueKm < 1) {
    const meters = Math.round(valueKm * 1000);
    return `${meters}m`;
  }
  return `${formatDecimal(valueKm, 1)} km`;
}

// Minutes and seconds per km, e.g. "12:30".
export function formatPace(
  durationSeconds: number,
  distanceKm: number,
): string {
  if (distanceKm <= 0 || durationSeconds <= 0) return "-";
  const secondsPerKm = Math.round(durationSeconds / distanceKm);
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = String(secondsPerKm % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}
