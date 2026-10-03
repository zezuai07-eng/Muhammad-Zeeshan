import { calculateGeodesicDistanceKm, estimateDriveMinutes, calculateBearing } from './formatters';

export interface RouteResult {
  coordinates: [number, number][];
  distanceKm: number;
  durationMinutes: number;
  bearing: string;
  source: 'osrm' | 'cadastral_fallback';
  steps: string[];
}

// LDA City Key Arterials / Boulevard Spine for realistic road-conforming fallback routing
const LDA_BOULEVARD_SPINE: [number, number][] = [
  [31.3700, 74.3490], // Ferozepur Road Interchange
  [31.3760, 74.3550], // South Gate
  [31.3800, 74.3590], // Sector C & B Central Ring
  [31.3850, 74.3630], // Main Commercial Boulevard (Kashpal Head Office)
  [31.3900, 74.3680], // Sector A Entrance
  [31.3940, 74.3720], // North Ring
];

function findNearestSpinePoint(point: [number, number]): [number, number] {
  let bestPoint = LDA_BOULEVARD_SPINE[0];
  let minDistance = Infinity;

  for (const spinePoint of LDA_BOULEVARD_SPINE) {
    const dist = calculateGeodesicDistanceKm(point, spinePoint);
    if (dist < minDistance) {
      minDistance = dist;
      bestPoint = spinePoint;
    }
  }
  return bestPoint;
}

/**
 * Fetch real-world road directions between two coordinates,
 * with instantaneous local fallback to LDA City cadastral road network.
 */
export async function calculateRouteBetweenCoordinates(
  origin: [number, number],
  destination: [number, number],
  originLabel = 'Origin',
  destLabel = 'Destination'
): Promise<RouteResult> {
  const directDist = calculateGeodesicDistanceKm(origin, destination);
  const bearing = calculateBearing(origin, destination);

  // Attempt OSRM real-world road routing with rapid 2s timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2200);

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin[1]},${origin[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(osrmUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const rawCoords: [number, number][] = route.geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
        );

        const distKm = parseFloat((route.distance / 1000).toFixed(2));
        const durationMin = Math.max(1, Math.round(route.duration / 60));

        const steps: string[] = [];
        if (route.legs && route.legs[0] && route.legs[0].steps) {
          route.legs[0].steps.forEach((st: any) => {
            if (st.maneuver && st.maneuver.instruction) {
              steps.push(st.maneuver.instruction);
            } else if (st.name) {
              steps.push(`Continue on ${st.name}`);
            }
          });
        }

        if (steps.length === 0) {
          steps.push(`Start from ${originLabel}`);
          steps.push(`Follow main road towards ${destLabel}`);
          steps.push(`Arrive at ${destLabel}`);
        }

        return {
          coordinates: rawCoords,
          distanceKm: distKm,
          durationMinutes: durationMin,
          bearing,
          source: 'osrm',
          steps,
        };
      }
    }
  } catch (err) {
    // Graceful fallback to LDA City cadastral spine
    console.debug('OSRM route timed out or offline, using cadastral spine fallback:', err);
  }

  // Robust Cadastral Road Fallback
  const nearestOriginSpine = findNearestSpinePoint(origin);
  const nearestDestSpine = findNearestSpinePoint(destination);

  // Construct intermediate waypoints along the 180 Ft boulevard
  const fallbackPath: [number, number][] = [origin];
  if (calculateGeodesicDistanceKm(origin, nearestOriginSpine) > 0.05) {
    fallbackPath.push(nearestOriginSpine);
  }
  if (
    calculateGeodesicDistanceKm(nearestOriginSpine, nearestDestSpine) > 0.05 &&
    (nearestOriginSpine[0] !== nearestDestSpine[0] || nearestOriginSpine[1] !== nearestDestSpine[1])
  ) {
    fallbackPath.push(nearestDestSpine);
  }
  fallbackPath.push(destination);

  const routeDist = parseFloat((directDist * 1.22).toFixed(2));
  const driveMin = estimateDriveMinutes(routeDist);

  return {
    coordinates: fallbackPath,
    distanceKm: routeDist,
    durationMinutes: driveMin,
    bearing,
    source: 'cadastral_fallback',
    steps: [
      `Depart from ${originLabel}`,
      'Merge onto 180 Ft Main Commercial Boulevard / Sector Avenue',
      `Proceed ${bearing} towards destination sector`,
      `Arrive at ${destLabel}`,
    ],
  };
}
