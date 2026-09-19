import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { env } from './env.js';

export const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
  forcePathStyle: true, // required for MinIO
});

const DEFAULT_EXPIRES_SEC = 900; // 15 min

/** Non-guessable object key: <prefix>/<uuid>/<originalName>. */
export function buildObjectKey(prefix, originalName) {
  return `${prefix}/${randomUUID()}/${originalName}`;
}

/** Presigned PUT — клиент грузит файл напрямую в S3, минуя API. */
export async function getUploadUrl(key, contentType, expiresIn = DEFAULT_EXPIRES_SEC) {
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn });
}

/** Presigned GET — временная ссылка на скачивание/стриминг. */
export async function getDownloadUrl(key, expiresIn = DEFAULT_EXPIRES_SEC) {
  const command = new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}

/**
 * Читает объект целиком в память сервера — единственный потребитель это
 * AI-review (extractor.js): нужно скормить байты Groq/adm-zip, presigned
 * URL тут не годится. Больше нигде в проекте не используется — остальные
 * модули (homework/video/lesson-media) всегда отдают presigned-ссылку клиенту,
 * а не читают файл в Node-процессе.
 */
export async function getObjectBuffer(key) {
  const { Body } = await s3.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
  const chunks = [];
  for await (const chunk of Body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

/**
 * Реальный размер объекта — с самого Storj, не то, что прислал клиент.
 * Единственный потребитель: content.service.js считает стоимость видео-файла
 * темы по этой цифре, а не по клиентскому значению, которое можно занизить.
 */
export async function getObjectSize(key) {
  const { ContentLength } = await s3.send(new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
  return ContentLength;
}

export async function deleteObject(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}
