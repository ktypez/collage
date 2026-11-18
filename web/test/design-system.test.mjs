import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('Collage consumes the shared V5 tokens without duplicating palette values', async () => {
  const css = await read('../src/app.css');
  const layout = await read('../src/routes/+layout.svelte');
  const core = await read('../node_modules/@mcky/ui/src/styles/core.css');
  assert.ok(layout.includes("@mcky/ui/core.css"));
  assert.ok(core.includes('@import \"./tokens.css\"'));
  assert.ok(!css.includes("@import '@mcky/ui/v5-tokens.css'"));
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


test('primary Studio and download actions use the shared Button component', async () => {
  const studio = await read('../src/lib/components/Studio.svelte');
  const page = await read('../src/routes/+page.svelte');
  assert.ok(studio.includes("Button as SharedButton"));
  assert.ok(studio.includes('<SharedButton type="button" variant="primary"'));
  assert.ok(page.includes("Button as SharedButton"));
  assert.ok(page.includes('<SharedButton type="button" variant="primary"'));
});
