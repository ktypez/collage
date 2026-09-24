import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanupOldCollages } from '../r2-storage.js';

process.env.R2_BUCKET_NAME = 'test-bucket';

function oldObject(index) {
  return {
    Key: `collage-${index}.jpg`,
    LastModified: new Date('2020-01-01T00:00:00Z'),
  };
}

test('cleanup paginates and deletes objects in batches', async () => {
  let listCalls = 0;
  let deleteCalls = 0;
  const fakeS3 = {
    async send(command) {
      if (command.constructor.name === 'ListObjectsV2Command') {
        listCalls += 1;
        if (listCalls === 1) {
          return {
            Contents: Array.from({ length: 600 }, (_, i) => oldObject(i)),
            IsTruncated: true,
            NextContinuationToken: 'page-2',
          };
        }
        return {
          Contents: Array.from({ length: 401 }, (_, i) => oldObject(i + 600)),
          IsTruncated: false,
        };
      }
      deleteCalls += 1;
      assert.equal(command.input.Delete.Objects.length, deleteCalls === 1 ? 1000 : 1);
      return {};
    },
  };

  const result = await cleanupOldCollages(15, fakeS3);
  assert.deepEqual(result, { scanned: 1001, deleted: 1001 });
  assert.equal(listCalls, 2);
  assert.equal(deleteCalls, 2);
});

test('cleanup reports partial R2 delete failures', async () => {
  const fakeS3 = {
    async send(command) {
      if (command.constructor.name === 'ListObjectsV2Command') {
        return { Contents: [oldObject(1)], IsTruncated: false };
      }
      return { Errors: [{ Key: 'collage-1.jpg', Code: 'AccessDenied' }] };
    },
  };
  await assert.rejects(
    cleanupOldCollages(15, fakeS3),
    /R2 cleanup failed for 1 objects/,
  );
});
