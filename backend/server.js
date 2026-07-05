import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs/promises';
import { createCollage } from './collage.js';
import { uploadCollage } from './r2-storage.js';

const app = express();
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

    const buffer = await createCollage(files, name, date);

    const filename = `collage-${Date.now()}.jpg`;
    const imageUrl = await uploadCollage(buffer, filename);

    for (const f of files) {
      try { await fs.unlink(f.path); } catch {}
    }

    res.json({ success: true, imageUrl });
  } catch (error) {
    console.error('Collage error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Collage API running on port ${PORT}`);
});
