/* =============================================================================
   core/canvas-renderer.js — theme-aware generic canvas renderer
   -----------------------------------------------------------------------------
   Reads a theme MANIFEST (declarative spec) and draws the collage.
   Custom per-theme logic lives in theme hooks (preDraw/postDraw) in themes/&lt;id&gt;/canvas.js
   ============================================================================= */

import { coverRect } from '../engine/layout.js';
import { Overlays } from './overlays.js';

/* ---- small canvas helpers ---- */

function drawLinearGradient(ctx, x1, y1, x2, y2, stops) {
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  stops.forEach((s, i) => {
    const pos = i / (stops.length - 1);
    g.addColorStop(pos, s);
  });
  ctx.fillStyle = g;
}

function roundedRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* =============================================================================
   MAIN ENTRY — renderCollage(canvas, manifest, opts)
   opts = { photos: [{img}], cells: [...], size, gap, preset: 'sun'|null }
   ============================================================================= */
export function renderCollage(canvas, manifest, opts) {
  const { photos, cells, size, gap = 4, preset = null } = opts;
  const ctx = canvas.getContext('2d');
  const c = manifest.canvas;

  canvas.width = size;
  canvas.height = size;

  // 0. theme hooks preDraw (rails, grid, connectors — behind photos)
  if (manifest.hooks && manifest.hooks.preDraw) {
    ctx.save();
    manifest.hooks.preDraw(ctx, size, { photos, cells, preset, manifest });
    ctx.restore();
  }

  // 1. background
  drawBackground(ctx, c, size);

  // 2. header
  if (c.header) drawHeader(ctx, c, size);

  // 3. photo cells
  drawPhotoCells(ctx, c, photos, cells, size, gap, preset);

  // 4. theme hooks postDraw (LEDs, bezel, accent strip — on top)
  if (manifest.hooks && manifest.hooks.postDraw) {
    ctx.save();
    manifest.hooks.postDraw(ctx, size, { photos, cells, preset, manifest });
    ctx.restore();
  }

  // 5. generic overlays (scanline / vignette / ...)
  Overlays.apply(ctx, c.overlay, size, cells, manifest);

  return canvas;
}

/* ---- background ---- */

function drawBackground(ctx, c, size) {
  const bg = c.bg;
  if (!bg) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size); return; }
  if (typeof bg === 'string') {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
    return;
  }
  if (bg.gradient) {
    const vert = bg.vertical !== false;
    drawLinearGradient(
      ctx,
      0, vert ? 0 : size, 0, vert ? size : 0,
      bg.gradient
    );
    ctx.fillRect(0, 0, size, size);
    return;
  }
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);
}

/* ---- header ---- */

function drawHeader(ctx, c, size) {
  const h = c.header;
  const font = h.font === 'display'
    ? `600 ${h.size || 56}px 'VT323', monospace`
    : `600 ${h.size || 44}px 'JetBrains Mono', monospace`;

  ctx.save();
  ctx.font = font;
  ctx.textAlign = h.align || 'left';
  ctx.textBaseline = 'middle';

  const pad = h.pad ?? size * 0.045;
  const x = h.align === 'center' ? size / 2 : pad;
  const y = pad + (h.size || 44) * 0.5;

  if (h.glow) {
    ctx.shadowColor = h.color;
    ctx.shadowBlur = size * 0.02;
  }
  ctx.fillStyle = h.color;
  ctx.fillText(h.text, x, y);
  ctx.restore();
}

/* ---- photo cells ---- */

function drawPhotoCells(ctx, c, photos, cells, size, gap, preset) {
  const cellSpec = c.cell || {};
  const hasFilter = typeof ctx.filter === 'string';

  cells.forEach((cell, i) => {
    const photo = photos[i];
    const cellW = cell.w * size - gap;
    const cellH = cell.h * size - gap;
    const x = cell.x * size + gap / 2;
    const y = cell.y * size + gap / 2;

    // -- background chip behind photo (for gaps / frames) --
    if (cellSpec.bg) {
      ctx.fillStyle = cellSpec.bg;
      ctx.fillRect(x, y, cellW, cellH);
    }

    // -- draw photo with optional filter --
    if (photo) {
      ctx.save();
      if (hasFilter && c.photoFx) ctx.filter = c.photoFx;
      const { sx, sy, sw, sh } = coverRect(photo.img, cellW, cellH);
      if (cellSpec.rounded) {
        ctx.save();
        roundedRect(ctx, x, y, cellW, cellH, cellSpec.rounded);
        ctx.clip();
        ctx.drawImage(photo.img, sx, sy, sw, sh, x, y, cellW, cellH);
        ctx.restore();
      } else {
        ctx.drawImage(photo.img, sx, sy, sw, sh, x, y, cellW, cellH);
      }
      ctx.restore();
    }

    // -- cell border --
    if (cellSpec.border && cellSpec.width) {
      ctx.save();
      ctx.strokeStyle = cellSpec.border;
      ctx.lineWidth = cellSpec.width;
      if (cellSpec.rounded) {
        roundedRect(ctx, x + cellSpec.width / 2, y + cellSpec.width / 2, cellW - cellSpec.width, cellH - cellSpec.width, cellSpec.rounded);
        ctx.stroke();
      } else {
        ctx.strokeRect(x, y, cellW, cellH);
      }
      ctx.restore();
    }

    // -- cell label (e.g. UNIT 01 / P1 / 01) --
    if (cellSpec.label) {
      drawCellLabel(ctx, cellSpec, i + 1, x, y, cellW, size);
    }
  });
}

function drawCellLabel(ctx, cellSpec, n, x, y, cellW, size) {
  const text = cellSpec.label === true
    ? String(n).padStart(2, '0')
    : String(cellSpec.label).replace('{n}', String(n).padStart(2, '0'));

  ctx.save();
  ctx.font = `500 ${Math.max(11, size * 0.022)}px 'JetBrains Mono', monospace`;
  ctx.textAlign = cellSpec.labelAlign || 'right';
  ctx.textBaseline = 'bottom';
  const pad = Math.max(6, size * 0.014);
  const labelBg = cellSpec.labelBg ?? 'rgba(0,0,0,0.55)';
  const labelColor = cellSpec.labelColor ?? '#fff';

  const w = ctx.measureText(text).width + pad * 2;
  const h = Math.max(16, size * 0.03);
  const lx = cellSpec.labelAlign === 'left' ? x : x + cellW - w;

  ctx.fillStyle = labelBg;
  ctx.fillRect(lx, y + cellW - h, w, h); // bottom bar
  ctx.fillStyle = labelColor;
  ctx.fillText(text, lx + pad, y + cellW - pad);
  ctx.restore();
}
