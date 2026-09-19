import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { pool } from '../../config/db.js';
import { s3 } from '../../config/s3.js';
import { env } from '../../config/env.js';

/**
 * Лимиты Neon (база) и Storj (файлы) — пункт #9 из списка мониторинга
 * (Karis 26.08.2026).
 *
 * Ни у одного из двух сервисов нет подключённого сюда API биллинга — только
 * DATABASE_URL (подключение к самой базе) и S3-креды (доступ к объектам в
 * бакете). Это значит: сервер может честно посчитать РЕАЛЬНЫЙ объём, но не
 * знает лимит плана — его знает только владелец аккаунта. Показывать
 * процент от лимита, который сервер не хранит и не может проверить, было бы
 * ровно тем "вычисленным как реальное", чего просили избегать — поэтому
 * лимит опционален (NEON_STORAGE_LIMIT_GB/STORJ_STORAGE_LIMIT_GB), и без
 * него страница отдаёт голый объём, без придуманного процента.
 */

function bytesWithLimit(bytes, limitGbRaw) {
  const limitGb = limitGbRaw ? Number(limitGbRaw) : null;
  const limitBytes = limitGb && limitGb > 0 ? limitGb * 1_000_000_000 : null;
  return {
    bytes,
    limitBytes,
    percent: limitBytes ? Math.round((bytes / limitBytes) * 1000) / 10 : null,
  };
}

async function databaseUsage() {
  const { rows: [row] } = await pool.query('SELECT pg_database_size(current_database()) AS bytes');
  return Number(row.bytes);
}

/** Пагинированный обход всего бакета — единственный способ узнать реальный
 *  суммарный объём, Storj не отдаёт "итого" одним вызовом. При малом числе
 *  объектов (сейчас — единицы) это доли секунды; если бакет разрастётся до
 *  сотен тысяч файлов, обход придётся кэшировать — не сегодняшняя проблема. */
async function storjUsage() {
  let bytes = 0;
  let count = 0;
  let token;
  do {
    // eslint-disable-next-line no-await-in-loop
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: env.S3_BUCKET, ContinuationToken: token, MaxKeys: 1000,
    }));
    for (const obj of res.Contents ?? []) { bytes += obj.Size; count += 1; }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return { bytes, count };
}

export async function storageHealth() {
  const [dbBytes, storj] = await Promise.all([databaseUsage(), storjUsage()]);
  return {
    database: bytesWithLimit(dbBytes, env.NEON_STORAGE_LIMIT_GB),
    storage: { ...bytesWithLimit(storj.bytes, env.STORJ_STORAGE_LIMIT_GB), objectCount: storj.count },
    checkedAt: new Date().toISOString(),
  };
}
