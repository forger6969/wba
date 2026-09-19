import { HeadBucketCommand } from '@aws-sdk/client-s3';
import { pool } from '../../config/db.js';
import { redis } from '../../config/redis.js';
import { s3 } from '../../config/s3.js';
import { env } from '../../config/env.js';

/**
 * Настоящая проверка инфраструктуры, а не «процесс жив» (Karis 26.08.2026).
 *
 * До этого `/health` в app.js отвечал 200 всегда, пока жив сам процесс —
 * 25.08.2026 это доказало себя вредным: Redis (Upstash) упёрся в лимит
 * запросов (500001 из 500000), очереди уведомлений и просрочки платежей уже
 * не работали, а `/health` продолжал бодро отвечать «ok». Здесь — три
 * независимые проверки настоящих сервисов: база, Redis, файловое хранилище.
 *
 * Таймаут на каждую проверку СВОЙ и короткий (не таймаут самого клиента):
 * connectionTimeoutMillis у pg — 15с (нужен, чтобы будить уснувший Neon),
 * но ждать 15с ради health-check недопустимо — тогда сама страница здоровья
 * стала бы тем, что выглядит как зависание.
 */
const CHECK_TIMEOUT_MS = 4000;

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function timed(fn) {
  const start = Date.now();
  try {
    await withTimeout(fn(), CHECK_TIMEOUT_MS);
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: err.message };
  }
}

export async function systemHealth() {
  const [database, redisCheck, storage] = await Promise.all([
    timed(() => pool.query('SELECT 1')),
    // main-клиент (не pub/sub/bullmq) — тот же, что реально стоит перед
    // запросами (rate limiter, orgAccessGate), поэтому его состояние и есть
    // ответ на вопрос "деградирует ли сейчас реальный трафик".
    timed(() => redis.ping()),
    timed(() => s3.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }))),
  ]);

  const services = { database, redis: redisCheck, storage };
  const ok = Object.values(services).every((s) => s.ok);

  return { ok, services, checkedAt: new Date().toISOString() };
}
