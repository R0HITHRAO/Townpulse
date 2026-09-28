/**
 * TownPulse Routing & Directions Service
 * Uses Open Source Routing Machine (OSRM) - 100% Free, Zero-API-Key required.
 * Provides driving, walking, and cycling route geometries, travel times, and turn instructions.
 */

export type TravelMode = 'driving' | 'walking' | 'cycling';

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  name: string;
}

export interface RouteResult {
  coordinates: [number, number][]; // [lat, lng] array for Leaflet Polyline
  distanceMeters: number;
  durationSeconds: number;
  mode: TravelMode;
  steps: RouteStep[];
}

// Fallback speed estimates (meters per second) if routing service is offline
const SPEED_ESTIMATES: Record<TravelMode, number> = {
  driving: 11.1, // ~40 km/h in small towns
  cycling: 4.1,  // ~15 km/h
  walking: 1.3,  // ~4.7 km/h
};

/**
 * Calculates Haversine straight-line distance in meters between two coordinates
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Formats distance in meters into human-readable text (e.g. "850 m" or "4.2 km")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Formats duration in seconds into human-readable text (e.g. "6 mins" or "1 hr 15 mins")
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) {
    return 'under a min';
  }
  if (minutes < 60) {
    return `${minutes} min${minutes === 1 ? '' : 's'}`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) {
    return `${hours} hr${hours === 1 ? '' : 's'}`;
  }
  return `${hours} hr${hours === 1 ? '' : 's'} ${remainingMins} min${remainingMins === 1 ? '' : 's'}`;
}

/**
 * Fetches turn-by-turn route and polyline geometry from public OSRM server
 */
export async function getRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  mode: TravelMode = 'driving'
): Promise<RouteResult> {
  const profile = mode === 'cycling' ? 'cycling' : mode === 'walking' ? 'walking' : 'driving';
  const url = `https://router.project-osrm.org/route/v1/${profile}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Routing request failed with status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error('No route found between coordinates');
    }

    const route = data.routes[0];
    // OSRM GeoJSON coordinates are [longitude, latitude] -> Leaflet requires [latitude, longitude]
    const leafletCoords: [number, number][] = route.geometry.coordinates.map(
      (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
    );

    const steps: RouteStep[] = [];
    if (route.legs && route.legs[0]?.steps) {
      for (const step of route.legs[0].steps) {
        if (step.maneuver) {
          const type = step.maneuver.type || 'continue';
          const modifier = step.maneuver.modifier ? ` ${step.maneuver.modifier}` : '';
          const name = step.name || 'unnamed road';
          let instruction = `${type}${modifier} on ${name}`;
          if (type === 'depart') instruction = `Start heading toward ${name}`;
          if (type === 'arrive') instruction = `Arrive at destination`;

          steps.push({
            instruction,
            distanceMeters: step.distance || 0,
            durationSeconds: step.duration || 0,
            name: step.name || '',
          });
        }
      }
    }

    return {
      coordinates: leafletCoords,
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      mode,
      steps,
    };
  } catch (err) {
    console.warn('OSRM online routing unavailable or timed out, using Haversine approximation', err);

    // Fallback: Haversine straight line + realistic road curve factor (1.3x)
    const straightDist = calculateHaversineDistance(start.lat, start.lng, end.lat, end.lng);
    const approxRoadDist = straightDist * 1.35;
    const speed = SPEED_ESTIMATES[mode];
    const approxDuration = approxRoadDist / speed;

    return {
      coordinates: [
        [start.lat, start.lng],
        [end.lat, end.lng],
      ],
      distanceMeters: approxRoadDist,
      durationSeconds: approxDuration,
      mode,
      steps: [
        {
          instruction: `Direct route to destination (${formatDistance(approxRoadDist)})`,
          distanceMeters: approxRoadDist,
          durationSeconds: approxDuration,
          name: 'Direct route',
        },
      ],
    };
  }
}

/**
 * Returns external map navigation links for mobile and desktop handoff
 */
export function getGoogleMapsNavigationUrl(destLat: number, destLng: number, startLat?: number, startLng?: number): string {
  if (startLat && startLng) {
    return `https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${destLat},${destLng}&travelmode=driving`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
}

export function getAppleMapsNavigationUrl(destLat: number, destLng: number): string {
  return `https://maps.apple.com/?daddr=${destLat},${destLng}`;
}
