/* =============================================================================
   themes/rack/manifest.js — STACK//FRAME (server rack)
   ============================================================================= */
import { drawRackRails, drawRackLeds } from './canvas.js';

export const manifest = {
  id: 'rack',
  name: 'STACK//FRAME',
  dot: '#ffb000',

  /* UI copy */
  ui: {
    heroMeta: '// COLLAGE MAKER · CLIENT-SIDE',
    genIdle: '▶ ADD PHOTOS TO START',
    genReady: '▶ RENDER & EXPORT',
    genHint: '// canvas-based · no upload to server',
    outputTitle: 'RACK 01 · COLLAGE READY',
    outputTag: 'DEPLOYED',
    uploadText: 'คลิก หรือลากไฟล์มาที่นี่',
    logIntro: 'BOOT collage.kernel',
    ach: ['🏆 Render complete', '🏆 Uptime 99.99%', '🏆 Cat-5 certified', '🏆 Stack popped'],
    heroTitle: 'STACK<span class="slash">//</span>FRAME',
    heroDesc: 'อัปโหลดรูป → เราจัดวางให้อัตโนมัติ → ดาวน์โหลดเป็น PNG<br><span style="color:var(--fg-dim)">cat-5 certified · uptime 99.99%</span>',
  },

  /* Canvas manifest — single source of truth for rendering */
  canvas: {
    bg: { gradient: ['#16161a', '#1f1f25', '#16161a'], vertical: false },
    cell: {
      border: '#2a2a32', width: 2, rounded: 4,
      unit: true,
      unitTitle: 'UNIT {n}',
      unitTitleColor: 'rgba(255,176,0,0.85)',
      unitTitleSize: 24,
      unitHeadH: 48,
      bg: 'linear-gradient(180deg,#1c1c20,#0a0a0c)',
    },
    header: {
      text: '', // theme title intentionally empty — shows only name + date
      color: '#ffb000', font: 'mono', size: 40, pad: 60, glow: false,
    },
    overlay: 'none',
    photoFx: 'none',
    presetAccent: false,
    /* declarative chrome — rendered by sharp-renderer (mirrors client hooks) */
    chrome: {
      rails: {
        widthRatio: 0.02,
        dark: '#0a0a0c', mid: '#2a2a30', screw: '#5a5a63', screwOpacity: 0.7, highlight: 'rgba(255,255,255,0.05)',
      },
    },
  },

  /* Custom hooks (unique rack chrome) */
  hooks: {
    preDraw: drawRackRails,
    postDraw: drawRackLeds,
  },
};
