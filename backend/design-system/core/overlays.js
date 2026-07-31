/* =============================================================================
   core/overlays.js — generic canvas overlay library
   -----------------------------------------------------------------------------
   Reusable effects driven by theme manifests. Each fn: overlay(ctx, size, cells, opts)
   ============================================================================= */

export const Overlays = {
  /** No overlay */
  none() {},

  /** CRT scanlines — horizontal dark lines */
  scanline(ctx, size, cells, opts = {}) {
    const spacing = opts.spacing ?? 4;
    const alpha = opts.alpha ?? 0.18;
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    for (let y = 0; y < size; y += spacing) {
      ctx.fillRect(0, y, size, 1);
    }
    ctx.restore();
  },

  /** CRT vignette — dark radial edges */
  vignette(ctx, size, cells, opts = {}) {
    const intensity = opts.intensity ?? 0.55;
    const r = size * 0.72;
    const g = ctx.createRadialGradient(size / 2, size / 2, r * 0.55, size / 2, size / 2, r);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${intensity})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  },

  /** NOC blueprint grid — thin vertical/horizontal lines */
  grid(ctx, size, cells, opts = {}) {
    let spacing = opts.spacing ?? size / 18;
    if (!spacing || spacing <= 0) spacing = size / 18;
    const color = opts.color ?? 'rgba(0,212,255,0.05)';
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    for (let x = 0; x <= size; x += spacing) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke();
    }
    for (let y = 0; y <= size; y += spacing) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
    }
    ctx.restore();
  },

  /** NOC connectors — lines from each cell toward center gateway */
  connectors(ctx, size, cells, opts = {}) {
    const color = opts.color ?? 'rgba(0,212,255,0.35)';
    const cx = size / 2, cy = size / 2;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, size / 700);
    cells.forEach((cell) => {
      const x = cell.x * size + cell.w * size / 2;
      const y = cell.y * size + cell.h * size / 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(cx + (x - cx) * 0.25, cy + (y - cy) * 0.25);
      ctx.stroke();
    });
    // center gateway node
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(3, size / 90), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  /** Resolve a manifest's overlay spec into actual drawing calls.
      manifest.canvas.overlay: string | string[] | fn */
  apply(ctx, spec, size, cells, manifest) {
    const ov = spec ?? 'none';
    if (typeof ov === 'function') return ov(ctx, size, cells, manifest);
    const list = Array.isArray(ov) ? ov : [ov];
    list.forEach((name) => {
      const opts = (manifest.canvas.overlayOpts && manifest.canvas.overlayOpts[name]) || {};
      const fn = Overlays[name];
      if (fn) fn(ctx, size, cells, opts);
    });
  },
};
