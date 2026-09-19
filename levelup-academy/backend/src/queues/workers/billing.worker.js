import { Queue, Worker } from 'bullmq';
import { redisConnection } from '../../config/redis.js';
import { pool } from '../../config/db.js';
import { logger } from '../../config/logger.js';
import { notificationQueue } from '../notification.queue.js';
import { chargeCurrentMonth } from '../../modules/billing/billing.service.js';

const QUEUE_NAME = 'billing';
const billingQueue = new Queue(QUEUE_NAME, { connection: redisConnection });

/**
 * Repeatable jobs:
 *   - billing.charge  — 1-го числа 00:05: начисление за месяц каждому активному
 *     участнику группы (source='auto'), долг растёт, дедлайн — 5-е число.
 *   - billing.overdue — каждый день 09:30: неоплаченные к сроку счета -> 'overdue'
 *     (в т.ч. авто-начисления и ручные pending-invoices).
 */
export async function scheduleBillingCron() {
  await billingQueue.upsertJobScheduler(
    'billing-monthly-charge',
    { pattern: '5 0 1 * *' },
    { name: 'billing.charge' },
  );
  await billingQueue.upsertJobScheduler(
    'billing-overdue-daily',
    { pattern: '30 9 * * *' },
    { name: 'billing.overdue' },
  );
}

async function chargeMonth() {
  const charged = await chargeCurrentMonth();

  for (const row of charged) {
    try {
      // eslint-disable-next-line no-await-in-loop -- сбой одного уведомления не должен ронять остальные
      await notificationQueue.add('payment.due', {
        studentId: row.student_id,
        amount: row.total_amount,
        dueDate: row.due_date,
      });
    } catch (err) {
      logger.error({ err, invoiceId: row.invoice_id }, 'Failed to enqueue payment.due notification');
    }
  }

  logger.info({ count: charged.length }, 'Monthly billing charge completed');
}

async function markOverdue() {
  const { rows: overdue } = await pool.query(
    `UPDATE invoices
        SET status = 'overdue', updated_at = now()
      WHERE status IN ('pending', 'partially_paid')
        AND due_date IS NOT NULL AND due_date < CURRENT_DATE
        AND deleted_at IS NULL
      RETURNING id, student_id, (total_amount - paid_amount) AS amount, due_date`,
  );

  for (const row of overdue) {
    try {
      // eslint-disable-next-line no-await-in-loop -- сбой одного уведомления не должен ронять остальные
      await notificationQueue.add('debt.overdue', {
        studentId: row.student_id,
        amount: row.amount,
        dueDate: row.due_date,
      });
    } catch (err) {
      logger.error({ err, invoiceId: row.id }, 'Failed to enqueue debt.overdue notification');
    }
  }

  logger.info({ count: overdue.length }, 'Billing overdue check completed');
}

export const billingWorker = new Worker(
  QUEUE_NAME,
  async (job) => {
    if (job.name === 'billing.charge') return chargeMonth();
    if (job.name === 'billing.overdue') return markOverdue();
    throw new Error(`Unknown billing job: ${job.name}`);
  },
  { connection: redisConnection },
);

billingWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, name: job?.name, err }, 'Billing job failed');
});

// без слушателя 'error' EventEmitter бросает синхронно → обрыв Redis валит процесс
billingQueue.on('error', (err) => {
  logger.error({ err }, 'Billing queue redis error');
});
billingWorker.on('error', (err) => {
  logger.error({ err }, 'Billing worker redis error');
});
