import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';

let client = null;

function getClient() {
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

export async function getCollageStream(filename) {
  const response = await getClient().send(new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: filename,
  }));
  return response.Body;
}

export async function uploadCollage(buffer, filename) {
  await getClient().send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: filename,
    Body: buffer,
    ContentType: 'image/jpeg',
  }));

  const base = process.env.R2_PUBLIC_URL.replace(/\/+$/, '');
  return `${base}/${filename}`;
}

export async function cleanupOldCollages(maxAgeDays = 90) {
  const list = await getClient().send(new ListObjectsV2Command({
    Bucket: process.env.R2_BUCKET_NAME,
    Prefix: 'collage-',
  }));

  const objects = list.Contents || [];
  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
  const old = objects.filter(o => o.LastModified < cutoff);

  if (old.length === 0) {
    console.log(`Cleanup: no collages older than ${maxAgeDays} days`);
    return { deleted: 0 };
  }

  let deleted = 0;
  for (let i = 0; i < old.length; i += 1000) {
    const batch = old.slice(i, i + 1000).map(o => ({ Key: o.Key }));
    await getClient().send(new DeleteObjectsCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Delete: { Objects: batch },
    }));
    deleted += batch.length;
  }

  console.log(`Cleanup: deleted ${deleted} collages older than ${maxAgeDays} days`);
  return { deleted };
}
