import type {
  Position,
  WikiArticle,
  PhantomLocation,
  TransmissionStyle,
  TransmissionLog,
} from '../types';
import { generatePhantomCoordinates } from '../utils/coordinates';
import {
  constructPrompt,
  constructEmptySpacePrompt,
  selectRandomStyle,
  cleanTransmission,
} from '../utils/prompts';
import { generateText } from './llm';
import { saveTransmission } from './database';

/**
 * Latent Engine - The conceptual core
 * Transforms real-world anchors into phantom transmissions
 */

export interface LatentGenerationResult {
  transmission: TransmissionLog;
  phantom: PhantomLocation;
}

/**
 * Generate a phantom location in the "negative space"
 */
export function createPhantomLocation(
  userPos: Position,
  articles: WikiArticle[]
): PhantomLocation {
  const coords = generatePhantomCoordinates(userPos, articles);
  return {
    lat: coords.lat,
    lon: coords.lon,
    dimensionalDrift: coords.dimensionalDrift,
    anchors: articles.slice(0, 5).map((a) => a.title),
  };
}

/**
 * Generate a transmission from the phantom location
 */
export async function generateTransmission(
  userPos: Position,
  articles: WikiArticle[],
  style?: TransmissionStyle
): Promise<LatentGenerationResult> {
  const selectedStyle = style || selectRandomStyle();
  const phantom = createPhantomLocation(userPos, articles);

  // Construct the prompt
  const prompt =
    articles.length > 0
      ? constructPrompt(userPos, articles, phantom, selectedStyle)
      : constructEmptySpacePrompt(userPos, phantom, selectedStyle);

  // Generate text using the on-device LLM
  const rawText = await generateText(prompt);
  const cleanedText = cleanTransmission(rawText);

  // Create the transmission log entry
  const transmission: Omit<TransmissionLog, 'id'> = {
    timestamp: new Date().toISOString(),
    userCoordinates: {
      lat: userPos.latitude,
      lon: userPos.longitude,
    },
    phantomCoordinates: {
      lat: phantom.lat,
      lon: phantom.lon,
    },
    nearbyAnchors: phantom.anchors,
    transmission: cleanedText,
    voiceProfile: 'default', // Will be set by audio engine
    style: selectedStyle,
  };

  // Save to database
  const id = await saveTransmission(transmission);

  return {
    transmission: { ...transmission, id },
    phantom,
  };
}

/**
 * Check if conditions are met for a new transmission
 */
export function shouldTriggerGeneration(
  lastGeneratedAt: number | null,
  intervalMs: number,
  articlesChanged: boolean
): boolean {
  // If articles changed significantly, consider generating
  if (articlesChanged) {
    // But not if we just generated
    if (lastGeneratedAt && Date.now() - lastGeneratedAt < 10000) {
      return false;
    }
    return true;
  }

  // Time-based trigger
  if (!lastGeneratedAt) return true;
  return Date.now() - lastGeneratedAt >= intervalMs;
}

/**
 * Compare article sets to detect significant changes
 */
export function haveArticlesChanged(
  oldArticles: WikiArticle[],
  newArticles: WikiArticle[]
): boolean {
  if (oldArticles.length === 0 && newArticles.length === 0) return false;
  if (Math.abs(oldArticles.length - newArticles.length) >= 2) return true;

  // Check if the closest articles have changed
  const oldIds = new Set(oldArticles.slice(0, 3).map((a) => a.pageid));
  const newIds = new Set(newArticles.slice(0, 3).map((a) => a.pageid));

  let changed = 0;
  for (const id of newIds) {
    if (!oldIds.has(id)) changed++;
  }

  return changed >= 2;
}
