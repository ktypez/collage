/* =============================================================================
   THEMED COLLAGES - Specialized renderers for unique layouts
   ============================================================================= */

import sharp from 'sharp';
import { textPathSVG } from '../core/sharp-renderer.js';
import { shapeThai } from '../core/hb-shape.js';

const DAY_COLORS_7DAYS = {
  mon: { primary: '#FFCBA4', name: 'จันทร์' },
  tue: { primary: '#98D8C8', name: 'อังคาร' },
  wed: { primary: '#C3B1E1', name: 'พุธ' },
  thu: { primary: '#F08080', name: 'พฤหัสบดี' },
  fri: { primary: '#87CEEB', name: 'ศุกร์' },
  sat: { primary: '#DDA0DD', name: 'เสาร์' },
  sun: { primary: '#FFD700', name: 'อาทิตย์' },
};

const DAY_COLORS_CALENDAR = {
  mon: { primary: '#008080', name: 'จันทร์' },
  tue: { primary: '#000080', name: 'อังคาร' },
  wed: { primary: '#228B22', name: 'พุธ' },
  thu: { primary: '#FFA500', name: 'พฤหัสบดี' },
  fri: { primary: '#0000FF', name: 'ศุกร์' },
  sat: { primary: '#800080', name: 'เสาร์' },
  sun: { primary: '#DC143C', name: 'อาทิตย์' },
};

const THAI_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * Measure Thai text width using SVG
 */
async function measureThaiText(text, fontSize, fontWeight, font, shaper) {
  // Use HarfBuzz shaper for Thai text
  if (shaper) {
    const shaped = shapeThai(shaper, text, fontSize, '#000000');
    return shaped.width;
  }
  // Fallback to opentype
  return font.getAdvanceWidth(text, fontSize);
}

/**
 * Scale text to fit within maxWidth
 */
function scaleTextToFit(measuredWidth, originalSize, maxWidth) {
  if (measuredWidth <= maxWidth) {
    return originalSize;
  }
  const scaleFactor = maxWidth / measuredWidth;
  return Math.floor(originalSize * scaleFactor * 0.95);
}

/**
 * Render Thai text with proper tone mark handling
 */
function renderThaiText(text, font, shaper, x, y, size, color, align = 'center', maxWidth = null) {
  let finalSize = size;
  
  if (maxWidth) {
    const measured = measureThaiTextSync(text, size, font, shaper);
    finalSize = scaleTextToFit(measured, size, maxWidth);
  }
  
  // Use HarfBuzz for Thai text
  if (shaper) {
    const shaped = shapeThai(shaper, text, finalSize, color);
    let tx = align === 'center' ? x - shaped.width / 2 : align === 'right' ? x - shaped.width : x;
    return `<g fill="${color}" transform="translate(${tx} ${y})">${shaped.svg}</g>`;
  }
  
  // Fallback to opentype
  const path = font.getPath(text, 0, 0, finalSize);
  const width = font.getAdvanceWidth(text, finalSize);
  let tx = align === 'center' ? x - width / 2 : align === 'right' ? x - width : x;
  return `<g fill="${color}" transform="translate(${tx} ${y})">${path.toSVG(2)}</g>`;
}

/**
 * Synchronous text measurement (for layout calculations)
 */
function measureThaiTextSync(text, fontSize, font, shaper) {
  if (shaper) {
    const shaped = shapeThai(shaper, text, fontSize, '#000000');
    return shaped.width;
  }
  return font.getAdvanceWidth(text, fontSize);
}

/* =============================================================================
   7 DAYS SOFT - Soft & Cute Pastel Style
   ============================================================================= */
export async function render7DaysCollage(files, name, date, preset, thaiFont, thaiShaper) {
  const W = 2160;
  const HEADER_H = 440; // Match test expectations
  const CARD_GAP = 56;
  const CARD_PADDING = 40;
  const CARD_RADIUS = 28;
  const PHOTO_RADIUS = 20;
  const COLUMNS = 2;
  const PAGE_PAD = 40;
  const MAX_OUTPUT_HEIGHT = 12000;

  const count = files.length;
  const usable = W - PAGE_PAD * 2;
  const cardW = Math.floor((usable - CARD_GAP * (COLUMNS - 1)) / COLUMNS);
  const photoW = cardW - CARD_PADDING * 2;

  // Calculate photo heights
  const dims = files.map(f => {
    const w = f.meta?.width || photoW;
    const h = f.meta?.height || photoW;
    const photoH = Math.round(photoW * h / w);
    return { photoW, photoH };
  });

  // Masonry layout
  const colHeights = [HEADER_H, HEADER_H];
  const placements = [];
  
  for (let i = 0; i < count; i++) {
    const colIdx = colHeights[0] < colHeights[1] ? 0 : 1;
    const x = PAGE_PAD + colIdx * (cardW + CARD_GAP);
    const y = colHeights[colIdx];
    const cardH = dims[i].photoH + CARD_PADDING * 2 + 60; // Extra for badge
    placements.push({ colIdx, x, y, ...dims[i], cardH });
    colHeights[colIdx] = y + cardH + CARD_GAP;
  }

  const contentH = Math.max(...colHeights) - CARD_GAP;
  const totalH = contentH + PAGE_PAD;

  if (totalH > MAX_OUTPUT_HEIGHT) {
    throw new Error(`Collage height exceeds ${MAX_OUTPUT_HEIGHT}px`);
  }

  // Build SVG
  const svg = [];
  
  // Background
  svg.push(`<rect width="${W}" height="${totalH}" fill="#fefefe"/>`);

  // Header
  const headerColor = DAY_COLORS_7DAYS[preset]?.primary || '#FFCBA4';
  svg.push(`<rect width="${W}" height="${HEADER_H}" fill="${headerColor}" fill-opacity="0.15"/>`);
  
  // Name
  if (name) {
    const nameY = HEADER_H * 0.47; // Match test expectations
    const maxTextWidth = W - 200;
    svg.push(renderThaiText(name, thaiFont, thaiShaper, W / 2, nameY, 112, '#2d2d2d', 'center', maxTextWidth));
  }
  
  // Date
  if (date) {
    const dateY = HEADER_H * 0.78; // Match test expectations
    svg.push(renderThaiText(date, thaiFont, thaiShaper, W / 2, dateY, 58, '#666666', 'center')); // Increased from 48 to 58
  }

  // Cards
  for (let i = 0; i < count; i++) {
    const p = placements[i];
    const dayKey = THAI_DAYS[i % 7];
    const dayColor = DAY_COLORS_7DAYS[dayKey];
    
    // Card background with shadow
    svg.push(`<rect x="${p.x}" y="${p.y}" width="${cardW}" height="${p.cardH}" 
               rx="${CARD_RADIUS}" fill="#ffffff" 
               filter="drop-shadow(0 16px 32px rgba(0,0,0,0.08))"/>`);
    
    // Day badge (floating at top center)
    const badgeSize = 28;
    const badgeX = p.x + cardW / 2;
    const badgeY = p.y + 20;
    svg.push(`<circle cx="${badgeX}" cy="${badgeY}" r="${badgeSize}" fill="${dayColor.primary}"/>`);
    
    // Photo placeholder (actual photo will be composited by sharp)
    const photoX = p.x + CARD_PADDING;
    const photoY = p.y + CARD_PADDING + 40; // Account for badge
    svg.push(`<rect x="${photoX}" y="${photoY}" width="${p.photoW}" height="${p.photoH}" 
               rx="${PHOTO_RADIUS}" fill="#f5f5f5"/>`);
  }

  const backdropSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${totalH}">${svg.join('')}</svg>`;
  const backdrop = await sharp(Buffer.from(backdropSVG)).png().toBuffer();

  // Composite photos
  const composites = [];
  for (let i = 0; i < count; i++) {
    const p = placements[i];
    const photoX = p.x + CARD_PADDING;
    const photoY = p.y + CARD_PADDING + 40;

    // Resize and round photo
    const rounded = await sharp(files[i].path)
      .resize(p.photoW, p.photoH, { fit: 'fill' })
      .png()
      .toBuffer();
    
    // Create rounded mask
    const mask = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${p.photoW}" height="${p.photoH}">
        <rect width="${p.photoW}" height="${p.photoH}" rx="${PHOTO_RADIUS}" fill="#fff"/>
      </svg>`
    );

    const roundedPhoto = await sharp({
      create: { width: p.photoW, height: p.photoH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    })
      .composite([
        { input: rounded, top: 0, left: 0 },
        { input: mask, top: 0, left: 0, blend: 'dest-in' }
      ])
      .png()
      .toBuffer();

    composites.push({ input: roundedPhoto, top: photoY, left: photoX });
  }

  const resultBuffer = await sharp(backdrop)
    .composite(composites)
    .jpeg({ quality: 100, chromaSubsampling: '4:4:4' })
    .toBuffer();

  const metadata = await sharp(resultBuffer).metadata();
  return {
    buffer: resultBuffer,
    width: metadata.width,
    height: metadata.height
  };
}

/* =============================================================================
   CALENDAR PRO - Professional Week View
   ============================================================================= */
export async function renderCalendarCollage(files, name, date, thaiFont, thaiShaper) {
  const W = 2160;
  const HEADER_H = 440; // Match test expectations
  const DAY_HEADER_H = 80;
  const DAY_COLUMNS = 7;
  const GRID_GAP = 2;
  const COLUMN_W = 308;
  const PHOTOS_PER_DAY = 2;
  const PHOTO_ASPECT = 1;
  const PAGE_PAD = 20;

  const count = Math.min(files.length, 14); // Max 14 photos (2 per day)
  
  // Calculate dimensions
  const totalDays = 7;
  const photoSize = (COLUMN_W - GRID_GAP) / 2;
  const dayH = DAY_HEADER_H + (photoSize * PHOTOS_PER_DAY) + GRID_GAP * 3;
  const totalH = HEADER_H + dayH + PAGE_PAD;

  // Build layout
  const placements = [];
  for (let dayIdx = 0; dayIdx < totalDays; dayIdx++) {
    const dayKey = THAI_DAYS[dayIdx];
    const dayColor = DAY_COLORS_CALENDAR[dayKey];
    
    const columnX = dayIdx * COLUMN_W;
    const headerY = HEADER_H;
    const photoY = headerY + DAY_HEADER_H + GRID_GAP;
    
    placements.push({
      dayIdx,
      dayKey,
      dayColor,
      columnX,
      headerY,
      photoY,
      photoSize
    });
  }

  // Build SVG
  const svg = [];
  
  // Background
  svg.push(`<rect width="${W}" height="${totalH}" fill="#f8f9fa"/>`);

  // Header (month/year)
  if (name || date) {
    svg.push(`<rect width="${W}" height="${HEADER_H}" fill="#ffffff"/>`);
    
    if (name) {
      const nameY = HEADER_H * 0.47; // Match test expectations
      svg.push(renderThaiText(name, thaiFont, thaiShaper, W / 2, nameY, 64, '#1a1a1a', 'center', W - 200));
    }
    if (date) {
      const dateY = HEADER_H * 0.78; // Match test expectations
      svg.push(renderThaiText(date, thaiFont, thaiShaper, W / 2, dateY, 58, '#666666', 'center')); // Increased from 40 to 58
    }
  }

  // Day columns
  for (const p of placements) {
    const { dayIdx, dayKey, dayColor, columnX, headerY, photoY, photoSize } = p;
    
    // Day header bar
    svg.push(`<rect x="${columnX}" y="${headerY}" width="${COLUMN_W}" height="${DAY_HEADER_H}" fill="${dayColor.primary}"/>`);
    
    // Day name (Thai, without "วัน" prefix)
    svg.push(renderThaiText(dayColor.name, thaiFont, thaiShaper, columnX + COLUMN_W / 2, headerY + DAY_HEADER_H * 0.6, 64, '#ffffff', 'center', COLUMN_W - 20));
    
    // Photo slots (2 photos per day)
    const photo1Y = photoY;
    const photo1X = columnX + GRID_GAP / 2;
    
    // Photo 1 placeholder
    svg.push(`<rect x="${photo1X}" y="${photo1Y}" width="${photoSize}" height="${photoSize}" fill="#e0e0e0"/>`);
    
    // Photo 2 placeholder
    const photo2X = columnX + photoSize + GRID_GAP;
    svg.push(`<rect x="${photo2X}" y="${photo1Y}" width="${photoSize}" height="${photoSize}" fill="#e0e0e0"/>`);
    
    // Column separators
    if (dayIdx < 6) {
      svg.push(`<line x1="${columnX + COLUMN_W}" y1="${headerY}" x2="${columnX + COLUMN_W}" y2="${totalH}" stroke="#E0E0E0" stroke-width="1"/>`);
    }
  }

  const backdropSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${totalH}">${svg.join('')}</svg>`;
  const backdrop = await sharp(Buffer.from(backdropSVG)).png().toBuffer();

  // Composite photos (2 per day, max 14 total)
  const composites = [];
  const photosToPlace = Math.min(count, 14);
  
  for (let i = 0; i < photosToPlace; i++) {
    const dayIdx = i % 7;
    const photoIdx = Math.floor(i / 7);
    const p = placements[dayIdx];
    
    const photoX = photoIdx === 0 ? p.columnX + GRID_GAP / 2 : p.columnX + p.photoSize + GRID_GAP;
    const photoY = p.photoY;

    // Resize photo to square
    const resized = await sharp(files[i].path)
      .resize(p.photoSize, p.photoSize, { fit: 'cover' })
      .jpeg({ quality: 100 })
      .toBuffer();

    composites.push({ input: resized, top: photoY, left: photoX });
  }

  const resultBuffer = await sharp(backdrop)
    .composite(composites)
    .jpeg({ quality: 100, chromaSubsampling: '4:4:4' })
    .toBuffer();

  const metadata = await sharp(resultBuffer).metadata();
  return {
    buffer: resultBuffer,
    width: metadata.width,
    height: metadata.height
  };
}
