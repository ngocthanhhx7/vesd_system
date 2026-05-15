import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import { randomUUID } from 'crypto';
import { env } from '../config/env.js';

const s3 = new S3Client({
  region: env.aws.region,
  credentials: {
    accessKeyId: env.aws.accessKeyId,
    secretAccessKey: env.aws.secretAccessKey
  }
});

const BUCKET = env.aws.s3Bucket;

/**
 * Upload a multer file to S3
 * @param {object} file - multer file object (buffer, originalname, mimetype)
 * @param {string} folder - S3 folder prefix (e.g. 'avatars', 'portfolio', 'projects')
 * @returns {{ url: string, key: string, name: string, type: string, size: number }}
 */
export async function uploadToS3(file, folder = 'uploads') {
  const ext = path.extname(file.originalname);
  const key = `${folder}/${randomUUID()}${ext}`;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype
  }));

  const url = `https://${BUCKET}.s3.${env.aws.region}.amazonaws.com/${key}`;

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
