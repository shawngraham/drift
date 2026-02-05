import type { WikiArticle } from '../types';
import { getGeohashTile } from '../utils/coordinates';
import { getCachedArticles, cacheArticles } from './database';

const WIKIPEDIA_API_BASE = 'https://en.wikipedia.org/w/api.php';

/**
 * Fetch geolocated Wikipedia articles near a position
 */
export async function fetchNearbyArticles(
  lat: number,
  lon: number,
  radius: number = 1000
): Promise<WikiArticle[]> {
  // Check cache first
  const tileId = getGeohashTile(lat, lon);
  const cached = await getCachedArticles(tileId);
  if (cached) {
    return cached.articles;
  }

  // Fetch from Wikipedia API
  const params = new URLSearchParams({
    action: 'query',
    list: 'geosearch',
    gscoord: `${lat}|${lon}`,
    gsradius: String(Math.min(radius, 10000)), // Max 10km
    gslimit: '50',
    format: 'json',
    origin: '*', // CORS
  });

  try {
    const response = await fetch(`${WIKIPEDIA_API_BASE}?${params}`);

    if (!response.ok) {
      throw new Error(`Wikipedia API error: ${response.status}`);
    }

    const data = await response.json();
    const articles: WikiArticle[] = (data.query?.geosearch || []).map(
      (item: {
        pageid: number;
        title: string;
        lat: number;
        lon: number;
        dist: number;
        primary?: string;
      }) => ({
        pageid: item.pageid,
        title: item.title,
        lat: item.lat,
        lon: item.lon,
        dist: item.dist,
        primary: item.primary,
      })
    );

    // Cache the results
    await cacheArticles(tileId, articles);

    return articles;
  } catch (error) {
    console.error('Failed to fetch Wikipedia articles:', error);

    // Return cached data even if expired as fallback
    const fallback = await getCachedArticles(tileId, Infinity);
    if (fallback) {
      return fallback.articles;
    }

    return [];
  }
}

/**
 * Get article excerpt for additional context (optional enhancement)
 */
export async function getArticleExcerpt(
  pageId: number
): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'query',
    pageids: String(pageId),
    prop: 'extracts',
    exintro: 'true',
    explaintext: 'true',
    exsentences: '2',
    format: 'json',
    origin: '*',
  });

  try {
    const response = await fetch(`${WIKIPEDIA_API_BASE}?${params}`);
    if (!response.ok) return null;

    const data = await response.json();
    const pages = data.query?.pages;
    if (!pages) return null;

    const page = pages[pageId];
    return page?.extract || null;
  } catch {
    return null;
  }
}
