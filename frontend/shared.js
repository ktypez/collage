/* =============================================================================
   shared.js — logic shared by both pages:
     * liff.html  (/liff)  — LINE flow: generate -> send to group -> close
     * index.html (/)      — web flow:  generate -> download / open in LINE

   This file ONLY wires up handlers for widgets that exist on the page (each
   lookup is guarded), so the same file is safe to load on either page.

   Each page defines `window.onCollageReady(data)` to say what happens once the
   backend has produced a collage (data.imageUrl). If omitted, falls back to
   rendering a download button via `window.renderResult(data)` (see below).
   ============================================================================= */

/* ---------- config ---------- */
const CONFIG = {
  API_BASE: 'https://collage-7cgv.onrender.com',
  LIFF_ID: '2010606328-7UnH1Yre',
  MAX_FILES: 20,
  MAX_FILE_SIZE: 20 * 1024 * 1024,
  MAX_TOTAL_SIZE: 80 * 1024 * 1024,
  ALLOWED_FILE_TYPES: new Set(['image/jpeg', 'image/png', 'image/webp']),
  FETCH_TIMEOUT_MS: 120000,
  THEME_IDS: { '7days': 'min', calendar: 'calendar', claude: 'claude', lumen: 'lumen', post: 'post', studio: 'studio', cinema: 'cinema', velvet: 'velvet' },
  THEME_LABELS: { '7days': '7 DAYS', calendar: 'CALENDAR', claude: 'CLAUDE', lumen: 'LUMEN', post: 'POST', studio: 'STUDIO', cinema: 'CINEMA', velvet: 'VELVET' },
  TH_MONTHS: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
  MONTHS: ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'],
  DAYS: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
  DAY_LABELS: ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'],
};

const $ = (id) => document.getElementById(id);

/* ---------- name persistence ---------- */
const nameInput = $('nameInput');
if (nameInput) {
  const saved = localStorage.getItem('collage_name');
  if (saved) nameInput.value = saved;
  nameInput.addEventListener('input', () => localStorage.setItem('collage_name', nameInput.value));
}

/* ---------- date picker (custom calendar) ---------- */
let calYear, calMonth; // month 0-based
let selectedISO = null;

function isoToParts(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m: m - 1, d };
}
function pad2(n) { return String(n).padStart(2, '0'); }
function formatISO(y, m, d) { return y + '-' + pad2(m + 1) + '-' + pad2(d); }
function setDateValue(iso) {
  if (!iso) return;
  selectedISO = iso;
  const { y, m, d } = isoToParts(iso);
  const dateInput = $('dateInput');
  if (dateInput) {
    dateInput.value = d + ' ' + CONFIG.TH_MONTHS[m] + ' ' + y;
    dateInput.dataset.iso = iso;
  }
  const dt = new Date(y, m, d);
  calYear = dt.getFullYear();
  calMonth = dt.getMonth();
  renderCalendar();
}
function renderCalendar() {
  if (!($('calTitle') && $('calGrid'))) return;
  calYear = calYear ?? new Date().getFullYear();
  calMonth = calMonth ?? new Date().getMonth();
  $('calTitle').textContent = CONFIG.TH_MONTHS[calMonth] + ' ' + calYear;
  const firstDow = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const prevDays = new Date(calYear, calMonth, 0).getDate();
  const today = new Date();
  const todayISO = formatISO(today.getFullYear(), today.getMonth(), today.getDate());
  let cells = '';
  for (let i = firstDow - 1; i >= 0; i--) {
    const d = prevDays - i;
    const py = calMonth === 0 ? calYear - 1 : calYear;
    const pm = calMonth === 0 ? 11 : calMonth - 1;
    const iso = formatISO(py, pm, d);
    cells += '<button type="button" class="cal-day is-out" data-iso="' + iso + '" tabindex="-1">' + d + '</button>';
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = formatISO(calYear, calMonth, d);
    const cls = 'cal-day' + (iso === todayISO ? ' is-today' : '') + (iso === selectedISO ? ' is-selected' : '');
    cells += '<button type="button" class="' + cls + '" data-iso="' + iso + '">' + d + '</button>';
  }
  $('calGrid').innerHTML = cells;
}
function openDatePopup() {
  const pop = $('datePopup');
  if (!pop) return;
  pop.hidden = false;
  for (const id of ['dateToggle', 'dateInput']) {
    const control = $(id);
    if (control) control.setAttribute('aria-expanded', 'true');
  }
  renderCalendar();
}
function closeDatePopup() {
  const pop = $('datePopup');
  if (!pop) return;
  pop.hidden = true;
  for (const id of ['dateToggle', 'dateInput']) {
    const control = $(id);
    if (control) control.setAttribute('aria-expanded', 'false');
  }
}
function isDatePopupOpen() { return $('datePopup') && !$('datePopup').hidden; }

(function initDatePicker() {
  const dateInput = $('dateInput');
  if (!dateInput) return;
  dateInput.addEventListener('click', () => isDatePopupOpen() ? closeDatePopup() : openDatePopup());
  dateInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    isDatePopupOpen() ? closeDatePopup() : openDatePopup();
  });
  const tg = $('dateToggle');
  if (tg) tg.addEventListener('click', (e) => {
    e.stopPropagation();
    isDatePopupOpen() ? closeDatePopup() : openDatePopup();
  });
  if ($('calPrev')) $('calPrev').addEventListener('click', () => { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); });
  if ($('calNext')) $('calNext').addEventListener('click', () => { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); });
  if ($('calToday')) $('calToday').addEventListener('click', () => {
    const n = new Date();
    setDateValue(formatISO(n.getFullYear(), n.getMonth(), n.getDate()));
    closeDatePopup();
  });
  if ($('calGrid')) $('calGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('.cal-day');
    if (!btn) return;
    setDateValue(btn.dataset.iso);
    closeDatePopup();
  });
  document.addEventListener('click', (e) => {
    if (isDatePopupOpen() && !e.target.closest('.date-wrap')) closeDatePopup();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isDatePopupOpen()) closeDatePopup();
  });
})();

/* ---------- state ---------- */
let imageFiles = [];
let imageUrls = [];
let outputMode = '7days';
let selectedPreset = CONFIG.DAYS[new Date().getDay()];

/* ---------- output style picker (themes) ---------- */
(function initThemePicker() {
  const themePreviewImg = $('themePreviewImg');
  const themePreviewCap = $('themePreviewCap');
  const themePreviewHead = $('themePreviewHead');
  if (themePreviewHead) themePreviewHead.addEventListener('click', () => {
    const el = themePreviewHead.closest('.theme-preview');
    if (!el) return;
    const open = el.classList.toggle('open');
    themePreviewHead.setAttribute('aria-expanded', String(open));
  });

  function applyOutputMode() {
    document.querySelectorAll('.ochip').forEach((c) =>
      c.classList.toggle('active', c.dataset.mode === outputMode));
    const daySection = $('dayPresetSection');
    if (daySection) daySection.style.display = (outputMode === '7days' || outputMode === 'calendar') ? 'block' : 'none';
    if (themePreviewImg) themePreviewImg.src = 'previews/pv-' + (CONFIG.THEME_IDS[outputMode] || 'min') + '.jpg';
    if (themePreviewCap) themePreviewCap.textContent = CONFIG.THEME_LABELS[outputMode] || outputMode;
  }

  document.querySelectorAll('.ochip').forEach((chip) => {
    chip.addEventListener('click', () => {
      outputMode = chip.dataset.mode;
      applyOutputMode();
    });
  });
  applyOutputMode();
})();

/* ---------- day-of-week preset (7 colors) ---------- */
(function initPresetPicker() {
  if (!$('presetPicker')) return;
  const todayLabel = $('todayLabel');
  if (todayLabel) todayLabel.innerHTML = 'today: <strong>' + CONFIG.DAY_LABELS[new Date().getDay()] + '</strong>';
  document.querySelectorAll('.theme-btn[data-preset]').forEach((btn) => {
    const active = btn.dataset.preset === selectedPreset;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
    btn.addEventListener('click', () => {
      document.querySelectorAll('.theme-btn[data-preset]').forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      selectedPreset = btn.dataset.preset;
    });
  });
})();

/* ---------- file management + preview ---------- */
function addFiles(newFiles) {
  const errors = [];
  let totalBytes = imageFiles.reduce((sum, file) => sum + file.size, 0);
  for (const file of newFiles) {
    if (imageFiles.length >= CONFIG.MAX_FILES) {
      errors.push(`เลือกได้ไม่เกิน ${CONFIG.MAX_FILES} รูป`);
      break;
    }
    if (!CONFIG.ALLOWED_FILE_TYPES.has(file.type)) {
      errors.push(`${file.name}: รองรับเฉพาะ JPEG, PNG และ WEBP`);
      continue;
    }
    if (file.size > CONFIG.MAX_FILE_SIZE) {
      errors.push(`${file.name}: ไฟล์ใหญ่เกิน 20MB`);
      continue;
    }
    if (totalBytes + file.size > CONFIG.MAX_TOTAL_SIZE) {
      errors.push('ขนาดรูปรวมต้องไม่เกิน 80MB');
      break;
    }
    imageFiles.push(file);
    imageUrls.push(URL.createObjectURL(file));
    totalBytes += file.size;
  }
  renderPreview();
  if (errors.length) setStatus($('status'), errors[0], 'error');
}
function removeFile(idx) {
  URL.revokeObjectURL(imageUrls[idx]);
  imageFiles.splice(idx, 1);
  imageUrls.splice(idx, 1);
  renderPreview();
}
function moveFile(from, to) {
  if (to < 0 || to >= imageFiles.length) return;
  [imageFiles[from], imageFiles[to]] = [imageFiles[to], imageFiles[from]];
  [imageUrls[from], imageUrls[to]] = [imageUrls[to], imageUrls[from]];
  renderPreview();
}
function renderPreview() {
  const grid = $('previewGrid');
  if (!grid) return;
  grid.innerHTML = '';
  imageUrls.forEach((url, i) => {
    const item = document.createElement('div');
    item.className = 'preview-item';
    item.draggable = true;
    item.dataset.idx = i;

    const img = document.createElement('img');
    img.src = url;
    img.alt = 'รูปที่ ' + (i + 1);
    const num = document.createElement('div');
    num.className = 'preview-num';
    num.textContent = i + 1;
    const removeBtn = document.createElement('button');
    removeBtn.className = 'preview-remove';
    removeBtn.textContent = '×';
    removeBtn.setAttribute('aria-label', 'ลบรูปที่ ' + (i + 1));
    removeBtn.onclick = (e) => { e.stopPropagation(); removeFile(i); };

    const movePrev = document.createElement('button');
    movePrev.className = 'preview-move preview-move-prev';
    movePrev.type = 'button';
    movePrev.textContent = '←';
    movePrev.setAttribute('aria-label', 'ย้ายรูปที่ ' + (i + 1) + ' ไปก่อนหน้า');
    movePrev.disabled = i === 0;
    movePrev.onclick = (e) => { e.stopPropagation(); moveFile(i, i - 1); };

    const moveNext = document.createElement('button');
    moveNext.className = 'preview-move preview-move-next';
    moveNext.type = 'button';
    moveNext.textContent = '→';
    moveNext.setAttribute('aria-label', 'ย้ายรูปที่ ' + (i + 1) + ' ไปถัดไป');
    moveNext.disabled = i === imageFiles.length - 1;
    moveNext.onclick = (e) => { e.stopPropagation(); moveFile(i, i + 1); };

    item.appendChild(img);
    item.appendChild(num);
    item.appendChild(removeBtn);
    item.appendChild(movePrev);
    item.appendChild(moveNext);
    grid.appendChild(item);

    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', i);
      item.classList.add('dragging');
    });
    item.addEventListener('dragend', () => item.classList.remove('dragging'));
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      item.classList.add('dragover-item');
    });
    item.addEventListener('dragleave', () => item.classList.remove('dragover-item'));
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('dragover-item');
      const from = Number.parseInt(e.dataTransfer.getData('text/plain'), 10);
      const to = Number.parseInt(item.dataset.idx, 10);
      if (Number.isInteger(from) && Number.isInteger(to) && from !== to) moveFile(from, to);
    });

  });
}

(function initUpload() {
  const zone = $('uploadZone');
  const fileInput = $('fileInput');
  if (!zone || !fileInput) return;
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    addFiles(e.dataTransfer.files);
  });
  fileInput.addEventListener('change', (e) => {
    addFiles(e.target.files);
    e.target.value = '';
  });
})();

/* ---------- status ---------- */
function setStatus(el, text, type) {
  if (!el) return;
  el.textContent = text;
  el.className = (el.className.split(' ')[0] || '') + ' ' + type;
}

/* ---------- generate (shared core) ---------- */
async function generateCollage() {
  const submitBtn = $('submitBtn');
  const status = $('status');
  if (!imageFiles.length) {
    setStatus(status, 'เลือกรูปอย่างน้อย 1 รูปก่อน', 'error');
    return;
  }
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
  }
  if (status) { status.textContent = 'กำลังสร้างภาพ...'; status.classList.add('loading'); status.classList.remove('error', 'success'); }

  try {
    const fd = new FormData();
    fd.append('name', ($('nameInput') || {}).value || '');
    fd.append('date', ($('dateInput') || {}).dataset?.iso || ($('dateInput') || {}).value || '');
    fd.append('preset', selectedPreset || '');
    fd.append('theme', CONFIG.THEME_IDS[outputMode] || 'min');
    for (const f of imageFiles) fd.append('images', f);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.FETCH_TIMEOUT_MS);
    let res;
    let data;
    try {
      res = await fetch(CONFIG.API_BASE.replace(/\/+$/, '') + '/api/collage', {
        method: 'POST',
        body: fd,
        signal: controller.signal,
      });
      const contentType = res.headers.get('content-type') || '';
      data = contentType.includes('application/json')
        ? await res.json()
        : { success: false, error: `เซิร์ฟเวอร์ตอบกลับผิดรูปแบบ (${res.status})` };
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok || !data.success) throw new Error(data.error || 'เกิดข้อผิดพลาด ไม่ทราบสาเหตุ');

    // Let the page decide what happens next (send to LINE / download).
    if (typeof window.onCollageReady === 'function') {
      await window.onCollageReady(data);
    } else if (typeof renderResult === 'function') {
      renderResult(data);
    } else {
      throw new Error('missing onCollageReady handler');
    }
  } catch (err) {
    const message = err.name === 'AbortError'
      ? 'สร้างภาพนานเกินกำหนด กรุณาลองใหม่หรือลดจำนวนรูป'
      : err.message;
    setStatus(status, message, 'error');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    }
  }
}

/* ---------- default "download" page handler (web) ----------
   Called when this file is loaded on a page that does NOT define
   window.onCollageReady. Renders a download button the user can click.
   ----------------------------------------------------------------- */
function renderResult(data) {
  const status = $('status');
  const submitBtn = $('submitBtn');
  if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('loading'); }

  // Remove any previous result block
  const prev = document.getElementById('resultArea');
  if (prev) prev.remove();

  const wrap = document.createElement('div');
  wrap.id = 'resultArea';
  wrap.className = 'result-area';

  const header = document.createElement('div');
  header.className = 'result-title';
  header.textContent = 'พร้อมแบบรูปเรียบร้อย';

  const preview = document.createElement('img');
  preview.className = 'result-img';
  preview.src = data.imageUrl;
  preview.alt = 'ภาพคอลลาจที่สร้างเสร็จ';

  const download = document.createElement('a');
  download.className = 'result-download';
  download.href = data.imageUrl;
  download.download = 'collage-' + Date.now() + '.jpg';
  download.textContent = 'ดาวน์โหลดรูป';
  download.setAttribute('download', '');

  wrap.appendChild(header);
  wrap.appendChild(preview);
  wrap.appendChild(download);

  if (submitBtn && submitBtn.parentElement) {
    submitBtn.parentElement.insertBefore(wrap, submitBtn.nextSibling);
  } else {
    document.body.appendChild(wrap);
  }
  if (status) { status.textContent = ''; status.className = 'status'; }
}

/* Expose for pages that call it from inline HTML (onclick etc.) */
window.generateCollage = generateCollage;
window.setDateValue = setDateValue;
window.renderResult = renderResult;