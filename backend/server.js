import { readFileSync, createWriteStream, mkdirSync } from 'fs';
import { randomUUID, timingSafeEqual } from 'crypto';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
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
const {
  createCollage,
  SUPPORTED_PRESET_IDS,
  SUPPORTED_THEME_IDS,
} = await import('./collage.js');
const { uploadCollage, getCollageStream, cleanupOldCollages } = await import('./r2-storage.js');

const MAX_FILES = 20;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_TOTAL_UPLOAD_SIZE = positiveInt(process.env.MAX_TOTAL_UPLOAD_SIZE, 80 * 1024 * 1024);
const MAX_CONCURRENT_RENDERS = positiveInt(process.env.MAX_CONCURRENT_RENDERS, 1);
const RATE_LIMIT_MAX = positiveInt(process.env.COLLAGE_RATE_LIMIT_MAX, 10);
const RATE_LIMIT_WINDOW_MS = positiveInt(process.env.COLLAGE_RATE_LIMIT_WINDOW_MS, 10 * 60 * 1000);
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || 'https://report.mcky.space,https://collage-flax.vercel.app')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);
const SUPPORTED_THEMES = new Set(SUPPORTED_THEME_IDS);
const SUPPORTED_PRESETS = new Set(SUPPORTED_PRESET_IDS);

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use((_req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Referrer-Policy', 'no-referrer');
  next();
});
app.use(cors({
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Cleanup-Key'],
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.has('*') || ALLOWED_ORIGINS.has(origin) || /^https:\/\/([a-z0-9-]+\.)*vercel\.app$/i.test(origin)) {
      callback(null, true);
      return;
    }
    const error = new Error('Origin is not allowed');
    error.code = 'CORS_NOT_ALLOWED';
    callback(error);
  },
}));

mkdirSync('/tmp/uploads', { recursive: true });

function createLimitedStorage(maxTotalBytes) {
  const requestTotals = new WeakMap();
  return {
    _handleFile(req, file, callback) {
      const path = `/tmp/uploads/${randomUUID()}`;
      const output = createWriteStream(path, { flags: 'wx' });
      let bytes = requestTotals.get(req) || 0;
      let finished = false;

      const fail = (error) => {
        if (finished) return;
        finished = true;
        fs.unlink(path).catch(() => {});
        callback(error);
      };

      file.stream.on('data', (chunk) => {
        bytes += chunk.length;
        requestTotals.set(req, bytes);
        if (bytes <= maxTotalBytes) return;
        file.stream.unpipe(output);
        output.destroy();
        const error = new Error('Total upload is too large');
        error.code = 'TOTAL_UPLOAD_SIZE';
        fail(error);
      });
      file.stream.on('error', fail);
      output.on('finish', () => {
        if (finished) return;
        finished = true;
        callback(null, { path, size: bytes });
      });
      output.on('error', fail);
      file.stream.pipe(output);
    },
    _removeFile(_req, file, callback) {
      if (!file.path) {
        callback(null);
        return;
      }
      fs.unlink(file.path).then(() => callback(null), callback);
    },
  };
}

const upload = multer({
  storage: createLimitedStorage(MAX_TOTAL_UPLOAD_SIZE),
  limits: {
    files: MAX_FILES,
    fileSize: MAX_FILE_SIZE,
    fields: 4,
    fieldSize: 4096,
    parts: MAX_FILES + 10,
  },
  fileFilter(_req, file, cb) {
    if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
      cb(null, true);
      return;
    }
    const error = new Error('Unsupported file type');
    error.code = 'INVALID_FILE_TYPE';
    cb(error);
  },
});

const rateBuckets = new Map();
let activeRenders = 0;

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function clientError(code, message, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function readField(body, key, maxLength) {
  const value = body[key] ?? '';
  if (typeof value !== 'string') throw clientError('INVALID_FIELD', `${key} must be a string`);
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw clientError('FIELD_TOO_LONG', `${key} is too long`);
  return trimmed;
}

function cleanupFiles(files) {
  for (const file of files || []) {
    fs.unlink(file.path).catch(() => {});
  }
}

function enforceRequestSize(req, res, next) {
  const contentLength = Number.parseInt(req.get('content-length') || '0', 10);
  if (contentLength > MAX_TOTAL_UPLOAD_SIZE + 64 * 1024) {
    res.status(413).json({ success: false, error: 'Total upload is too large' });
    return;
  }
  next();
}

function rateLimitCollage(req, res, next) {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  let bucket = rateBuckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateBuckets.set(key, bucket);
  }
  if (bucket.count >= RATE_LIMIT_MAX) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.set('Retry-After', String(retryAfter));
    res.status(429).json({ success: false, error: 'Too many collage requests. Please try again later.' });
    return;
  }
  bucket.count += 1;

  if (rateBuckets.size > 5000) {
    for (const [ip, value] of rateBuckets) {
      if (now >= value.resetAt) rateBuckets.delete(ip);
    }
  }
  next();
}

function concurrencyGate(req, res, next) {
  if (activeRenders >= MAX_CONCURRENT_RENDERS) {
    res.set('Retry-After', '30');
    res.status(503).json({ success: false, error: 'The collage renderer is busy. Please try again shortly.' });
    return;
  }
  activeRenders += 1;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    activeRenders = Math.max(0, activeRenders - 1);
  };
  res.once('finish', release);
  res.once('close', release);
  next();
}

app.post('/api/collage', enforceRequestSize, rateLimitCollage, concurrencyGate, upload.array('images'), async (req, res) => {
  const files = req.files || [];
  try {
    if (files.length === 0) throw clientError('NO_IMAGES', 'No images uploaded');
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_TOTAL_UPLOAD_SIZE) {
      throw clientError('TOTAL_UPLOAD_SIZE', 'Total upload is too large', 413);
    }

    const name = readField(req.body, 'name', 80);
    const date = readField(req.body, 'date', 32);
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw clientError('INVALID_DATE', 'Date must use YYYY-MM-DD');
    }
    const preset = readField(req.body, 'preset', 10) || undefined;
    if (preset && !SUPPORTED_PRESETS.has(preset)) {
      throw clientError('INVALID_PRESET', 'Unknown day preset');
    }
    const theme = readField(req.body, 'theme', 24) || 'min';
    if (!SUPPORTED_THEMES.has(theme)) {
      throw clientError('INVALID_THEME', 'Unknown collage style');
    }

    const buffer = await createCollage(files, name, date, preset, theme);
    const filename = `collage-${randomUUID()}.jpg`;
    const imageUrl = await uploadCollage(buffer, filename);
    res.json({ success: true, imageUrl });
  } catch (error) {
    const mapped = mapError(error);
    if (mapped.status >= 500) console.error('Collage error:', error);
    res.status(mapped.status).json({ success: false, error: mapped.message });
  } finally {
    cleanupFiles(files);
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

function secretsMatch(actual, expected) {
  if (!actual || !expected) return false;
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

app.post('/api/cleanup', async (req, res) => {
  if (!secretsMatch(req.get('x-cleanup-key'), process.env.CLEANUP_SECRET)) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  try {
    const result = await cleanupOldCollages(15);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ success: false, error: 'Cleanup failed' });
  }
});

app.get('/api/image/:filename', async (req, res) => {
  const filename = req.params.filename;
  if (!/^collage-(?:\d+|[0-9a-f-]{36})\.jpg$/i.test(filename)) {
    res.status(400).json({ success: false, error: 'Invalid filename' });
    return;
  }
  try {
    const stream = await getCollageStream(filename);
    stream.once('error', (error) => {
      console.error('Image stream error:', error);
      if (!res.headersSent) res.status(404).json({ success: false, error: 'Image not found' });
      else res.destroy(error);
    });
    res.set('Content-Type', 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400, immutable');
    stream.pipe(res);
  } catch (error) {
    console.error('Image fetch error:', error);
    res.status(404).json({ success: false, error: 'Image not found' });
  }
});

function mapError(error) {
  if (error.code === 'CORS_NOT_ALLOWED') return { status: 403, message: 'Origin is not allowed' };
  if (error.code === 'LIMIT_FILE_SIZE') return { status: 413, message: 'Image is too large' };
  if (error.code === 'TOTAL_UPLOAD_SIZE') return { status: 413, message: 'Total upload is too large' };
  if (error.code === 'INVALID_FILE_TYPE') return { status: 400, message: 'Only JPEG, PNG, and WEBP images are allowed' };
  if (error.code === 'INVALID_IMAGE_TYPE') return { status: 415, message: 'Only JPEG, PNG, and WEBP images are allowed' };
  if (error.code === 'IMAGE_TOO_LARGE' || error.code === 'TOTAL_IMAGE_PIXELS' || error.code === 'OUTPUT_TOO_LARGE') {
    return { status: 413, message: error.message };
  }
  if (error.code === 'INVALID_IMAGE') return { status: 400, message: 'One or more uploaded files are not valid images' };
  if (
    error.code === 'NO_IMAGES' ||
    error.code === 'INVALID_FIELD' ||
    error.code === 'FIELD_TOO_LONG' ||
    error.code === 'INVALID_NAME' ||
    error.code === 'INVALID_DATE' ||
    error.code === 'INVALID_PRESET' ||
    error.code === 'INVALID_THEME' ||
    error.code === 'IMAGE_ASPECT_RATIO'
  ) {
    return { status: error.status || 400, message: error.message };
  }
  if (
    error.code === 'LIMIT_FILE_COUNT' ||
    error.code === 'LIMIT_FIELD_COUNT' ||
    error.code === 'LIMIT_FIELD_KEY' ||
    error.code === 'LIMIT_FIELD_VALUE' ||
    error.code === 'LIMIT_PART_COUNT' ||
    error.code === 'LIMIT_UNEXPECTED_FILE'
  ) {
    return { status: 400, message: 'Invalid multipart request' };
  }
  return { status: 500, message: 'Unable to create collage' };
}

app.use((error, req, res, next) => {
  cleanupFiles(req.files);
  if (res.headersSent) {
    next(error);
    return;
  }
  const mapped = mapError(error);
  if (mapped.status >= 500) console.error('Request error:', error);
  res.status(mapped.status).json({ success: false, error: mapped.message });
});

const isMain = process.argv[1] && resolve(process.argv[1]) === __filename;
if (isMain) {
  const port = positiveInt(process.env.PORT, 3000);
  app.listen(port, () => {
    console.log(`Collage API running on port ${port}`);
  });
  cleanupOldCollages(15).catch((error) => console.error('Startup cleanup error:', error));
}

export { app };
