import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createCollage } from '../collage.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const previewDir = resolve(root, 'frontend/previews');
const sourceDir = resolve(root, 'frontend/previews/demo');
const sourceNames = ['order-clipboard.jpg', 'order-work.jpg', 'order-stack.jpg'];
const sourceFiles = [...sourceNames, ...sourceNames].map((name) => resolve(sourceDir, name));

const themes = [
  { id: 'min', output: 'pv-min.jpg' },
  { id: 'claude', output: 'pv-claude.jpg' },
  { id: 'studio', output: 'pv-studio.jpg' },
];

const requested = new Set(process.argv.slice(2));
const selected = requested.size
  ? themes.filter(({ id, output }) => requested.has(id) || requested.has(output.replace(/^pv-|\.jpg$/g, '')))
  : themes;

if (!selected.length) {
  throw new Error(`Choose one of: ${themes.map(({ id }) => id).join(', ')}`);
}

await mkdir(previewDir, { recursive: true });

for (const { id, output } of selected) {
  const collage = await createCollage(
    sourceFiles.map((path) => ({ path })),
    'ตัวอย่างงาน',
    '2026-09-25',
    'fri',
    id,
  );
  const target = resolve(previewDir, output);
  await sharp(collage)
    .resize({ width: 720, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90, chromaSubsampling: '4:4:4' })
    .toFile(target);
  console.log(`${id} -> ${target}`);
}
