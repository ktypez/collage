/* =============================================================================
   themes/min/manifest.js — collage.sh (minimal geek) — DEFAULT theme
   -----------------------------------------------------------------------------
   presetAccent: true → the 7 day-of-week gradients render as an accent strip.
   ============================================================================= */
import { drawMinAccent } from './canvas.js';

export const manifest = {
  id: 'min',
  name: 'collage.sh',
  dot: '#c8ff00',

  ui: {
    heroMeta: '~/collage',
    genIdle: '▶ ./add-photos',
    genReady: '▶ ./build',
    genHint: '// it works on my machine.',
    outputTitle: 'collage.sh · DONE',
    outputTag: 'OK',
    uploadText: 'drop images here',
    logIntro: '$ collage.sh build',
    ach: ['🏆 Sent to Group', '🏆 Works on your machine', '🏆 Bash-ing since 2026', '🏆 99.99% uptime'],
    heroTitle: 'collage<span class="ext">.sh</span>',
    heroDesc: 'อัปโหลดรูป → build → download<br>It\'s just <span style="color:var(--success);font-family:monospace">bash</span>. But for your photos.',
  },

  canvas: {
    bg: '#fafafa',
    cell: {
      border: '#e5e5e8', width: 1, rounded: 6,
      label: '{n}', labelColor: 'rgba(0,0,0,0.45)', labelBg: 'rgba(255,255,255,0.75)',
      bg: '#f5f5f7',
    },
    header: {
      text: '$ collage.sh build --output=line',
      color: '#16161a', font: 'mono', size: 34, pad: 52, glow: false,
    },
    overlay: 'none',
    photoFx: 'none',
    presetAccent: true, // ← 7 day gradients = accent strip (only this theme)
  },

  hooks: {
    preDraw: null,
    postDraw: drawMinAccent,
  },
};
