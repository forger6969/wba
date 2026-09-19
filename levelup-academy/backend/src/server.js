import { createServer } from 'node:http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { pool } from './config/db.js';
import { closeRedis } from './config/redis.js';
import { createApp } from './app.js';
import { initSockets } from './sockets/index.js';
import { initTelegramWebhook } from './modules/telegram/bot.js';
import { notificationWorker } from './queues/workers/notification.worker.js';
import { overdueWorker, scheduleOverdueCron } from './queues/workers/overdue.worker.js';
import { billingWorker, scheduleBillingCron } from './queues/workers/billing.worker.js';
import { dueSoonWorker, scheduleDueSoonCron } from './queues/workers/dueSoon.worker.js';
import { aiReviewWorker } from './queues/workers/aiReview.worker.js';
import { dailyDigestWorker, scheduleDailyDigestCron } from './queues/workers/dailyDigest.worker.js';
import { startReminderLogging, stopReminderLogging } from './modules/super/reminders/reminders.listener.js';
import { chargeCurrentMonth } from './modules/billing/billing.service.js';
import { recordError } from './shared/errorTracker.js';

// ioredis шлёт AUTH сам, внутри своей connect-логики — если Redis отвечает
// ReplyError'ом (не сетевым обрывом, а протокольным отказом — 11.08.2026 это
// исчерпанная квота Upstash), reject этой внутренней команды не проходит
// через client.on('error') (см. config/redis.js) и остаётся необработанным.
// Дефолт Node — уронить процесс целиком, включая уже слушающий HTTP-порт.
// Здесь именно это и был источник 502 на проде: недоступность Redis не
// должна валить API, который на Redis не завязан (Postgres — отдельно).
process.on('unhandledRejection', (err) => {
  logger.error({ err }, 'Unhandled rejection — process kept alive');
  void recordError('crash', err);
});

/**
 * До 26.08.2026 такого обработчика не было вообще — любое синхронное
 * исключение без try/catch где-либо в коде роняло процесс молча (в логе
 * только сырой стек, ничего не сохранялось). unhandledRejection выше
 * намеренно НЕ завершает процесс (см. комментарий над ним — Redis ReplyError
 * не должен валить API), но uncaughtException — другой случай: Node сам
 * предупреждает, что состояние процесса после него небезопасно для
 * продолжения работы. Поэтому здесь: записать (с коротким таймаутом — само
 * падение не должно зависнуть на медленной записи) и выйти, чтобы процесс-
 * менеджер (Render/PM2) поднял свежий процесс.
 */
process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception — recording and exiting');
  Promise.race([
    recordError('crash', err),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]).finally(() => process.exit(1));
});

const app = createApp();
const httpServer = createServer(app);
const io = initSockets(httpServer);

httpServer.listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);

  // После listen, а не до: Telegram проверяет webhook сразу после setWebhook,
  // и до открытия порта проверка пришлась бы в закрытую дверь.
  // Не await — падение регистрации бота не должно мешать API отвечать.
  initTelegramWebhook().catch((err) => logger.error({ err }, 'Telegram webhook init failed'));

  // Redis-less safety net: on every API start, idempotently ensure this
  // month's invoices exist for all active memberships. The unique index
  // prevents duplicate charges when BullMQ also runs on the 1st.
  chargeCurrentMonth()
    .then((rows) => logger.info({ count: rows.length }, 'Startup billing reconciliation completed'))
    .catch((err) => logger.error({ err }, 'Startup billing reconciliation failed'));
});

// WORKER-MERGE (11.08.2026): раньше это был отдельный процесс (worker.js,
// npm run worker) — второй платный Render-сервис только под очереди. Один
// Starter-инстанс тянет оба: BullMQ-воркеры стартуют сайд-эффектом импорта
// выше, здесь только регистрируются крон-джобы (то же самое, что раньше
// делал worker.js на старте, до всех остальных импортов).
//
// Каждый вызов — в своём try/catch: upsertJobScheduler бьёт в Redis, и когда
// Redis недоступен (11.08.2026 — исчерпана квота Upstash), необработанный
// reject top-level await ронял ВЕСЬ процесс, включая HTTP-сервер, который
// секундой раньше уже начал слушать порт — API из-за кроны становился
// недоступен целиком. Теперь недоступность одной крон-очереди не должна
// валить остальные и тем более сам API.
for (const [label, schedule] of [
  ['overdue', scheduleOverdueCron],
  ['billing', scheduleBillingCron],
  ['due-soon', scheduleDueSoonCron],
  ['daily-digest', scheduleDailyDigestCron],
]) {
  try {
    await schedule();
  } catch (err) {
    logger.error({ err }, `Failed to schedule ${label} cron — continuing without it`);
  }
}
startReminderLogging(); // AB-SUPER-REM: логирует payment.due/due_soon/debt.overdue в reminders (CEO)
logger.info(
  'Queues+crons running in web process: notifications + overdue cron (09:00) + billing cron (1st 00:05, overdue 09:30) + due-soon cron (08:00) + ai-review + daily-digest cron (00:00 Tashkent) + reminder logging',
);

// --- graceful shutdown: stop accepting → drain sockets → close workers/pool/redis ---
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Shutting down...');

  const forceExit = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();

  try {
    await io.close(); // закрывает и переданный httpServer (socket.io ≥4.2)
    await Promise.allSettled([
      notificationWorker.close(),
      overdueWorker.close(),
      billingWorker.close(),
      dueSoonWorker.close(),
      aiReviewWorker.close(),
      dailyDigestWorker.close(),
      stopReminderLogging(),
    ]);
    await pool.end();
    await closeRedis();
    clearTimeout(forceExit);
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during shutdown');
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
