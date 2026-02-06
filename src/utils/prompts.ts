import type { Position, WikiArticle, TransmissionStyle, PhantomLocation } from '../types';
import { getBearingInfo, formatCoordinates } from './coordinates';

/**
 * System prompt that establishes the generative frame
 * Optimized for small on-device models (135M-500M parameters):
 * - Concise to minimize prompt token usage
 * - Clear constraints to keep output focused
 * - Strong priming to guide creative direction
 */
export const SYSTEM_PROMPT = `You report transmissions from places that almost exist—spaces between documented reality. Brief, evocative, clinically wrong.

Rules: 2-4 sentences only. Concrete impossible details. No ghosts, portals, or clichés. No meta-commentary. Reference nearby places obliquely, as if from another angle of reality.`;

/**
 * Style-specific instructions (concise for small model token budgets)
 */
const STYLE_INSTRUCTIONS: Record<TransmissionStyle, string> = {
  fragment: `Style: Fragmentary field note. Incomplete sentences. Data corruption. Mid-observation interruption.`,

  catalog: `Style: Catalog entry from an impossible museum. Clinical. Include classification numbers that shouldn't exist.`,

  field_note: `Style: Surveyor's field note. Technical geography that contradicts itself. Measurements that don't add up.`,

  signal: `Style: Intercepted radio transmission. Partial. Static-damaged. Coordinates they shouldn't be at.`,

  whisper: `Style: Whispered memory. First-person. The speaker isn't sure they're real. Tense blurs.`,
};

/**
 * Select a random transmission style
 */
export function selectRandomStyle(): TransmissionStyle {
  const styles: TransmissionStyle[] = ['fragment', 'catalog', 'field_note', 'signal', 'whisper'];
  return styles[Math.floor(Math.random() * styles.length)];
}

/**
 * Construct the full prompt for transmission generation
 */
export function constructPrompt(
  userPos: Position,
  articles: WikiArticle[],
  phantom: PhantomLocation,
  style: TransmissionStyle
): string {
  // Build anchor descriptions
  const anchorDescriptions = articles
    .slice(0, 5) // Limit to 5 nearest
    .map((article) => {
      const bearingInfo = getBearingInfo(userPos, article);
      return `- "${article.title}" (${Math.round(bearingInfo.distance)}m ${bearingInfo.direction})`;
    })
    .join('\n');

  const phantomCoords = formatCoordinates(phantom.lat, phantom.lon);
  const userCoords = formatCoordinates(userPos.latitude, userPos.longitude);
  const styleInstructions = STYLE_INSTRUCTIONS[style];

  return `${SYSTEM_PROMPT}

Nearby anchors:
${anchorDescriptions || '- [No documented locations]'}

Observer: ${userCoords}
Phantom: ${phantomCoords} (drift: ${phantom.dimensionalDrift.toFixed(4)}°)

${styleInstructions}

Transmission:`;
}

/**
 * Alternative prompt for when no articles are nearby
 */
export function constructEmptySpacePrompt(
  _userPos: Position,
  phantom: PhantomLocation,
  style: TransmissionStyle
): string {
  const phantomCoords = formatCoordinates(phantom.lat, phantom.lon);
  const styleInstructions = STYLE_INSTRUCTIONS[style];

  return `${SYSTEM_PROMPT}

No documented locations in range. Undocumented space—a gap in the map.

Phantom: ${phantomCoords} (drift: ${phantom.dimensionalDrift.toFixed(4)}°)

${styleInstructions}

Transmission:`;
}

/**
 * Clean up generated transmission text
 */
export function cleanTransmission(text: string): string {
  // Remove any leading/trailing whitespace
  let cleaned = text.trim();

  // Remove quotes if the model wrapped the response
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }

  // Remove any meta-commentary the model might add
  const metaPhrases = [
    /^(here'?s?|this is|my) (a |the )?transmission:?\s*/i,
    /^transmission:?\s*/i,
  ];

  for (const pattern of metaPhrases) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Ensure it ends with proper punctuation
  if (!/[.!?"]$/.test(cleaned)) {
    cleaned += '.';
  }

  return cleaned;
}
