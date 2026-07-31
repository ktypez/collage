/* =============================================================================
   themes/noc/manifest.js — PACKETGRID (NOC dashboard)
   ============================================================================= */

export const manifest = {
  id: 'noc',
  name: 'PACKETGRID',
  dot: '#00d4ff',

  ui: {
    heroMeta: '// NOC DASHBOARD · CLIENT-SIDE',
    genIdle: '▶ NO SIGNAL',
    genReady: '▶ TRANSMIT & RENDER',
    genHint: 'BGP route established · 0% loss',
    outputTitle: 'PACKETGRID · TX COMPLETE',
    outputTag: 'DELIVERED',
    uploadText: '[ ingest photos ]',
    logIntro: 'INTAKE photo-buffer --watch',
    ach: ['🏆 Lossless delivery', '🏆 12ms ping', '🏆 BGP route established', '🏆 0 drops'],
    heroTitle: 'PACKET<span class="accent">GRID</span>',
    heroDesc: 'Lossless photo intake → render → export.<br><code>$ ping canvas.ok</code> · 0% loss',
  },

  canvas: {
    bg: '#0a0e14',
    cell: {
      border: '#1f2733', width: 1.5, rounded: 3,
      label: 'P{n}', labelColor: '#00d4ff', labelBg: 'rgba(10,14,20,0.8)', labelAlign: 'left',
      bg: '#0f1419',
    },
    header: {
      text: 'PACKETGRID · UPTIME 99.99%',
      color: '#00d4ff', font: 'mono', size: 40, pad: 56, glow: false,
    },
    overlay: ['grid', 'connectors'],
    overlayOpts: {
      grid: { color: 'rgba(0,212,255,0.05)' },
      connectors: { color: 'rgba(0,212,255,0.30)' },
    },
    photoFx: 'none',
    presetAccent: false,
  },

  hooks: {
    preDraw: null, // grid + connectors handled by overlay
    postDraw: null,
  },
};
