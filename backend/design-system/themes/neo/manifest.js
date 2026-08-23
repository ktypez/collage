/* =============================================================================
   themes/neo/manifest.js — NEO GRID (modern intense)
   -----------------------------------------------------------------------------
   โมเดิร์นเข้มข้น จัดเต็มทุก element:
   - bg: deep navy gradient + generated grid texture (bgImage)
   - corner: 4 neon LEDs + bezel frame
    - divider: grid overlay
   - vignette + photoFx for depth
   ============================================================================= */

export const manifest = {
  id: 'neo',
  name: 'NEO GRID',
  dot: '#00ffd0',

  ui: {
    heroMeta: 'NEO_GRID // MODERN INTENSE',
    genIdle: '▶ NEO STANDBY',
    genReady: '▶ NEO RENDER READY',
    genHint: '// grid · vignette · bezel',
    outputTitle: 'NEO GRID · RENDERED',
    outputTag: 'NEO',
    uploadText: 'วางรูปที่นี่ — NEO',
    logIntro: '$ neo.grid --render',
    ach: ['◆ Grid locked', '◆ Vignette active', '◆ Bezel engaged', '◆ NEO online'],
    heroTitle: 'NEO<span class="ext">_GRID</span>',
    heroDesc: 'โมเดิร์นเข้มข้น — bg texture + corner LEDs + grid<br><span style="color:var(--fg-dim)">neon cyan × magenta · vignette · bezel</span>',
  },

  canvas: {
    bg: { gradient: ['#080a14', '#0f1428', '#080a14'], vertical: true },
    bgImage: 'backend/design-system/themes/neo/assets/bg.jpg',
    bgImageOpacity: 0.18,

    cell: {
      border: '#00ffd0',
      width: 2,
      rounded: 14,
      label: '{n}',
      labelColor: '#080a14',
      labelBg: '#00ffd0',
      labelSize: 26,
      bg: 'linear-gradient(180deg,#13182e,#0a0e1e)',
      shadow: 0.35,
    },

    header: {
      text: 'NEO GRID · SYSTEM ONLINE',
      color: '#00ffd0',
      font: 'mono',
      size: 36,
      pad: 56,
      glow: 12,
      stripe: '#ff3be8',
      stripeHeight: 4,
      stripePos: 'top',
    },

    overlay: ['grid', 'vignette'],
    overlayOpts: {
      grid: { color: 'rgba(0,255,208,0.07)', spacing: 48 },
      vignette: { intensity: 0.42 },
    },

    chrome: {
      bezel: { widthRatio: 0.012, color: '#06080f', glow: 'rgba(0,255,208,0.22)' },
      cornerLeds: [
        { x: 'left',  y: 'top',    sizeRatio: 0.009, padRatio: 0.022, color: '#00ffd0' },
        { x: 'right', y: 'top',    sizeRatio: 0.009, padRatio: 0.022, color: '#ff3be8' },
        { x: 'left',  y: 'bottom', sizeRatio: 0.009, padRatio: 0.022, color: '#ff3be8' },
        { x: 'right', y: 'bottom', sizeRatio: 0.009, padRatio: 0.022, color: '#00ffd0' },
      ],
    },

    photoFx: 'saturate(1.18) brightness(1.04)',
    presetAccent: false,
  },

  hooks: {
    preDraw: null,
    postDraw: null,
  },
};
