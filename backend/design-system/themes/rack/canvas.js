/* =============================================================================
   themes/rack/canvas.js — STACK//FRAME custom drawing hooks
   ============================================================================= */

/** Side rails + screws on both edges (behind photos) */
export function drawRackRails(ctx, size, opts) {
  const railW = Math.max(10, size * 0.024);
  const metal = ctx.createLinearGradient(0, 0, size, 0);

  // left rail
  metal.addColorStop(0, '#0a0a0c');
  metal.addColorStop(0.5, '#2a2a30');
  metal.addColorStop(1, '#0a0a0c');
  ctx.fillStyle = metal;
  ctx.fillRect(0, 0, railW, size);
  ctx.fillRect(size - railW, 0, railW, size);

  // screws
  const screwColor = '#5a5a63';
  const screwR = Math.max(2, size * 0.006);
  const nScrews = 6;
  for (let i = 0; i < nScrews; i++) {
    const sy = (i / (nScrews - 1)) * size;
    ctx.fillStyle = screwColor;
    ctx.beginPath();
    ctx.arc(railW / 2, sy, screwR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size - railW / 2, sy, screwR, 0, Math.PI * 2);
    ctx.fill();
  }

  // thin highlight lines on rails
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(railW, 0); ctx.lineTo(railW, size); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(size - railW, 0); ctx.lineTo(size - railW, size); ctx.stroke();
}

/** LED status row top-right (on top of photos) */
export function drawRackLeds(ctx, size, opts) {
  const ledColors = ['#00ff66', '#ffb000', '#00d4ff', '#00ff66', '#ffb000'];
  const n = ledColors.length;
  const r = Math.max(3, size * 0.008);
  const gap = r * 3.4;
  const startX = size - r * 2 - gap * n;
  const y = r * 3;

  ledColors.forEach((color, i) => {
    // glow
    const g = ctx.createRadialGradient(startX + i * gap, y, 0, startX + i * gap, y, r * 3);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(startX + i * gap, y, r * 3, 0, Math.PI * 2);
    ctx.fill();
    // dot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(startX + i * gap, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
}
