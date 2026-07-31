/* =============================================================================
   themes/crt/manifest.js — PIXSH v1.0 (CRT terminal)
   ============================================================================= */
import { drawCrtBezel, drawCrtCornerLeds } from './canvas.js';

export const manifest = {
  id: 'crt',
  name: 'PIXSH v1.0',
  dot: '#00ff66',

  ui: {
    heroMeta: '[ CRT EDITION · VT323 ]',
    genIdle: '► LOAD PHOTOS TO START',
    genReady: '► EXECUTE COMPILE',
    genHint: '// it works on my crt.',
    outputTitle: 'PIXSH v1.0 · COMPILED',
    outputTag: '200 OK',
    uploadText: '[ drop image files here ]',
    logIntro: '$ pixsh build --input=photos',
    ach: ['🏆 It works on my CRT', '🏆 (core dumped) → recovered', '🏆 Phosphor loaded', '🏆 Segfault avoided'],
    heroTitle: 'PIXSH<span style="color:var(--accent)">_</span>',
    heroDesc: 'อัปโหลดรูป → compile → PNG<br><span class="accent">// it works on my crt.</span>',
  },

  canvas: {
    bg: '#0a0a0a',
    cell: {
      border: '#003318', width: 2, rounded: 6,
      label: false,
      bg: '#050505',
    },
    header: {
      text: 'PIXSH v1.0',
      color: '#00ff66', font: 'display', size: 88, pad: 70, glow: true,
    },
    overlay: ['scanline', 'vignette'],
    overlayOpts: {
      scanline: { spacing: 4, alpha: 0.18 },
      vignette: { intensity: 0.55 },
    },
    photoFx: 'saturate(0.85) brightness(0.95)',
    presetAccent: false,
    /* declarative chrome — rendered by sharp-renderer (mirrors client hooks) */
    chrome: {
      bezel: {
        widthRatio: 0.045,
        color: '#111111', inner: '#0a0a0a', glow: 'rgba(0,255,102,0.25)',
      },
      cornerLeds: [
        { x: 'left', y: 'bottom', padRatio: 0.035, color: '#00ff66', sizeRatio: 0.009 },
        { x: 'left', y: 'bottom', padRatio: 0.035, dxRatio: 0.036, color: '#ffb000', sizeRatio: 0.009 },
      ],
    },
  },

  hooks: {
    preDraw: null,
    postDraw: (ctx, size, opts) => {
      drawCrtBezel(ctx, size, opts);
      drawCrtCornerLeds(ctx, size, opts);
    },
  },
};
