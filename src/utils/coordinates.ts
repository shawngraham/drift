import type { Position, WikiArticle, BearingInfo } from '../types';

const EARTH_RADIUS = 6371000; // meters

/**
 * Convert degrees to radians
 */
export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
export function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Calculate distance between two points using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS * c;
}

/**
 * Calculate bearing from point 1 to point 2
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = toRadians(lon2 - lon1);
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  let bearing = toDegrees(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

/**
 * Get bearing info from user position to article
 */
export function getBearingInfo(
  userPos: Position,
  article: WikiArticle
): BearingInfo {
  const bearing = calculateBearing(
    userPos.latitude,
    userPos.longitude,
    article.lat,
    article.lon
  );
  const distance = article.dist;

  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;

  return {
    bearing,
    distance,
    direction: directions[index],
  };
}

/**
 * Generate a simple geohash for caching (approximate tile)
 */
export function getGeohashTile(lat: number, lon: number, precision: number = 3): string {
  const latPrecision = Math.round(lat * Math.pow(10, precision));
  const lonPrecision = Math.round(lon * Math.pow(10, precision));
  return `${latPrecision}_${lonPrecision}`;
}

/**
 * Check if position has moved significantly
 */
export function hasMovedSignificantly(
  oldPos: Position | null,
  newPos: Position,
  thresholdMeters: number
): boolean {
  if (!oldPos) return true;

  const distance = calculateDistance(
    oldPos.latitude,
    oldPos.longitude,
    newPos.latitude,
    newPos.longitude
  );

  return distance >= thresholdMeters;
}

/**
 * Find the centroid of multiple points
 */
export function findCentroid(points: Array<{ lat: number; lon: number }>): {
  lat: number;
  lon: number;
} {
  if (points.length === 0) {
    throw new Error('Cannot find centroid of empty array');
  }

  const sum = points.reduce(
    (acc, point) => ({
      lat: acc.lat + point.lat,
      lon: acc.lon + point.lon,
    }),
    { lat: 0, lon: 0 }
  );

  return {
    lat: sum.lat / points.length,
    lon: sum.lon / points.length,
  };
}

/**
 * Generate phantom coordinates in the "negative space" between articles
 * This is the conceptual core - finding the spaces that aren't documented
 */
export function generatePhantomCoordinates(
  userPos: Position,
  articles: WikiArticle[]
): { lat: number; lon: number; dimensionalDrift: number } {
  if (articles.length === 0) {
    // No articles - phantom is near user with drift
    const drift = (Math.random() - 0.5) * 0.001;
    return {
      lat: userPos.latitude + drift,
      lon: userPos.longitude + drift,
      dimensionalDrift: Math.abs(drift) * 1000,
    };
  }

  // Find centroid of all articles
  const articleCentroid = findCentroid(articles.map((a) => ({ lat: a.lat, lon: a.lon })));

  // Find the "anti-centroid" - the point opposite the centroid from the user
  const deltaLat = articleCentroid.lat - userPos.latitude;
  const deltaLon = articleCentroid.lon - userPos.longitude;

  // Phantom location is between user and centroid, offset perpendicular
  const midLat = userPos.latitude + deltaLat * 0.3;
  const midLon = userPos.longitude + deltaLon * 0.3;

  // Add perpendicular offset (rotate 90 degrees) with randomness
  const perpScale = 0.0003 * (Math.random() + 0.5);
  const phantomLat = midLat + deltaLon * perpScale;
  const phantomLon = midLon - deltaLat * perpScale;

  // Add "dimensional drift" - slight unreality
  const drift = (Math.random() - 0.5) * 0.0001;

  return {
    lat: phantomLat + drift,
    lon: phantomLon + drift,
    dimensionalDrift: Math.abs(drift) * 10000,
  };
}

/**
 * Convert coordinates to display string
 */
export function formatCoordinates(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}
