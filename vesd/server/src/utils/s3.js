import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import { randomUUID } from 'crypto';
import { env } from '../config/env.js';

function createS3Client(region = env.aws.region) {
  return new S3Client({
    region,
    endpoint: env.aws.s3Endpoint || undefined,
    forcePathStyle: env.aws.s3ForcePathStyle,
    credentials: {
      accessKeyId: env.aws.accessKeyId,
      secretAccessKey: env.aws.secretAccessKey
    }
  });
}

const s3 = createS3Client();

const BUCKET = env.aws.s3Bucket;

function publicObjectUrl(key, region = env.aws.region) {
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  if (env.aws.s3PublicUrl) {
    return `${env.aws.s3PublicUrl.replace(/\/+$/, '')}/${encodedKey}`;
  }
  return `https://${BUCKET}.s3.${region}.amazonaws.com/${encodedKey}`;
}

function getBucketRegionFromError(error) {
  return error?.$metadata?.httpHeaders?.['x-amz-bucket-region'] || error?.BucketRegion || error?.Region;
}

function isEndpointError(error) {
  return ['PermanentRedirect', '301'].includes(error?.name) || error?.Code === 'PermanentRedirect' || error?.$metadata?.httpStatusCode === 301;
}

function normalizeS3Error(error) {
  const bucketRegion = getBucketRegionFromError(error);
  const endpointError = isEndpointError(error);
  if (!endpointError) return error;

  const details = bucketRegion
    ? `Bucket "${BUCKET}" dang o region "${bucketRegion}", nhung server dang cau hinh AWS_REGION="${env.aws.region}".`
    : `Bucket "${BUCKET}" yeu cau endpoint S3 khac voi cau hinh hien tai.`;
  const nextError = new Error(`${details} Hay cap nhat AWS_REGION hoac AWS_S3_ENDPOINT/AWS_S3_PUBLIC_URL.`);
  nextError.statusCode = 500;
  nextError.details = { bucket: BUCKET, configuredRegion: env.aws.region, bucketRegion };
  return nextError;
}

async function putObject(file, key, client = s3) {
  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype
  }));
}

/**
 * Upload a multer file to S3
 * @param {object} file - multer file object (buffer, originalname, mimetype)
 * @param {string} folder - S3 folder prefix (e.g. 'avatars', 'portfolio', 'projects')
 * @returns {{ url: string, key: string, name: string, type: string, size: number }}
 */
export async function uploadToS3(file, folder = 'uploads') {
  const ext = path.extname(file.originalname);
  const key = `${folder}/${randomUUID()}${ext}`;

  let objectRegion = env.aws.region;
  try {
    await putObject(file, key);
  } catch (error) {
    const bucketRegion = getBucketRegionFromError(error);
    if (bucketRegion && bucketRegion !== env.aws.region && isEndpointError(error) && !env.aws.s3Endpoint) {
      await putObject(file, key, createS3Client(bucketRegion));
      objectRegion = bucketRegion;
    } else {
      throw normalizeS3Error(error);
    }
  }

  const url = publicObjectUrl(key, objectRegion);

  return {
    url,
    key,
    name: file.originalname,
    type: file.mimetype,
    size: file.size
  };
}

/**
 * Delete a file from S3 by its key
 * @param {string} key - S3 object key
 */
export async function deleteFromS3(key) {
  await s3.send(new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key
  }));
}
