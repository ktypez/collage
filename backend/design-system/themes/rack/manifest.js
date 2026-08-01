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
    bg: { gradient: ['#16161a', '#24242b', '#16161a'], vertical: false },
    cell: {
      border: '#2a2a32', width: 12, rounded: 48,
      label: 'UNIT {n}', labelColor: '#ffb000', labelBg: 'rgba(10,10,12,0.88)',
      labelSize: 42, labelHeight: 56,
      bg: '#ffffff', shadow: 0.28,
    },
    header: {
      text: 'STACK//FRAME · RACK 01',
      color: '#ffb000', font: 'mono', size: 40, pad: 60, glow: false,
    },
    overlay: 'none',
    photoFx: 'none',
    presetAccent: false,
    /* declarative chrome — rendered by sharp-renderer (mirrors client hooks) */
    chrome: {
      rails: {
        widthRatio: 0.03,
        dark: '#0a0a0c', mid: '#3a3a42', screw: '#5a5a63', screwOpacity: 0.8, highlight: 'rgba(255,255,255,0.06)',
      },
      leds: {
        colors: ['#00ff66', '#ffb000', '#00d4ff', '#00ff66', '#ffb000'],
        sizeRatio: 0.012, gapMul: 3.4, yMul: 3,
      },
    },
  },

  /* Custom hooks (unique rack chrome) */
  hooks: {
    preDraw: drawRackRails,
    postDraw: drawRackLeds,
  },
};
