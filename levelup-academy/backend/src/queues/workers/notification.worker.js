import { Worker } from 'bullmq';
import { redisConnection } from '../../config/redis.js';
import { pool } from '../../config/db.js';
import { logger } from '../../config/logger.js';
import { bot } from '../../modules/telegram/bot.js';

const HANDLERS = {
  'coins.changed': async ({ studentId, amount, reason }) => {
    const chatIds = await resolveChatIds(studentId, ['student', 'parent']);
    const sign = amount > 0 ? '+' : '';
    await sendToAll(chatIds, `🪙 Coins: ${sign}${amount}\nПричина: ${reason}`);
  },
  'payment.received': async ({ studentId, amount }) => {
    const chatIds = await resolveChatIds(studentId, ['parent']);
    await sendToAll(chatIds, `✅ Оплата принята: ${fmt(amount)} сум`);
  },
  'payment.due': async ({ studentId, amount, dueDate }) => {
    const chatIds = await resolveChatIds(studentId, ['parent']);
    await sendToAll(chatIds, `💳 Начислена оплата за месяц: ${fmt(amount)} сум. Оплатите до ${dueDate}`);
  },
  'payment.due_soon': async ({ studentId, amount, dueDate, daysLeft }) => {
    const chatIds = await resolveChatIds(studentId, ['parent']);
    await sendToAll(chatIds, `⏰ Через ${daysLeft} дн. срок оплаты: ${fmt(amount)} сум (до ${dueDate})`);
  },
  'payment.refunded': async ({ studentId, amount }) => {
    const chatIds = await resolveChatIds(studentId, ['parent']);
    await sendToAll(chatIds, `↩️ Возврат по оплате: ${fmt(amount)} сум`);
  },
  'debt.overdue': async ({ studentId, amount, dueDate }) => {
    const chatIds = await resolveChatIds(studentId, ['parent']);
    await sendToAll(chatIds, `⚠️ Просрочен платёж ${fmt(amount)} сум (срок: ${dueDate}). Доступ ученика ограничен до оплаты`);
  },
  'homework.due': async ({ studentId, title, deadline }) => {
    const chatIds = await resolveChatIds(studentId, ['student']);
    await sendToAll(chatIds, `📚 Дедлайн завтра: «${title}» до ${deadline}`);
  },
  'announcement.created': async ({ studentIds, title, message, roles = ['student', 'parent'] }) => {
    const chatIds = await resolveChatIdsForMany(studentIds, roles);
    await sendToAll(chatIds, `📢 ${title}\n\n${message}`);
  },
  // admin/branch_manager пишет одному студенту (или его родителю) напрямую со StudentDetail
  'admin.message': async ({ studentId, text, toParent }) => {
    const chatIds = await resolveChatIds(studentId, [toParent ? 'parent' : 'student']);
    await sendToAll(chatIds, text);
  },
};

export const notificationWorker = new Worker(
  'notifications',
  async (job) => {
    const handler = HANDLERS[job.name];
    if (!handler) throw new Error(`Unknown notification type: ${job.name}`);
    await handler(job.data);
  },
  // limiter: Telegram Bot API ≈ 30 msg/sec — держимся ниже
  { connection: redisConnection, concurrency: 5, limiter: { max: 25, duration: 1000 } },
);

notificationWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, name: job?.name, err }, 'Notification job failed');
});

// без слушателя 'error' EventEmitter бросает синхронно → обрыв Redis валит worker-процесс
notificationWorker.on('error', (err) => {
  logger.error({ err }, 'Notification worker redis error');
});

async function resolveChatIds(studentId, roles) {
  const { rows } = await pool.query(
    `SELECT ta.tg_chat_id
       FROM telegram_accounts ta
       JOIN users u ON u.id = ta.user_id
  LEFT JOIN student_profiles sp ON sp.parent_id = ta.user_id
      WHERE (ta.user_id = $1 AND 'student' = ANY($2))
         OR (sp.user_id = $1 AND 'parent'  = ANY($2))`,
    [studentId, roles],
  );
  return rows.map((r) => r.tg_chat_id);
}

/** Как resolveChatIds, но для набора студентов сразу — с dedup (родитель нескольких детей получит одно сообщение). */
async function resolveChatIdsForMany(studentIds, roles) {
  if (studentIds.length === 0) return [];
  const { rows } = await pool.query(
    `SELECT DISTINCT ta.tg_chat_id
       FROM telegram_accounts ta
       JOIN users u ON u.id = ta.user_id
  LEFT JOIN student_profiles sp ON sp.parent_id = ta.user_id
      WHERE (ta.user_id = ANY($1) AND 'student' = ANY($2))
         OR (sp.user_id = ANY($1) AND 'parent'  = ANY($2))`,
    [studentIds, roles],
  );
  return rows.map((r) => r.tg_chat_id);
}

async function sendToAll(chatIds, text) {
  if (!bot) {
    logger.warn({ chatIds, text }, '[dev] Telegram delivery skipped — TELEGRAM_BOT_TOKEN is not set');
    return;
  }
  for (const chatId of chatIds) {
    await bot.api.sendMessage(chatId, text);
  }
}

function fmt(n) {
  return new Intl.NumberFormat('ru-RU').format(n);
}
