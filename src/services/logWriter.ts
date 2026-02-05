import type { TransmissionLog } from '../types';
import { getAllTransmissions } from './database';

/**
 * Log Writer Service
 * Handles exporting transmission logs
 */

/**
 * Format a single transmission for text export
 */
function formatTransmission(log: TransmissionLog, index: number): string {
  const date = new Date(log.timestamp);
  const time = date.toLocaleTimeString('en-US', { hour12: false });
  const dateStr = date.toLocaleDateString('en-US');

  const userCoords = `${log.userCoordinates.lat.toFixed(4)}° N, ${Math.abs(log.userCoordinates.lon).toFixed(4)}° ${log.userCoordinates.lon >= 0 ? 'E' : 'W'}`;
  const phantomCoords = `${log.phantomCoordinates.lat.toFixed(4)}° N, ${Math.abs(log.phantomCoordinates.lon).toFixed(4)}° ${log.phantomCoordinates.lon >= 0 ? 'E' : 'W'}`;

  const latDrift = (log.phantomCoordinates.lat - log.userCoordinates.lat).toFixed(6);
  const lonDrift = (log.phantomCoordinates.lon - log.userCoordinates.lon).toFixed(6);

  const anchors = log.nearbyAnchors.length > 0
    ? log.nearbyAnchors.join(', ')
    : '[No documented locations]';

  return `[${index + 1}] ${dateStr} ${time}
    Position: ${userCoords}
    Phantom:  ${phantomCoords}
    Drift:    ${latDrift}°, ${lonDrift}°
    Anchors:  ${anchors}
    Style:    ${log.style}
    Voice:    ${log.voiceProfile}

    "${log.transmission}"
`;
}

/**
 * Generate formatted text export
 */
export async function exportAsText(): Promise<string> {
  const transmissions = await getAllTransmissions();

  if (transmissions.length === 0) {
    return 'No transmissions recorded.';
  }

  const header = `═══════════════════════════════════════════════════════════════
TRANSMISSION LOG: AETHEREAL DRIFT
Generated: ${new Date().toISOString()}
Total Transmissions: ${transmissions.length}
═══════════════════════════════════════════════════════════════

`;

  const separator = `
───────────────────────────────────────────────────────────────
`;

  const body = transmissions
    .map((t, i) => formatTransmission(t, i))
    .join(separator);

  const footer = `
═══════════════════════════════════════════════════════════════
END OF LOG
"The map is not the territory, but between the maps lie
territories unmapped."
═══════════════════════════════════════════════════════════════
`;

  return header + body + footer;
}

/**
 * Generate JSONL export (one JSON object per line)
 */
export async function exportAsJSONL(): Promise<string> {
  const transmissions = await getAllTransmissions();
  return transmissions.map((t) => JSON.stringify(t)).join('\n');
}

/**
 * Generate full JSON export
 */
export async function exportAsJSON(): Promise<string> {
  const transmissions = await getAllTransmissions();
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      version: '0.1.0',
      transmissions,
    },
    null,
    2
  );
}

/**
 * Download a file
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string = 'text/plain'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Export and download as formatted text
 */
export async function downloadTextLog(): Promise<void> {
  const content = await exportAsText();
  const date = new Date().toISOString().split('T')[0];
  downloadFile(content, `aethereal-drift-log-${date}.txt`);
}

/**
 * Export and download as JSON
 */
export async function downloadJSONLog(): Promise<void> {
  const content = await exportAsJSON();
  const date = new Date().toISOString().split('T')[0];
  downloadFile(content, `aethereal-drift-log-${date}.json`, 'application/json');
}
