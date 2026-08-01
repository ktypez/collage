/* =============================================================================
   themes/glitchpage/manifest.js — GLITCHPAGE (error-page theme)
   -----------------------------------------------------------------------------
   แกะ DNA จาก nginx error pages เดิม (/var/www/localhost/htdocs/*.html)
   - dark navy + drifting grid
   - glitch number (kanit 900, neon pink + cyan/yellow offset)
   - terminal block (mono, neon green)
   - pill button + glow
   - Thai copy ขำๆ 5 แบบ ตาม status code
   ============================================================================= */
export const manifest = {
  id: 'glitchpage',
  name: 'GLITCHPAGE',
  dot: '#ff3366',

  /* UI copy — error-page specific */
  ui: {
    heroMeta: '// ERROR · HOMELAB',
    genIdle: '> get /',
    genReady: '> 200 OK',
    genHint: '// 200 != guarantee',
    outputTitle: 'GLITCHPAGE · DEPLOYED',
    outputTag: 'LIVE',
    uploadText: 'ยิง request เข้ามาเลย',
    logIntro: '$ nginx -s reload',
    ach: ['🏆 404 ever closer', '🏆 Stack full of errors', '🏆 Cat-5 certified', '🏆 Ramba-served'],
    heroTitle: 'GLITCH<span class="ext">PAGE</span>',
    heroDesc: 'หน้า error แบบไม่หลงทางอีกต่อไป<br>เพราะหลงก็เห็นว่าหลง <span style="color:var(--accent-2);font-family:monospace">/dev/null</span>',
  },

  /* Design tokens — single source of truth */
  tokens: {
    bg:          '#0f0f1a',
    grid:        'rgba(255,255,255,0.03)',
    fg:          '#e0e0e0',
    fgMuted:     '#8899aa',
    fgDim:       '#556677',

    accent:      '#ff3366',  // neon pink — error
    accent2:     '#ff6633',  // orange — gradient tail / prompt user
    warn:        '#ff9933',  // orange highlight text
    success:     '#33ff66',  // neon green — terminal
    info:        '#00ffff',  // cyan — glitch layer
    gold:        '#ffff00',  // yellow — glitch layer
    blue:        '#3366ff',  // blue — prompt path

    fontDisp:    "'Kanit', 'Inter', sans-serif",
    fontBody:    "'Sarabun', 'Inter', sans-serif",
    fontMono:    "'JetBrains Mono', ui-monospace, monospace",
  },

  /* Status copy — ใช้ทุก status ที่ nginx ผูกอยู่ */
  statuses: {
    403: { title: '403 -- ต้องห้าม!',  sub: 'เฮ้! เขตแดนแมวน้ำหวงห้าม', desc: 'นายไม่มีสิทธิ์เข้าหน้านี้<br>หรือไม่ก็<b style="color:var(--warn)">ลืมใส่ token</b> ตอน 2 ทุ่ม',         term: 'cat /etc/shadow',     tone: 'forbidden' },
    404: { title: '404 -- หลงมาเหรอ?',  sub: 'หว่า! หลงทางรึเปล่าครับ?',     desc: 'หน้านี้ไม่มีอยู่จริง หรืออาจจะ<br><b style="color:var(--warn)">ยังไม่ได้สร้าง</b> &#128517;<br><br>แต่ช่างมันเถอะ นายแมวน้ำก็แค่กดผิดเองแหละ', term: 'cat /dev/urandom | grep "404"', tone: 'lost' },
    500: { title: '500 -- เซิฟเวอร์พัง!', sub: 'อุ๊ย! หลอดไหม้หมดแล้ว',          desc: 'เซิฟเวอร์ขอพักหายใจ<br>น่าจะเป็นที่ <b style="color:var(--warn)">ramba</b> รั่วอีกแล้ว',            term: 'journalctl -u nginx -n 20',    tone: 'broken' },
    502: { title: '502 -- เกตเวย์พาล!', sub: 'ประตูปิด ข้างหลังพัง',           desc: 'เกตเวย์ด้านในไม่ยอมตอบ<br>ลอง <b style="color:var(--warn)">เคาะ</b> ดูใหม่อีกที',                          term: 'curl -v http://upstream:3000', tone: 'gateway' },
    503: { title: '503 -- แมวน้ำพัก!', sub: 'เหนื่อยแล้ว ขอนอนก่อน',          desc: 'เซิฟเวอร์ขอพักชั่วคราว<br>เหมือน <b style="color:var(--warn)">คน</b> ทั่วไป',                                          term: 'systemctl status nginx',       tone: 'resting' },
  },

  /* Canvas manifest — สำหรับ collage output (error-themed grid) */
  canvas: {
    bg: { gradient: ['#0f0f1a', '#15152a', '#0f0f1a'], vertical: true },
    cell: {
      border: '#2a2a3a', width: 2, rounded: 4,
      label: 'ERR {n}', labelColor: '#ff3366', labelBg: 'rgba(0,0,0,0.65)',
      bg: '#15152a',
    },
    header: {
      text: 'GLITCHPAGE · ERR_OUTPUT',
      color: '#ff3366', font: 'mono', size: 36, pad: 48, glow: true,
    },
    overlay: 'grid',         // reuse generic blueprint grid
    photoFx: 'none',
    presetAccent: false,
  },

  hooks: {
    preDraw: null,
    postDraw: null,
  },
};
