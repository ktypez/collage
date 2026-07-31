/* =============================================================================
   themes/crt/canvas.js — PIXSH custom drawing hooks
   ============================================================================= */

/** Thick dark bezel frame around the "screen" */
export function drawCrtBezel(ctx, size, opts) {
  const bw = Math.max(16, size * 0.045);
  ctx.save();
  // bezel ring
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, size, size);
  // inner screen (darker)
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(bw, bw, size - bw * 2, size - bw * 2);
  // inner glow line
  ctx.strokeStyle = 'rgba(0,255,102,0.25)';
  ctx.lineWidth = Math.max(1, size * 0.004);
  ctx.strokeRect(bw * 0.6, bw * 0.6, size - bw * 1.2, size - bw * 1.2);
  ctx.restore();
}

/** Tiny power / signal LEDs on the bezel */
export function drawCrtCornerLeds(ctx, size, opts) {
  const r = Math.max(3, size * 0.009);
  const pad = Math.max(12, size * 0.035);
  const leds = [
    { x: pad, y: size - pad, color: '#00ff66' },   // power
    { x: pad + r * 4, y: size - pad, color: '#ffb000' }, // activity
  ];
  ctx.save();
  leds.forEach((led) => {
    ctx.fillStyle = led.color;
    ctx.beginPath();
    ctx.arc(led.x, led.y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}
