import { Queue, Worker } from 'bullmq';
import { redisConnection } from '../../config/redis.js';
import { pool } from '../../config/db.js';
import { logger } from '../../config/logger.js';

const QUEUE_NAME = 'chat-retention';
const RETENTION_DAYS = 60;

const chatRetentionQueue = new Queue(QUEUE_NAME, { connection: redisConnection });

/**
 * Repeatable job: каждый день в 03:00 удаляем историю чата старше 60 дней.
 *
 * Решение Karis (2026-08): Neon хранит ровно 60 дней переписки, старше —
 * вычищается, чтобы не расти в объёме. Удаляем физически, а не тумстоуном:
 * цель — освободить хранилище, а не скрыть строки. Внутри блока — одна
 * команда, поэтому сбой при retry не удаляет строки дважды (их уже нет).
 */
export async function scheduleChatRetentionCron() {
  await chatRetentionQueue.upsertJobScheduler(
    'chat-retention-daily',
    { pattern: '0 3 * * *' },
    { name: 'chat.retention' },
  );
}

export const chatRetentionWorker = new Worker(
  QUEUE_NAME,
  async () => {
    const { rowCount } = await pool.query(
      `DELETE FROM chat_messages
        WHERE deleted_at IS NULL
          AND created_at < now() - interval '${RETENTION_DAYS} days'`,
    );
    logger.info({ rowCount }, `Chat history older than ${RETENTION_DAYS} days deleted`);
  },
  { connection: redisConnection },
);

chatRetentionWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Chat retention job failed');
});

// без слушателя 'error' EventEmitter бросает синхронно → обрыв Redis валит процесс
chatRetentionQueue.on('error', (err) => {
  logger.error({ err }, 'Chat retention queue redis error');
});
chatRetentionWorker.on('error', (err) => {
  logger.error({ err }, 'Chat retention worker redis error');
});
