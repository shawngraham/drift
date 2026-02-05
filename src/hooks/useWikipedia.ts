import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import { fetchNearbyArticles } from '../services/wikipedia';
import { hasMovedSignificantly } from '../utils/coordinates';

/**
 * Hook to fetch and cache Wikipedia articles based on position
 */
export function useWikipedia() {
  const lastFetchPositionRef = useRef<{ lat: number; lon: number } | null>(null);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { position, nearbyArticles, settings, setNearbyArticles } = useAppStore();

  // Fetch articles for current position
  const fetchArticles = useCallback(async () => {
    if (!position) return;

    const lastPos = lastFetchPositionRef.current;

    // Only fetch if we've moved significantly (saves API calls)
    if (lastPos) {
      const moved = hasMovedSignificantly(
        { latitude: lastPos.lat, longitude: lastPos.lon } as { latitude: number; longitude: number; heading: number | null; accuracy: number; timestamp: number },
        position,
        settings.movementThreshold * 2 // Double threshold for API calls
      );
      if (!moved) return;
    }

    try {
      const articles = await fetchNearbyArticles(
        position.latitude,
        position.longitude,
        settings.radarRange
      );

      lastFetchPositionRef.current = {
        lat: position.latitude,
        lon: position.longitude,
      };

      setNearbyArticles(articles);
    } catch (error) {
      console.error('Failed to fetch Wikipedia articles:', error);
    }
  }, [position, settings.radarRange, settings.movementThreshold, setNearbyArticles]);

  // Debounced fetch when position changes
  useEffect(() => {
    if (!position) return;

    // Clear existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Debounce fetch
    fetchTimeoutRef.current = setTimeout(() => {
      fetchArticles();
    }, 500);

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [position, fetchArticles]);

  // Manual refresh
  const refresh = useCallback(() => {
    lastFetchPositionRef.current = null;
    fetchArticles();
  }, [fetchArticles]);

  return {
    articles: nearbyArticles,
    refresh,
  };
}
