import { QueueEvents, Job } from 'bullmq';
import { redisConnection } from '../../../config/redis.js';
import { notificationQueue } from '../../../queues/notification.queue.js';
import { logger } from '../../../config/logger.js';
import * as repo from './reminders.repository.js';

/**
 * Лог напоминаний (AB-SUPER-REM) для CEO. Namespaces очередей/воркеров
 * платежей (billing/dueSoon/overdue — Karis, K-PAY) и Telegram-доставки
 * (notification.worker.js — Bilol) — чужая зона, их файлы не трогаем.
 * Вместо правки чужих воркеров — независимый подписчик на события уже
 * существующей очереди 'notifications' (BullMQ QueueEvents), который сам
 * пишет строку в reminders, когда видит completed/failed по интересующим
 * job'ам. Только эти три job-типа порождают запись — остальные (coins.changed,
 * homework.due, announcement.created, payment.received/refunded) не относятся
 * к «напоминаниям» и в лог не попадают.
 */
const REMINDER_KINDS = new Set(['payment.due', 'payment.due_soon', 'debt.overdue']);

function fmtSum(n) {
  return new Intl.NumberFormat('ru-RU').format(n);
}

/** Тот же текст, что реально уходит в Telegram — см. notification.worker.js HANDLERS. */
function buildMessage(kind, { amount, dueDate, daysLeft }) {
  if (kind === 'payment.due') {
    return `💳 Начислена оплата за месяц: ${fmtSum(amount)} сум. Оплатите до ${dueDate}`;
  }
  if (kind === 'payment.due_soon') {
    return `⏰ Через ${daysLeft} дн. срок оплаты: ${fmtSum(amount)} сум (до ${dueDate})`;
  }
  return `⚠️ Просрочен платёж ${fmtSum(amount)} сум (срок: ${dueDate}). Доступ ученика ограничен до оплаты`;
}

async function logReminder(jobId, status, error) {
  const job = await Job.fromId(notificationQueue, jobId);
  if (!job || !REMINDER_KINDS.has(job.name)) return; // не наш job — игнор

  const ctx = await repo.resolveStudentContext(job.data.studentId);
  if (!ctx) return; // студента уже нет (удалён/фикстура) — логировать некого

  await repo.upsertByJobId({
    organizationId: ctx.organization_id,
    branchId: ctx.branch_id,
    studentId: job.data.studentId,
    studentName: ctx.student_name,
    parentName: ctx.parent_name,
    kind: job.name,
    payload: job.data,
    message: buildMessage(job.name, job.data),
    status,
    error,
    jobId: job.id,
  });
}

let queueEvents = null;

/** Вызывается один раз при старте процесса (src/server.js — см. WORKER-MERGE). */
export function startReminderLogging() {
  if (queueEvents) return queueEvents;

  queueEvents = new QueueEvents('notifications', { connection: redisConnection });

  queueEvents.on('completed', ({ jobId }) => {
    logReminder(jobId, 'sent', null).catch((err) =>
      logger.error({ err, jobId }, 'Failed to log reminder (completed)'));
  });

  queueEvents.on('failed', ({ jobId, failedReason }) => {
    logReminder(jobId, 'failed', failedReason).catch((err) =>
      logger.error({ err, jobId }, 'Failed to log reminder (failed)'));
  });

  // без слушателя 'error' EventEmitter бросает синхронно → обрыв Redis валит процесс
  queueEvents.on('error', (err) => {
    logger.error({ err }, 'Reminder QueueEvents redis error');
  });

  return queueEvents;
}

export async function stopReminderLogging() {
  if (!queueEvents) return;
  await queueEvents.close();
  queueEvents = null;
}
