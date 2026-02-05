import Dexie, { type Table } from 'dexie';
import type { WikiCache, TransmissionLog, AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

/**
 * Aethereal Drift Database
 * Stores wiki cache, transmission logs, and settings locally
 */
class AetherealDriftDB extends Dexie {
  wikiCache!: Table<WikiCache, string>;
  transmissions!: Table<TransmissionLog, number>;
  settings!: Table<AppSettings, number>;

  constructor() {
    super('AetherealDriftDB');

    this.version(1).stores({
      wikiCache: 'id, fetchedAt',
      transmissions: '++id, timestamp',
      settings: '++id',
    });
  }
}

export const db = new AetherealDriftDB();

/**
 * Get or initialize settings
 */
export async function getSettings(): Promise<AppSettings> {
  const settings = await db.settings.toCollection().first();
  if (settings) return settings;

  // Initialize with defaults
  const id = await db.settings.add(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, id };
}

/**
 * Update settings
 */
export async function updateSettings(
  updates: Partial<AppSettings>
): Promise<void> {
  const current = await getSettings();
  await db.settings.update(current.id!, updates);
}

/**
 * Get cached wiki articles for a tile
 */
export async function getCachedArticles(
  tileId: string,
  maxAgeMs: number = 24 * 60 * 60 * 1000
): Promise<WikiCache | null> {
  const cached = await db.wikiCache.get(tileId);
  if (!cached) return null;

  // Check if cache is expired
  if (Date.now() - cached.fetchedAt > maxAgeMs) {
    await db.wikiCache.delete(tileId);
    return null;
  }

  return cached;
}

/**
 * Cache wiki articles for a tile
 */
export async function cacheArticles(
  tileId: string,
  articles: WikiCache['articles']
): Promise<void> {
  await db.wikiCache.put({
    id: tileId,
    articles,
    fetchedAt: Date.now(),
  });
}

/**
 * Save a transmission log
 */
export async function saveTransmission(
  transmission: Omit<TransmissionLog, 'id'>
): Promise<number> {
  return db.transmissions.add(transmission as TransmissionLog);
}

/**
 * Get recent transmissions
 */
export async function getRecentTransmissions(
  limit: number = 50
): Promise<TransmissionLog[]> {
  return db.transmissions.orderBy('timestamp').reverse().limit(limit).toArray();
}

/**
 * Get all transmissions for export
 */
export async function getAllTransmissions(): Promise<TransmissionLog[]> {
  return db.transmissions.orderBy('timestamp').toArray();
}

/**
 * Delete all transmissions
 */
export async function clearTransmissions(): Promise<void> {
  await db.transmissions.clear();
}

/**
 * Clear wiki cache
 */
export async function clearWikiCache(): Promise<void> {
  await db.wikiCache.clear();
}

/**
 * Clear all data
 */
export async function clearAllData(): Promise<void> {
  await Promise.all([
    db.wikiCache.clear(),
    db.transmissions.clear(),
    db.settings.clear(),
  ]);
}
