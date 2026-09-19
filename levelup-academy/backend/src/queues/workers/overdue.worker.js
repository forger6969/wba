import { Queue, Worker } from 'bullmq';
import { redisConnection } from '../../config/redis.js';
import { pool } from '../../config/db.js';
import { logger } from '../../config/logger.js';
import { notificationQueue } from '../notification.queue.js';

const QUEUE_NAME = 'overdue';

const overdueQueue = new Queue(QUEUE_NAME, { connection: redisConnection });

/** Repeatable job: каждый день в 09:00 помечаем просрочки Nasiya и шлём уведомления. */
export async function scheduleOverdueCron() {
  await overdueQueue.upsertJobScheduler(
    'overdue-daily',
    { pattern: '0 9 * * *' },
    { name: 'overdue.check' },
  );
}

export const overdueWorker = new Worker(
  QUEUE_NAME,
  async () => {
    const { rows: overdue } = await pool.query(
      `UPDATE payment_schedules ps
          SET status = 'overdue'
         FROM invoices i
        WHERE i.id = ps.invoice_id
          AND ps.status IN ('upcoming', 'due')
          AND ps.due_date < CURRENT_DATE
        RETURNING ps.id, ps.amount, ps.due_date, i.student_id`,
    );

    // Строки уже помечены overdue — при retry джобы SQL их не вернёт. Поэтому
    // сбой enqueue одного уведомления не должен ронять остаток батча.
    for (const row of overdue) {
      try {
        await notificationQueue.add('debt.overdue', {
          studentId: row.student_id,
          amount: row.amount,
          dueDate: row.due_date,
        });
      } catch (err) {
        logger.error({ err, scheduleId: row.id }, 'Failed to enqueue overdue notification');
      }
    }

    logger.info({ count: overdue.length }, 'Overdue check completed');
  },
  { connection: redisConnection },
);

overdueWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Overdue job failed');
});

// без слушателя 'error' EventEmitter бросает синхронно → обрыв Redis валит процесс
overdueQueue.on('error', (err) => {
  logger.error({ err }, 'Overdue queue redis error');
});
overdueWorker.on('error', (err) => {
  logger.error({ err }, 'Overdue worker redis error');
});
