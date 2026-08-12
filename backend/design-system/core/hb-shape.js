/* =============================================================================
   core/hb-shape.js — Thai text shaping via HarfBuzz (harfbuzzjs)
   -----------------------------------------------------------------------------
   Why this exists:
     opentype.js 2.x crashes on ChakraPetch's Thai GSUB ("chaining substitution
     type 11 not supported"). The old workaround filtered defaultRenderOptions
     down to latn-only features, which silently dropped GPOS mark positioning —
     so Thai tone marks (วรรณยุกต์) lost their "above the consonant" placement
     and rendered at the baseline: "วันที่" looked like "วันที".

     HarfBuzz is the shaping engine browsers use under the hood. It applies Thai
     GSUB + GPOS correctly, so ่ ้ ๊ ๋ land where the type designer put them.

     The wasm is loaded from node_modules (relative to import.meta.url) with no
     native compile step, so it runs unchanged on Render.com / Vercel.
   ============================================================================= */

let hbPromise = null;

/** Load the harfbuzzjs module once (ESM + top-level wasm init). */
function getHarfBuzz() {
  if (!hbPromise) hbPromise = import('harfbuzzjs');
  return hbPromise;
}

let shaperPromise = null;

/**
 * Lazily create a shared HarfBuzz font from a font buffer.
 * Returns a promise resolving to { hb, blob, face, font } — resolved ONCE and
 * reused by every shape call (HarfBuzz Font objects are stateful — each shape
 * call must reset the scale via shapeThai()).
 */
export function getThaiShaper(fontBuffer) {
  if (!shaperPromise) {
    shaperPromise = (async () => {
      const hb = await getHarfBuzz();
      // hb.Blob takes an ArrayBuffer; keep a stable view of the Node Buffer.
      const ab = fontBuffer.buffer.slice(fontBuffer.byteOffset, fontBuffer.byteOffset + fontBuffer.byteLength);
      const blob = new hb.Blob(ab);
      const face = new hb.Face(blob);
      const font = new hb.Font(face);
      return { hb, blob, face, font };
    })();
    // On init failure, forget the promise so a later call can retry.
    shaperPromise.catch(() => { shaperPromise = null; });
  }
  return shaperPromise;
}

/**
 * Shape a Thai run with a resolved shaper ({ hb, font }) at `size` px and
 * return an SVG <g> fragment plus the total advance width.
 *
 * - font.setScale(size, size) makes advances/paths come out in px at that size.
 * - glyphToPath() returns path data in font space (y-up). We flip it with
 *   scale(1 -1) so it renders upright in SVG (y-down), then translate by the
 *   pen position + GPOS offsets — exactly how the browser places them.
 *
 * SYNC (not async): the shaper must already be resolved (see getThaiShaper).
 */
export function shapeThai(shaper, text, size, color) {
  const { hb, font } = shaper;
  font.setScale(size, size);
  const buf = new hb.Buffer();
  buf.addText(text);
  buf.guessSegmentProperties();
  buf.setDirection(hb.Direction.LTR);
  buf.setScript(hb.otTagToScript('thai'));
  buf.setLanguage(hb.otTagToLanguage('th-TH'));
  hb.shape(font, buf);
  const infos = buf.getGlyphInfos();
  const positions = buf.getGlyphPositions();
  let pen = 0;
  let out = '';
  for (let i = 0; i < infos.length; i++) {
    const pos = positions[i];
    const d = font.glyphToPath(infos[i].codepoint);
    out += `<g transform="translate(${pen + pos.xOffset} ${pos.yOffset}) scale(1 -1)"><path fill="${color}" d="${d}"/></g>`;
    pen += pos.xAdvance;
  }
  return { svg: out, width: pen };
}
