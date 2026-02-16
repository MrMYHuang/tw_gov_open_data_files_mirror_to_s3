import assert from 'node:assert/strict';
import { lookup } from 'node:dns/promises';
import test from 'node:test';
import AWS from 'aws-sdk';

import data, { fileMirroringToS3 } from './fileMirroringToS3.js';
import params from './params.json' with { type: 'json' };

test(
  'fileMirroringToS3 uploads mirrored zip files to S3 (integration)',
  { timeout: 180_000 },
  async (t) => {
    try {
      await lookup('itaiwan.gov.tw');
    } catch (error) {
      t.skip(`Skipping integration test: upstream host is not resolvable (${String(error)})`);
      return;
    }

    assert.ok(params.BUCKET_NAME, 'BUCKET_NAME is required in params.json');
    assert.ok(params.IAM_USER_KEY, 'IAM_USER_KEY is required in params.json');
    assert.ok(params.IAM_USER_SECRET, 'IAM_USER_SECRET is required in params.json');

    await fileMirroringToS3();

    const s3Base = new AWS.S3({
      accessKeyId: params.IAM_USER_KEY,
      secretAccessKey: params.IAM_USER_SECRET,
    });
    const location = await s3Base.getBucketLocation({ Bucket: params.BUCKET_NAME }).promise();
    const s3 = new AWS.S3({
      accessKeyId: params.IAM_USER_KEY,
      secretAccessKey: params.IAM_USER_SECRET,
      region: normalizeBucketRegion(location.LocationConstraint),
    });

    for (const item of data) {
      const objectKey = `${item.name}.zip`;
      const result = await s3
        .headObject({
          Bucket: params.BUCKET_NAME,
          Key: objectKey,
        })
        .promise();

      assert.ok(
        (result.ContentLength ?? 0) > 0,
        `Expected uploaded object ${objectKey} to have ContentLength > 0`,
      );
    }
  },
);

function normalizeBucketRegion(locationConstraint?: string) {
  if (!locationConstraint) {
    return 'us-east-1';
  }
  if (locationConstraint === 'EU') {
    return 'eu-west-1';
  }
  return locationConstraint;
}
