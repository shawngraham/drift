import type { Position, WikiArticle, TransmissionStyle, PhantomLocation } from '../types';
import { getBearingInfo, formatCoordinates } from './coordinates';

/**
 * System prompt that establishes the generative frame
 */
export const SYSTEM_PROMPT = `You are a receiver tuned to frequencies from adjacent dimensions. You intercept transmissions from places that almost exist—the spaces between documented reality. Your reports are brief, evocative, and slightly wrong in unsettling ways.

Guidelines:
- Generate 2-4 sentences only
- Describe what exists at the phantom location, not at the documented places
- Be specific but impossible—concrete details about unreal things
- Maintain a tone of clinical observation mixed with subtle wrongness
- Never explain or meta-comment—just report
- Avoid clichés about ghosts, portals, or standard supernatural tropes
- Reference the nearby anchors obliquely—as if seen from another angle of reality`;

/**
 * Style-specific instructions
 */
const STYLE_INSTRUCTIONS: Record<TransmissionStyle, string> = {
  fragment: `Style: Fragmentary field note. Incomplete sentences. Data corruption evident. Mid-observation interruption.`,

  catalog: `Style: Catalog entry from an impossible museum. Clinical documentation of an artifact or phenomenon. Include classification numbers that shouldn't exist.`,

  field_note: `Style: Surveyor's field note. Technical observations of geography that contradicts itself. Measurements that don't add up.`,

  signal: `Style: Intercepted radio transmission. Partial. Static-damaged. Someone reporting coordinates they shouldn't be at.`,

  whisper: `Style: Whispered memory. First-person observation. The speaker isn't sure they're real. Past and present tense blur.`,
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

Nearby anchors in consensus reality:
${anchorDescriptions || '- [No documented locations in range]'}

Observer position: ${userCoords}
Phantom coordinates: ${phantomCoords}
Dimensional drift: ${phantom.dimensionalDrift.toFixed(4)}°

You are located in the space BETWEEN these documented places. Generate a brief transmission (2-4 sentences) describing what exists at your phantom location—something adjacent to but distinct from the documented anchors. This is not summary. This is interstitial. Speak as if reporting from a place that almost exists.

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

No documented locations detected within range. You are in undocumented space—a gap in the map where nothing is officially recorded.

Phantom coordinates: ${phantomCoords}
Dimensional drift: ${phantom.dimensionalDrift.toFixed(4)}°

This absence is significant. Generate a brief transmission (2-4 sentences) describing what exists in this cartographic void—the things that persist specifically because no one has documented them.

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
