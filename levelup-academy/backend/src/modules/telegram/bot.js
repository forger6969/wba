import { Bot } from 'grammy';
import { env } from '../../config/env.js';
import { pool } from '../../config/db.js';
import { redis } from '../../config/redis.js';
import { logger } from '../../config/logger.js';
import { registerTelegramBotHandlers } from './bot.handlers.js';

/**
 * grammY-инстанс: исходящие уведомления (notification.worker) + входящие команды
 * (/start, /stop). Без токена bot = null — worker логирует вместо отправки.
 *
 * ── Почему webhook, а не long-polling ──────────────────────────────────────
 * Раньше здесь безусловно вызывался bot.start() (long-polling), и это не могло
 * работать на проде по двум причинам сразу:
 *
 *   1. bot.js импортировал ЕДИНСТВЕННЫЙ файл — notification.worker.js. Значит
 *      polling жил только внутри worker-процесса. На Render worker-сервиса нет
 *      вовсе (в дашборде 4 сервиса, ни одного worker) — /start не слушал никто.
 *   2. Даже если worker создать, на free-плане он засыпает после 15 минут
 *      простоя. Спящий процесс Telegram не опрашивает: бот молчал бы почти
 *      круглые сутки.
 *
 * Webhook снимает обе: Telegram сам стучится в HTTP-эндпоинт API, а входящий
 * запрос будит уснувший free-сервис. Отдельный процесс ради бота не нужен.
 *
 * Локально webhook недоступен (нет публичного URL), поэтому в разработке
 * остаётся polling. Режим выбирается наличием PUBLIC_API_URL, а не NODE_ENV:
 * так же безопасно поднять webhook на staging или в туннеле.
 */
export const bot = env.TELEGRAM_BOT_TOKEN ? new Bot(env.TELEGRAM_BOT_TOKEN) : null;

/** true — обновления приходят в POST /api/telegram/webhook/:secret. */
export const usesWebhook = Boolean(bot && env.PUBLIC_API_URL && env.TELEGRAM_WEBHOOK_SECRET);

if (bot) {
  // Узбекский по умолчанию, а не русский: бот пишет ученикам и родителям
  // учебного центра в Узбекистане, и описание бота в BotFather тоже узбекское —
  // ответы на русском выглядели рассинхроном. Переопределяется переменной,
  // если у партнёра русскоязычная аудитория.
  registerTelegramBotHandlers({ bot, pool, redis, logger, language: env.TELEGRAM_BOT_LANG || 'uz' });

  if (!usesWebhook && env.NODE_ENV !== 'test') {
    // Fire-and-forget: не блокируем импорт модуля.
    bot.start().catch((err) => logger.error({ err }, 'Telegram bot polling failed'));
    logger.info('Telegram bot: long-polling (нет PUBLIC_API_URL/TELEGRAM_WEBHOOK_SECRET)');
  }
}

/**
 * Сообщить Telegram, куда слать обновления. Зовётся один раз при старте API.
 *
 * `secret_token` — вторая линия поверх секрета в URL: Telegram присылает его
 * заголовком, и мы сверяем на каждом запросе. Даже если путь утечёт в лог
 * прокси, подделать обновление без заголовка не выйдет.
 */
export async function initTelegramWebhook() {
  if (!usesWebhook) return false;

  const base = env.PUBLIC_API_URL.replace(/\/+$/, '');
  const url = `${base}/api/telegram/webhook/${env.TELEGRAM_WEBHOOK_SECRET}`;

  try {
    await bot.init();
    await bot.api.setWebhook(url, {
      secret_token: env.TELEGRAM_WEBHOOK_SECRET,
      // drop_pending_updates НЕ ставим. Сначала стояло true — рассуждение было,
      // что за простой всё равно истекли токены привязки. Но free-инстанс
      // засыпает каждые 15 минут простоя и при пробуждении заново зовёт
      // setWebhook, а Telegram успевает поставить сообщение в очередь на
      // повтор — с этим флагом такие сообщения выбрасывались. То есть флаг
      // съедал не «протухшие токены», а живые команды учеников, отправленные
      // спящему боту. Просроченный токен и так отвечает понятным «код истёк».
      allowed_updates: ['message'],
    });
    logger.info({ webhook: `${base}/api/telegram/webhook/***` }, 'Telegram webhook set');
    return true;
  } catch (err) {
    // Не валим API: без бота остальное приложение работоспособно.
    logger.error({ err }, 'Telegram webhook setup failed — бот не будет получать команды');
    return false;
  }
}
