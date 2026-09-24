import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';

let client = null;

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function getClient() {
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: requiredEnv('R2_ENDPOINT'),
      credentials: {
        accessKeyId: requiredEnv('R2_ACCESS_KEY_ID'),
        secretAccessKey: requiredEnv('R2_SECRET_ACCESS_KEY'),
      },
    });
  }
  return client;
}

export async function getCollageStream(filename) {
  const response = await getClient().send(new GetObjectCommand({
    Bucket: requiredEnv('R2_BUCKET_NAME'),
    Key: filename,
  }));
  return response.Body;
}

export async function uploadCollage(buffer, filename) {
  await getClient().send(new PutObjectCommand({
    Bucket: requiredEnv('R2_BUCKET_NAME'),
    Key: filename,
    Body: buffer,
    ContentType: 'image/jpeg',
    CacheControl: 'public, max-age=86400, immutable',
  }));

  const base = requiredEnv('R2_PUBLIC_URL').replace(/\/+$/, '');
  return `${base}/${filename}`;
}

export async function cleanupOldCollages(maxAgeDays = 30, s3 = getClient()) {
  const bucket = requiredEnv('R2_BUCKET_NAME');
  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
  const old = [];
  let continuationToken;
  let scanned = 0;

  do {
    const page = await s3.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: 'collage-',
      ContinuationToken: continuationToken,
    }));
    for (const object of page.Contents || []) {
      scanned += 1;
      if (object.LastModified && object.LastModified < cutoff) old.push(object);
    }
    if (page.IsTruncated && !page.NextContinuationToken) {
      throw new Error('R2 returned a truncated list without a continuation token');
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  if (old.length === 0) {
    console.log(`Cleanup: scanned ${scanned}, found no collages older than ${maxAgeDays} days`);
    return { scanned, deleted: 0 };
  }

  let deleted = 0;
  const deleteErrors = [];
  for (let i = 0; i < old.length; i += 1000) {
    const batch = old.slice(i, i + 1000).map((object) => ({ Key: object.Key }));
    const result = await s3.send(new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: batch },
    }));
    deleted += batch.length - (result.Errors?.length || 0);
    if (result.Errors?.length) {
      deleteErrors.push(...result.Errors.map((error) => `${error.Key}: ${error.Code || 'delete failed'}`));
    }
  }

  if (deleteErrors.length) {
    const error = new Error(`R2 cleanup failed for ${deleteErrors.length} objects`);
    error.details = deleteErrors.slice(0, 10);
    throw error;
  }

  console.log(`Cleanup: scanned ${scanned}, deleted ${deleted} collages older than ${maxAgeDays} days`);
  return { scanned, deleted };
}
