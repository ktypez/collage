import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const envFile = readFileSync(resolve(__dirname, '.env'), 'utf-8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {}

const { default: express } = await import('express');
const { default: cors } = await import('cors');
const { default: multer } = await import('multer');
const fs = await import('fs/promises');
const { createCollage } = await import('./collage.js');
const { uploadCollage, getCollageStream, cleanupOldCollages } = await import('./r2-storage.js');

const app = express();
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

const upload = multer({ dest: '/tmp/uploads/' });

app.post('/api/collage', upload.array('images'), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No images uploaded' });
    }

    const name = (req.body.name || '').trim();
    const date = (req.body.date || '').trim();
    const preset = (req.body.preset || '').trim() || undefined;

    const buffer = await createCollage(files, name, date, preset);

    const filename = `collage-${Date.now()}.jpg`;
    await uploadCollage(buffer, filename);

    for (const f of files) {
      try { await fs.unlink(f.path); } catch {}
    }

    const imageUrl = `https://${req.get('host')}/api/image/${filename}`;
    res.json({ success: true, imageUrl });
  } catch (error) {
    console.error('Collage error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/cleanup', async (_req, res) => {
  try {
    const result = await cleanupOldCollages(90);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/image/:filename', async (req, res) => {
  try {
    const stream = await getCollageStream(req.params.filename);
    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    stream.pipe(res);
  } catch (error) {
    console.error('Image fetch error:', error);
    res.status(404).json({ success: false, error: 'Image not found' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Collage API running on port ${PORT}`);
});

cleanupOldCollages(90).catch(err => console.error('Startup cleanup error:', err));
