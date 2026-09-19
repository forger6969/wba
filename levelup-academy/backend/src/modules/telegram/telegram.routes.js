import { Router } from 'express';
import { webhookCallback } from 'grammy';
import { authenticate } from '../../middlewares/authenticate.js';
import { createRateLimiter } from '../../middlewares/rateLimiter.js';
import { requireOrgFeature } from '../../middlewares/requireOrgFeature.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { bot, usesWebhook } from './bot.js';
import {
  createBindToken,
  getStatus,
  unlink,
  startLogin,
  pollLogin,
} from './telegram.controller.js';

const router = Router();

/**
 * @openapi
 * /api/telegram/bind-token:
 *   post:
 *     tags: [Telegram]
 *     summary: Issue a one-time token to link the caller's account to the Telegram bot
 *     description: >
 *       Student and parent accounts only — any other role gets 403. Returns a short-lived
 *       token (kept in Redis, single-use) plus a ready deep link; opening the link starts
 *       the bot with the token, which the bot then consumes to bind the chat to the user.
 *       Answers 503 when TELEGRAM_BOT_USERNAME is unset — the deep link cannot be built.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     token: { type: string }
 *                     expiresIn: { type: integer, description: TTL in seconds }
 *                     deepLink:
 *                       type: string
 *                       example: https://t.me/levelup_bot?start=abc123
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403:
 *         description: Caller is not a student or parent
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       503:
 *         description: Telegram is not configured on this server
 */
router.post('/bind-token', authenticate, requireOrgFeature('telegram_integration'), createBindToken);

/**
 * @openapi
 * /api/telegram/status:
 *   get:
 *     tags: [Telegram]
 *     summary: Whether the caller's account is linked to Telegram
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Link state
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     configured: { type: boolean, description: server has a bot username }
 *                     linked: { type: boolean }
 *                     username: { type: string, nullable: true }
 *                     firstName: { type: string, nullable: true }
 *                     linkedAt: { type: string, format: date-time, nullable: true }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/status', authenticate, getStatus);

/**
 * @openapi
 * /api/telegram/unlink:
 *   delete:
 *     tags: [Telegram]
 *     summary: Unlink the caller's Telegram from their account
 *     description: >
 *       Mirrors the bot's /stop, but from the cabinet. Without it a user who lost access
 *       to the linked Telegram could never bind a new one — telegram_accounts.user_id is
 *       unique, so the next insert always failed.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Unlinked (or there was nothing to unlink)
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.delete('/unlink', authenticate, unlink);

/**
 * @openapi
 * /api/telegram/login/start:
 *   post:
 *     tags: [Telegram]
 *     summary: Begin login through Telegram — issues a nonce and a deep link
 *     description: >
 *       Public on purpose: this IS the login. The nonce alone grants nothing; it only
 *       becomes usable after the bot matches the chat against telegram_accounts, so an
 *       account with no linked Telegram cannot be entered this way.
 *     responses:
 *       201: { description: Nonce issued }
 *       503: { description: Telegram is not configured on this server }
 */
router.post(
  '/login/start',
  // Тот же лимит, что у /api/auth (20/мин): выдача nonce — вход, а не обычный
  // запрос, и перебирать его надо мешать так же.
  createRateLimiter({ keyPrefix: 'rl:tg:login', points: 20, duration: 60 }),
  startLogin,
);

/**
 * @openapi
 * /api/telegram/login/poll:
 *   get:
 *     tags: [Telegram]
 *     summary: Check whether the Telegram login was confirmed, and collect the session
 *     parameters:
 *       - in: query
 *         name: nonce
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: >
 *           status=pending — keep polling; status=unknown — the nonce expired or never
 *           existed, start over; status=approved — tokens are in the payload.
 *       400: { description: nonce missing }
 */
router.get(
  '/login/poll',
  // Опрос идёт раз в 2 секунды по 3 минуты = до 90 запросов на вкладку.
  // Лимит с запасом на две вкладки, но перебор nonce всё равно отсекает.
  createRateLimiter({ keyPrefix: 'rl:tg:poll', points: 200, duration: 60 }),
  pollLogin,
);

/**
 * Приём обновлений от Telegram.
 *
 * Секрет в пути — чтобы адрес нельзя было угадать, и он же в заголовке
 * `X-Telegram-Bot-Api-Secret-Token`, который Telegram шлёт сам. Проверяются оба:
 * путь может утечь в лог прокси, заголовок — нет.
 *
 * Роут монтируется, только когда webhook действительно настроен: иначе в
 * long-polling-режиме существовал бы открытый эндпоинт, принимающий чужие
 * «обновления» и выполняющий по ним привязки.
 */
if (usesWebhook) {
  const handleUpdate = webhookCallback(bot, 'express');

  router.post('/webhook/:secret', (req, res, next) => {
    const fromPath = req.params.secret;
    const fromHeader = req.get('X-Telegram-Bot-Api-Secret-Token');

    if (fromPath !== env.TELEGRAM_WEBHOOK_SECRET || fromHeader !== env.TELEGRAM_WEBHOOK_SECRET) {
      logger.warn({ ip: req.ip }, 'Telegram webhook: неверный секрет');
      // 401 без тела: подтверждать существование эндпоинта незачем.
      res.sendStatus(401);
      return;
    }

    handleUpdate(req, res, next);
  });
}

export default router;
