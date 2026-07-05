import { ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

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

const { S3Client, PutObjectCommand, GetObjectCommand } = await import('@aws-sdk/client-s3');

function getClient() {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

const BUCKET = process.env.R2_BUCKET_NAME;
const client = getClient();

const list = await client.send(new ListObjectsV2Command({
  Bucket: BUCKET,
  Prefix: 'collage-',
}));

const objects = list.Contents || [];
if (objects.length === 0) {
  console.log('ไม่มีรูปคอลลาจใน R2 (prefix: collage-)');
  process.exit(0);
}

console.log(`เจอรูปคอลลาจทั้งหมด ${objects.length} รูป:`);
const latest = objects.toSorted((a, b) => new Date(b.LastModified) - new Date(a.LastModified));
for (const o of latest.slice(0, 5)) {
  console.log(`  - ${o.Key} (${(o.Size / 1024).toFixed(1)} KB, ${o.LastModified.toISOString().slice(0, 10)})`);
}
if (objects.length > 5) {
  console.log(`  ... และอีก ${objects.length - 5} รูป`);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const answer = await new Promise(resolve => {
  rl.question(`\nยืนยันลบ ${objects.length} รูป? (y/N) `, resolve);
});
rl.close();

if (answer.toLowerCase() !== 'y') {
  console.log('ยกเลิก');
  process.exit(0);
}

// Delete in batches of 1000
let deleted = 0;
for (let i = 0; i < objects.length; i += 1000) {
  const batch = objects.slice(i, i + 1000).map(o => ({ Key: o.Key }));
  await client.send(new DeleteObjectsCommand({
    Bucket: BUCKET,
    Delete: { Objects: batch },
  }));
  deleted += batch.length;
  console.log(`ลบแล้ว ${deleted}/${objects.length}`);
}

console.log(`\n✅ ลบเรียบร้อย ${deleted} รูป`);
