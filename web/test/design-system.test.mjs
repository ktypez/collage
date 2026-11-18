import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('Collage consumes the shared V5 tokens without duplicating palette values', async () => {
  const css = await read('../src/app.css');
  assert.ok(css.startsWith("@import '@mcky/ui/v5-tokens.css';"));
  assert.match(css, /--bg:\s*var\(--paper\)/);
  assert.match(css, /--accent:\s*var\(--acc\)/);
  assert.doesNotMatch(css, /--paper:\s*#f6f2e9/);
  assert.doesNotMatch(css, /--acc:\s*#158068/);
});

test('the V5 mode is resolved before the app stylesheet paints', async () => {
  const html = await read('../src/app.html');
  assert.match(html, /data-palette="matcha"/);
  assert.match(html, /data-texture="on"/);
  assert.match(html, /root\.dataset\.mode\s*=\s*window\.matchMedia/);
});

test('the collage output theme registry remains independent of application palettes', async () => {
  const themePicker = await read('../src/lib/components/ThemePicker.svelte');
  const renderer = await read('../src/lib/collage/render.ts');
  assert.match(themePicker, /THEME_IDS/);
  assert.match(renderer, /renderCollage|THEMES/);
});
