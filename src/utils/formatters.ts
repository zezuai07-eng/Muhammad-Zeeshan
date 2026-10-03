export function formatPKR(amount: number): string {
  if (amount >= 10000000) {
    const crore = amount / 10000000;
    return `PKR ${crore.toFixed(crore % 1 === 0 ? 0 : 2)} Crore`;
  }
  if (amount >= 100000) {
    const lac = amount / 100000;
    return `PKR ${lac.toFixed(lac % 1 === 0 ? 0 : 2)} Lac`;
  }
  return `PKR ${amount.toLocaleString()}`;
}

export function formatPKRFull(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK')}`;
}

/**
 * Validates whether an input is a valid non-NaN [latitude, longitude] pair
 */
export function isValidLatLng(coords: unknown): coords is [number, number] {
  return (
    Array.isArray(coords) &&
    coords.length >= 2 &&
    typeof coords[0] === 'number' &&
    typeof coords[1] === 'number' &&
    !isNaN(coords[0]) &&
    !isNaN(coords[1]) &&
    isFinite(coords[0]) &&
    isFinite(coords[1]) &&
    coords[0] >= -90 &&
    coords[0] <= 90 &&
    coords[1] >= -180 &&
    coords[1] <= 180
  );
}

/**
 * Calculates geodesic distance between two [lat, lng] coordinates in kilometers using Haversine formula
 */
export function calculateGeodesicDistanceKm(
  coord1: [number, number],
  coord2: [number, number]
): number {
  if (!isValidLatLng(coord1) || !isValidLatLng(coord2)) {
    return 0;
  }
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;

  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates initial compass bearing from point 1 to point 2
 */
export function calculateBearing(coord1: [number, number], coord2: [number, number]): string {
  if (!isValidLatLng(coord1) || !isValidLatLng(coord2)) {
    return 'N/A';
  }
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;

  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  brng = (brng + 360) % 360;

  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(brng / 22.5) % 16;
  return `${directions[index]} (${Math.round(brng)}°)`;
}

/**
 * Estimate drive time in minutes assuming average Lahore urban/arterial speed of 35 km/h
 */
export function estimateDriveMinutes(distanceKm: number): number {
  if (isNaN(distanceKm) || !isFinite(distanceKm) || distanceKm <= 0) {
    return 2;
  }
  const speedKmh = 32;
  const hours = distanceKm / speedKmh;
  const minutes = Math.ceil(hours * 60);
  return Math.max(minutes, 2);
}

/**
 * Generates an auto-prefilled WhatsApp link for agents or custom phone numbers
 */
export function generateWhatsAppLink(
  phoneNumber: string,
  message: string
): string {
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  let formattedNumber = digitsOnly;
  if (digitsOnly.startsWith('03')) {
    formattedNumber = '92' + digitsOnly.slice(1);
  } else if (!digitsOnly.startsWith('92') && digitsOnly.length === 10) {
    formattedNumber = '92' + digitsOnly;
  }
  return `https://wa.me/${formattedNumber || '923001535898'}?text=${encodeURIComponent(message)}`;
}
