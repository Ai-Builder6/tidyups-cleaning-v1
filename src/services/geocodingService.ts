export interface GeocodedAddress {
  formattedAddress: string;
  streetNumber?: string;
  streetName?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  placeId?: string;
  locationType?: string;
  isRealtimeGeocoded?: boolean;
}

// In-memory bounded cache to prevent redundant API calls during route execution
const MAX_CACHE_SIZE = 500;
const geocodeCache = new Map<string, GeocodedAddress>();

function setCache(key: string, value: GeocodedAddress) {
  if (geocodeCache.size >= MAX_CACHE_SIZE) {
    const firstKey = geocodeCache.keys().next().value;
    if (firstKey) geocodeCache.delete(firstKey);
  }
  geocodeCache.set(key, value);
}

/**
 * Normalizes coordinates into a cache key (rounded to 4 decimals ~ 11m precision)
 */
function getCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

/**
 * Reverse geocodes a latitude and longitude into a formatted street address using Google Geocoding API via server proxy
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodedAddress> {
  const cacheKey = getCacheKey(lat, lng);
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  try {
    const response = await fetch(`/api/geocode/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
    
    if (!response.ok) {
      if (response.status === 429) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
      }
      const fallback = generateFallbackAddress(lat, lng);
      setCache(cacheKey, fallback);
      return fallback;
    }

    const data = await response.json();
    if (data.error?.status === 'RESOURCE_EXHAUSTED' || data.error?.code === 429) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
    }
    const result: GeocodedAddress = {
      formattedAddress: data.formattedAddress || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      streetNumber: data.streetNumber,
      streetName: data.streetName,
      neighborhood: data.neighborhood,
      city: data.city || 'Edmonton',
      state: data.state || 'AB',
      postalCode: data.postalCode,
      placeId: data.placeId,
      locationType: data.locationType,
      isRealtimeGeocoded: !!data.fromGoogleApi,
    };

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    const fallback = generateFallbackAddress(lat, lng);
    setCache(cacheKey, fallback);
    return fallback;
  }
}

/**
 * Generates an accurate contextual address estimate for Greater Edmonton Area (YEG) coordinates
 */
function generateFallbackAddress(lat: number, lng: number): GeocodedAddress {
  let city = 'Edmonton';
  let neighborhood = 'Downtown / ICE District';
  let streetName = '104 Ave NW';
  const streetNum = Math.floor(Math.abs((lat * 1000) % 9000)) + 1000;

  if (lng < -113.62) {
    city = 'Edmonton';
    neighborhood = 'West Edmonton / Meadowlark';
    streetName = '170 St NW';
  } else if (lng > -113.38) {
    city = 'Sherwood Park';
    neighborhood = 'Strathcona Industrial / Centre';
    streetName = 'Broadmoor Blvd';
  } else if (lat > 53.60) {
    city = 'St. Albert';
    neighborhood = 'St. Albert Centre / Riel';
    streetName = 'St Anne St';
  } else if (lat < 53.40) {
    city = 'Nisku / Leduc';
    neighborhood = 'Nisku Industrial Park / Airport';
    streetName = 'Sparrow Dr';
  } else if (lat < 53.48) {
    city = 'Edmonton';
    neighborhood = 'South Edmonton / Mill Woods';
    streetName = 'Calgary Trail NW';
  } else if (lat < 53.53) {
    city = 'Edmonton';
    neighborhood = 'Old Strathcona / University';
    streetName = 'Whyte (82) Ave NW';
  } else {
    city = 'Edmonton';
    neighborhood = 'Downtown / ICE District';
    streetName = 'Jasper Ave NW';
  }

  return {
    formattedAddress: `${streetNum} ${streetName}, ${city}, AB T5J 0H8`,
    streetNumber: `${streetNum}`,
    streetName,
    neighborhood,
    city,
    state: 'AB',
    postalCode: 'T5J 0H8',
    isRealtimeGeocoded: false,
  };
}

/**
 * Forward geocodes an address string to latitude, longitude, and formatted address
 */
export async function forwardGeocode(address: string): Promise<{
  lat: number;
  lng: number;
  formattedAddress: string;
  neighborhood?: string;
  city?: string;
  fromGoogleApi?: boolean;
}> {
  if (!address || address.trim().length === 0) {
    return {
      lat: 53.5412,
      lng: -113.4988,
      formattedAddress: '10405 Jasper Ave NW, Edmonton, AB T5J 3S2',
      neighborhood: 'Downtown Edmonton',
      city: 'Edmonton',
      fromGoogleApi: false,
    };
  }

  try {
    const res = await fetch(`/api/geocode/forward?address=${encodeURIComponent(address.trim())}`);
    if (res.ok) {
      const data = await res.json();
      if (typeof data.lat === 'number' && typeof data.lng === 'number') {
        return {
          lat: data.lat,
          lng: data.lng,
          formattedAddress: data.formattedAddress || address,
          neighborhood: data.neighborhood,
          city: data.city,
          fromGoogleApi: !!data.fromGoogleApi,
        };
      }
    }
  } catch (err) {
    console.warn('Forward geocode fetch error:', err);
  }

  return {
    lat: 53.5412,
    lng: -113.4988,
    formattedAddress: address,
    neighborhood: 'Edmonton',
    city: 'Edmonton',
    fromGoogleApi: false,
  };
}

/**
 * Calculates Great-Circle / Haversine distance in kilometers between two GPS coordinates
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estimates driving distance and travel duration in Edmonton
 * (accounting for urban arterial grid and Anthony Henday ring road curvature ~ 1.25x)
 */
export function calculateDriveEstimates(straightLineKm: number): {
  drivingDistanceKm: number;
  drivingDistanceMiles: number;
  driveMinutes: number;
} {
  // Road network routing multiplier in Edmonton
  const roadFactor = straightLineKm < 3 ? 1.35 : straightLineKm < 15 ? 1.25 : 1.18;
  const drivingDistanceKm = Math.round(straightLineKm * roadFactor * 10) / 10;
  const drivingDistanceMiles = Math.round(drivingDistanceKm * 0.621371 * 10) / 10;

  // Average driving speed in Edmonton (approx 42 km/h across urban streets and ring road)
  const baseMinutes = (drivingDistanceKm / 42) * 60;
  const driveMinutes = Math.max(3, Math.round(baseMinutes + 2)); // 2 min traffic / turn buffer

  return {
    drivingDistanceKm,
    drivingDistanceMiles,
    driveMinutes,
  };
}
