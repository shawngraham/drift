import { useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../../stores/appStore';
import type { WikiArticle, PhantomLocation } from '../../types';
import { calculateBearing, calculateDistance } from '../../utils/coordinates';

interface RadarProps {
  size?: number;
}

/**
 * Radar/Compass component
 * Displays user position, nearby Wikipedia articles, and phantom location
 * North is always at the top - heading indicator shows user's facing direction
 */
export function Radar({ size = 300 }: RadarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    position,
    heading,
    nearbyArticles,
    currentPhantom,
    isGenerating,
    settings,
  } = useAppStore();

  // Draw the radar
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, timestamp: number) => {
      const width = size;
      const height = size;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 2 - 20;

      // Clear canvas
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(centerX, centerY);

      // Draw range rings (fixed, north up)
      drawRangeRings(ctx, radius, settings.radarRange);

      // Draw cardinal directions (fixed, north up)
      drawCardinals(ctx, radius);

      // Draw scan line (animated, fixed orientation)
      drawScanLine(ctx, radius, timestamp);

      // Draw articles at their true bearings (north up)
      if (position) {
        drawArticles(ctx, radius, nearbyArticles, position, settings.radarRange);
      }

      // Draw phantom location at true bearing (north up)
      if (currentPhantom && position) {
        drawPhantom(ctx, radius, currentPhantom, position, settings.radarRange, timestamp);
      }

      // Draw heading indicator (rotates with user's heading)
      if (heading !== null) {
        drawHeadingIndicator(ctx, radius, heading, timestamp);
      }

      ctx.restore();

      // Draw center point (user) - always at center
      drawCenter(ctx, centerX, centerY, isGenerating, timestamp);
    },
    [position, heading, nearbyArticles, currentPhantom, isGenerating, settings.radarRange, size]
  );

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const animate = (timestamp: number) => {
      draw(ctx, timestamp);
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [draw]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="rounded-full shadow-phosphor"
        style={{ filter: 'drop-shadow(0 0 10px #00ff4140)' }}
      />
      {/* CRT scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none rounded-full"
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
        }}
      />
    </div>
  );
}

// Helper drawing functions
function drawRangeRings(
  ctx: CanvasRenderingContext2D,
  radius: number,
  rangeMeters: number
) {
  ctx.strokeStyle = '#00ff4130';
  ctx.lineWidth = 1;

  const rings = [0.25, 0.5, 0.75, 1];
  rings.forEach((r) => {
    ctx.beginPath();
    ctx.arc(0, 0, radius * r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Range labels
  ctx.fillStyle = '#00ff4160';
  ctx.font = '10px JetBrains Mono, monospace';
  ctx.textAlign = 'center';

  const labelRanges = [rangeMeters * 0.25, rangeMeters * 0.5, rangeMeters * 0.75];
  labelRanges.forEach((range, i) => {
    const y = -radius * (0.25 * (i + 1)) - 5;
    const label = range >= 1000 ? `${(range / 1000).toFixed(1)}km` : `${Math.round(range)}m`;
    ctx.fillText(label, 0, y);
  });
}

function drawCardinals(ctx: CanvasRenderingContext2D, radius: number) {
  ctx.fillStyle = '#00ff41';
  ctx.font = 'bold 14px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const cardinals = [
    { label: 'N', angle: 0 },
    { label: 'E', angle: 90 },
    { label: 'S', angle: 180 },
    { label: 'W', angle: 270 },
  ];

  cardinals.forEach(({ label, angle }) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    const x = Math.cos(rad) * (radius + 10);
    const y = Math.sin(rad) * (radius + 10);
    ctx.fillText(label, x, y);
  });
}

function drawScanLine(
  ctx: CanvasRenderingContext2D,
  radius: number,
  timestamp: number
) {
  const angle = ((timestamp / 20) % 360) * (Math.PI / 180);

  // Scan line gradient
  const gradient = ctx.createLinearGradient(0, 0, Math.cos(angle) * radius, Math.sin(angle) * radius);
  gradient.addColorStop(0, '#00ff4100');
  gradient.addColorStop(0.5, '#00ff4140');
  gradient.addColorStop(1, '#00ff4180');

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  ctx.stroke();

  // Trailing fade
  for (let i = 1; i <= 30; i++) {
    const fadeAngle = angle - (i * Math.PI) / 180;
    const alpha = Math.floor(((30 - i) / 30) * 40);
    ctx.strokeStyle = `rgba(0, 255, 65, ${alpha / 255})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(fadeAngle) * radius, Math.sin(fadeAngle) * radius);
    ctx.stroke();
  }
}

function drawArticles(
  ctx: CanvasRenderingContext2D,
  radius: number,
  articles: WikiArticle[],
  userPos: { latitude: number; longitude: number },
  rangeMeters: number
) {
  articles.forEach((article) => {
    const bearing = calculateBearing(userPos.latitude, userPos.longitude, article.lat, article.lon);
    const distance = article.dist;
    const normalizedDist = Math.min(distance / rangeMeters, 1);

    // Bearing is from north (0° = north, 90° = east), convert to canvas coordinates
    const angle = ((bearing - 90) * Math.PI) / 180;
    const x = Math.cos(angle) * (radius * normalizedDist);
    const y = Math.sin(angle) * (radius * normalizedDist);

    // Size based on proximity
    const size = 4 + (1 - normalizedDist) * 4;

    // Glow effect
    ctx.shadowColor = '#00ff41';
    ctx.shadowBlur = 10;

    ctx.fillStyle = '#00ff41';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
  });
}

function drawPhantom(
  ctx: CanvasRenderingContext2D,
  radius: number,
  phantom: PhantomLocation,
  userPos: { latitude: number; longitude: number },
  rangeMeters: number,
  timestamp: number
) {
  const bearing = calculateBearing(userPos.latitude, userPos.longitude, phantom.lat, phantom.lon);
  const distance = calculateDistance(userPos.latitude, userPos.longitude, phantom.lat, phantom.lon);
  const normalizedDist = Math.min(distance / rangeMeters, 0.9);

  const angle = ((bearing - 90) * Math.PI) / 180;
  const x = Math.cos(angle) * (radius * normalizedDist);
  const y = Math.sin(angle) * (radius * normalizedDist);

  // Pulsing effect
  const pulse = Math.sin(timestamp / 200) * 0.3 + 0.7;
  const size = 8 * pulse;

  // Phantom glow (amber)
  ctx.shadowColor = '#ffb000';
  ctx.shadowBlur = 15 * pulse;

  ctx.strokeStyle = `rgba(255, 176, 0, ${pulse})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.stroke();

  // Inner ring
  ctx.beginPath();
  ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.shadowBlur = 0;
}

function drawCenter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isGenerating: boolean,
  timestamp: number
) {
  // Pulse when generating
  const pulse = isGenerating ? Math.sin(timestamp / 100) * 0.5 + 1 : 1;

  ctx.shadowColor = isGenerating ? '#ffb000' : '#00ff41';
  ctx.shadowBlur = 10 * pulse;

  ctx.fillStyle = isGenerating ? '#ffb000' : '#00ff41';
  ctx.beginPath();
  ctx.arc(x, y, 6 * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
}

function drawHeadingIndicator(
  ctx: CanvasRenderingContext2D,
  radius: number,
  heading: number,
  timestamp: number
) {
  // Convert heading to radians (heading 0 = north = top of screen = -90° in canvas coords)
  const angle = ((heading - 90) * Math.PI) / 180;

  // Draw a cone/wedge showing direction user is facing
  const coneLength = radius * 0.85;
  const coneWidth = 25 * (Math.PI / 180); // 25 degree cone

  // Pulsing glow
  const pulse = Math.sin(timestamp / 500) * 0.2 + 0.8;

  // Draw the direction cone
  ctx.save();

  // Filled cone (semi-transparent)
  ctx.fillStyle = `rgba(0, 255, 65, ${0.15 * pulse})`;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, coneLength, angle - coneWidth, angle + coneWidth);
  ctx.closePath();
  ctx.fill();

  // Cone outline
  ctx.strokeStyle = `rgba(0, 255, 65, ${0.5 * pulse})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(angle - coneWidth) * coneLength, Math.sin(angle - coneWidth) * coneLength);
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(angle + coneWidth) * coneLength, Math.sin(angle + coneWidth) * coneLength);
  ctx.stroke();

  // Direction arrow at the tip
  const arrowX = Math.cos(angle) * (radius - 25);
  const arrowY = Math.sin(angle) * (radius - 25);

  ctx.fillStyle = '#00ff41';
  ctx.shadowColor = '#00ff41';
  ctx.shadowBlur = 8;

  ctx.save();
  ctx.translate(arrowX, arrowY);
  ctx.rotate(angle + Math.PI / 2);

  // Triangle arrow
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(-5, 4);
  ctx.lineTo(5, 4);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
  ctx.shadowBlur = 0;
  ctx.restore();
}

export default Radar;
