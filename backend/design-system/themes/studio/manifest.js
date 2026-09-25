/* =============================================================================
   themes/studio/manifest.js - COLLAGE STUDIO (web design language)
   -----------------------------------------------------------------------------
   Mirrors the look/feel of the Collage Studio web app (frontend/style.css):
   - dark surfaces (#111318 / #0b0c0f) with lime accent (#c7f464)
   - offset card plates, quiet borders, and compact sequence markers
   - left-aligned output header with a small studio kicker
   - clean structure with no decorative chrome
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
    bg: { gradient: ['#111318', '#181b21', '#0b0c0f'], vertical: true },
    cell: {
      backplate: { dx: 10, dy: 12, rounded: 18, fill: '#08090b' },
      border: '#454852', width: 2, rounded: 18,
      bg: '#1b1d22',
      label: '{n}', labelColor: '#0a0a0c', labelBg: '#c7f464',
      labelSize: 16, labelHeight: 22, labelPad: 10,
      labelPosition: 'top-left', labelInset: 2, labelRounded: 4,
    },
    header: {
      kicker: 'STUDIO / 01', kickerFont: 'display', kickerColor: '#c7f464', kickerSize: 26,
      text: 'COLLAGE STUDIO',
      color: '#c7f464', font: 'display', size: 40, pad: 60, glow: false,
      align: 'left', margin: 120, ink: '#f4f4f0',
      stripe: '#c7f464', stripeHeight: 10, stripePos: 'top',
    },
    overlay: 'none',
    photoFx: 'saturate(1.08) brightness(1.02)',
  },

  hooks: {
    preDraw: null,
    postDraw: null,
  },
};
