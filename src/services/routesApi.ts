import { RouteMetrics, ServiceTicket, Technician } from '../types/dispatch';

/**
 * Decodes Google Maps Encoded Polyline algorithm into an array of LatLngLiteral coordinates
 */
export function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  if (!encoded) return [];
  const points: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
    });
  }

  return points;
}

/**
 * Generates an official Google Maps turn-by-turn navigation URL for field technicians
 */
export function generateGoogleMapsNavigationUrl(
  origin: { lat: number; lng: number },
  stops: ServiceTicket[],
  depot?: { lat: number; lng: number }
): string {
  if (!stops || stops.length === 0) {
    if (depot) {
      return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${depot.lat},${depot.lng}&travelmode=driving`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${origin.lat},${origin.lng}`;
  }

  const originStr = `${origin.lat},${origin.lng}`;
  const lastStop = stops[stops.length - 1];
  const destStr = depot ? `${depot.lat},${depot.lng}` : `${lastStop.location.lat},${lastStop.location.lng}`;

  const waypointTickets = depot ? stops : stops.slice(0, -1);
  const waypointsParam = waypointTickets
    .map((s) => `${s.location.lat},${s.location.lng}`)
    .join('|');

  let url = `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}&travelmode=driving`;
  if (waypointsParam) {
    url += `&waypoints=${encodeURIComponent(waypointsParam)}`;
  }
  return url;
}

/**
 * Computes optimal multi-stop route via server-side Routes API proxy
 */
export async function computeTechnicianRoute(
  technician: Technician,
  tickets: ServiceTicket[]
): Promise<RouteMetrics> {
  const assignedTickets = tickets
    .filter((t) => technician.assignedTicketIds.includes(t.id))
    .sort((a, b) => (a.stopSequence || 0) - (b.stopSequence || 0));

  if (assignedTickets.length === 0) {
    return {
      totalDistanceMiles: 0,
      totalDistanceKm: 0,
      totalDriveMinutes: 0,
      estimatedFuelGallons: 0,
      estimatedFuelLiters: 0,
      stopCount: 0,
      encodedPolyline: '',
      legs: [],
    };
  }

  const origin = {
    lat: technician.currentLocation.lat,
    lng: technician.currentLocation.lng,
  };

  // Destination is either returning to depot or the final stop
  const destination = technician.depotLocation 
    ? { lat: technician.depotLocation.lat, lng: technician.depotLocation.lng }
    : { lat: assignedTickets[assignedTickets.length - 1].location.lat, lng: assignedTickets[assignedTickets.length - 1].location.lng };

  const intermediates = assignedTickets.map((t) => ({
    lat: t.location.lat,
    lng: t.location.lng,
  }));

  try {
    const response = await fetch('/api/routes/compute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin,
        destination,
        intermediates,
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
      }
      return fallbackCalculateRoute(technician, assignedTickets);
    }

    const data = await response.json();
    if (data.error?.status === 'RESOURCE_EXHAUSTED' || data.error?.code === 429) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
    }
    const route = data.routes?.[0];

    if (!route) {
      return fallbackCalculateRoute(technician, assignedTickets);
    }

    const totalMeters = route.distanceMeters || 0;
    const totalDurationStr = route.duration || '0s';
    const durationSeconds = parseInt(totalDurationStr.replace('s', ''), 10) || 0;

    const totalDistanceMiles = Math.round((totalMeters / 1609.34) * 10) / 10;
    const totalDistanceKm = Math.round((totalMeters / 1000) * 10) / 10;
    const totalDriveMinutes = Math.round(durationSeconds / 60);
    // Canadian mobile cleaning service van gets ~16.2 L/100km (~14.5 MPG)
    const estimatedFuelLiters = Math.round(((totalDistanceKm * 16.2) / 100) * 10) / 10;
    const estimatedFuelGallons = Math.round((totalDistanceMiles / 14.5) * 10) / 10;

    const legs = (route.legs || []).map((leg: any, idx: number) => {
      const fromAddr = idx === 0 ? technician.currentLocation.address : assignedTickets[idx - 1]?.location.address || 'Stop';
      const toAddr = idx < assignedTickets.length ? assignedTickets[idx]?.location.address : technician.depotLocation.name;
      return {
        distanceMeters: leg.distanceMeters || 0,
        durationSeconds: parseInt((leg.duration || '0s').replace('s', ''), 10) || 0,
        fromAddress: fromAddr,
        toAddress: toAddr,
      };
    });

    return {
      totalDistanceMiles,
      totalDistanceKm,
      totalDriveMinutes,
      estimatedFuelGallons,
      estimatedFuelLiters,
      stopCount: assignedTickets.length,
      encodedPolyline: route.polyline?.encodedPolyline || '',
      legs,
    };
  } catch (err) {
    console.warn('Routes API compute fallback used:', err);
    // Local fallback calculation
    return fallbackCalculateRoute(technician, assignedTickets);
  }
}

/**
 * Fallback route and metric calculation using geometric Haversine logic
 */
function fallbackCalculateRoute(
  technician: Technician,
  assignedTickets: ServiceTicket[]
): RouteMetrics {
  const points = [
    technician.currentLocation,
    ...assignedTickets.map((t) => t.location),
    technician.depotLocation,
  ];

  let totalKm = 0;
  const legs = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.lat * Math.PI) / 180) *
        Math.cos((p2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    // 6371 km radius with 1.28 urban winding factor
    const legKm = Math.round(6371 * c * 1.28 * 10) / 10;
    const legSeconds = Math.round((legKm / 50) * 3600); // 50 km/h average Edmonton urban speed

    totalKm += legKm;
    legs.push({
      distanceMeters: Math.round(legKm * 1000),
      durationSeconds: legSeconds,
      fromAddress: p1.address || 'Origin',
      toAddress: p2.address || 'Destination',
    });
  }

  const totalDistanceKm = Math.round(totalKm * 10) / 10;
  const totalDistanceMiles = Math.round((totalDistanceKm * 0.621371) * 10) / 10;
  const totalDriveMinutes = Math.round((totalDistanceKm / 48) * 60);
  const estimatedFuelLiters = Math.round(((totalDistanceKm * 16.2) / 100) * 10) / 10;
  const estimatedFuelGallons = Math.round((totalDistanceMiles / 14.5) * 10) / 10;

  return {
    totalDistanceMiles,
    totalDistanceKm,
    totalDriveMinutes,
    estimatedFuelGallons,
    estimatedFuelLiters,
    stopCount: assignedTickets.length,
    encodedPolyline: '',
    legs,
  };
}
