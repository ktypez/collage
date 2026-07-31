/* =============================================================================
   themes/min/canvas.js — collage.sh custom drawing hooks
   ============================================================================= */
import { DAY_PRESETS, DAY_NAMES } from '../../engine/layout.js';

/**
 * Draw the day-of-week preset as a thin accent strip at the bottom.
 * Only active when manifest.canvas.presetAccent is true.
 */
export function drawMinAccent(ctx, size, opts) {
  const preset = opts.preset;
  const manifest = opts.manifest;
  if (!manifest.canvas.presetAccent || !preset) return;

  const stops = DAY_PRESETS[preset];
  if (!stops) return;

  const stripH = Math.max(10, size * 0.024);
  ctx.save();

  // accent strip (gradient across bottom)
  const g = ctx.createLinearGradient(0, size - stripH, size, size - stripH);
  stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
  ctx.fillStyle = g;
  ctx.fillRect(0, size - stripH, size, stripH);

  // day label at right
  const label = `// ${DAY_NAMES[preset] || preset}`;
  ctx.font = `500 ${Math.max(12, size * 0.018)}px 'JetBrains Mono', monospace`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText(label, size - size * 0.02, size - stripH / 2);

  ctx.restore();
}
