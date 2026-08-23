/* =============================================================================
   themes/studio/manifest.js - COLLAGE STUDIO (web design language)
   -----------------------------------------------------------------------------
   Mirrors the look/feel of the Collage Studio web app (frontend/style.css):
   - dark surfaces (#17171b / #0a0a0c) with lime accent (#c7f464)
   - thin borders (#2a2a32), rounded cards, uppercase mono section labels
   - accent tick on each card like the chip-row accent; "01 / 02 / 03" mark
   - clean - no chrome, no overlays, no decorative LED rails
   ============================================================================= */
export const manifest = {
  id: 'studio',
  name: 'COLLAGE STUDIO',
  dot: '#c7f464',

  ui: {
    heroMeta: 'COLLAGE STUDIO // WEB EDITION',
    genIdle: '> ADD PHOTOS TO START',
    genReady: '> RENDER & EXPORT',
    genHint: '// section-labelled, lime accent',
    outputTitle: 'COLLAGE STUDIO // READY',
    outputTag: 'READY',
    uploadText: 'เชิ๋อุปโหลดที่นี่',
    logIntro: '$ studio.render',
    ach: ['* Studio certified', '* Section labels locked', '* Lime on dark', '* Clean & sharp'],
    heroTitle: 'Collage<span class="ext"> Studio</span>',
    heroDesc: 'mirror the web app - dark studio + lime accent + section labels<br><span style="color:var(--fg-dim)">web edition // same look</span>',
  },

  canvas: {
    bg: { gradient: ['#17171b', '#0f0f13', '#0a0a0c'], vertical: true },
    bgImage: 'frontend/previews/demo/renovation.jpg',
    bgImageOpacity: 0.08,
    cell: {
      border: '#2a2a32', width: 2, rounded: 14,
      label: '{n}', labelColor: '#c7f464', labelBg: 'rgba(10,10,12,0.85)',
      bg: 'linear-gradient(180deg,#18181d,#0f0f13)',
    },
    header: {
      text: '',
      color: '#c7f464', font: 'mono', size: 40, pad: 60, glow: false,
      stripe: '#c7f464', stripeHeight: 8, stripePos: 'top',
    },
    overlay: 'none',
    photoFx: 'saturate(1.1) brightness(1.02)',
    presetAccent: false,
  },

  hooks: {
    preDraw: null,
    postDraw: null,
  },
};
