import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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
