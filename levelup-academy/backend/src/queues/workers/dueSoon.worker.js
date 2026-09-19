import { Queue, Worker } from 'bullmq';
import { redisConnection } from '../../config/redis.js';
import { pool } from '../../config/db.js';
import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';
import { notificationQueue } from '../notification.queue.js';

const QUEUE_NAME = 'due-soon';
const REMINDER_DAYS = env.DUE_SOON_REMINDER_DAYS;

const dueSoonQueue = new Queue(QUEUE_NAME, { connection: redisConnection });

/** Repeatable job: каждый день в 08:00 — напоминание родителям, у кого до due_date остался REMINDER_DAYS дней. */
export async function scheduleDueSoonCron() {
  await dueSoonQueue.upsertJobScheduler(
    'due-soon-daily',
    { pattern: '0 8 * * *' },
    { name: 'due-soon.check' },
  );
}

export const dueSoonWorker = new Worker(
  QUEUE_NAME,
  async () => {
    // invoices — money-таблица, чужая зона (Karis): только SELECT, никаких UPDATE/INSERT.
    const { rows: dueSoon } = await pool.query(
      `SELECT id, student_id, (total_amount - paid_amount) AS amount, due_date
         FROM invoices
        WHERE status IN ('pending', 'partially_paid')
          AND due_date = CURRENT_DATE + $1 * INTERVAL '1 day'
          AND deleted_at IS NULL`,
      [REMINDER_DAYS],
    );

    for (const row of dueSoon) {
      try {
        // eslint-disable-next-line no-await-in-loop -- сбой одного уведомления не должен ронять остальные
        await notificationQueue.add('payment.due_soon', {
          studentId: row.student_id,
          amount: row.amount,
          dueDate: row.due_date,
          daysLeft: REMINDER_DAYS,
        });
      } catch (err) {
        logger.error({ err, invoiceId: row.id }, 'Failed to enqueue payment.due_soon notification');
      }
    }

    logger.info({ count: dueSoon.length }, 'Due-soon check completed');
  },
  { connection: redisConnection },
);

dueSoonWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Due-soon job failed');
});

// без слушателя 'error' EventEmitter бросает синхронно → обрыв Redis валит процесс
dueSoonQueue.on('error', (err) => {
  logger.error({ err }, 'Due-soon queue redis error');
});
dueSoonWorker.on('error', (err) => {
  logger.error({ err }, 'Due-soon worker redis error');
});
