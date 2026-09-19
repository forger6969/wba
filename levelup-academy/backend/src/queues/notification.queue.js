import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis.js';
import { logger } from '../config/logger.js';

/**
 * Единственная точка отправки уведомлений из HTTP-кода:
 *   await notificationQueue.add('payment.received', { studentId, amount, ... })
 *
 * Job names: payment.received | payment.due | payment.due_soon | payment.refunded | debt.overdue | coins.changed | homework.due | announcement.created
 * Никаких прямых вызовов Telegram/SMTP/SMS из контроллеров (исключение: auth OTP).
 */
export const notificationQueue = new Queue('notifications', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});

// без слушателя 'error' EventEmitter бросает синхронно → обрыв Redis валит API-процесс
notificationQueue.on('error', (err) => {
  logger.error({ err }, 'Notification queue redis error');
});
