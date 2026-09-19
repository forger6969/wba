import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { systemHealth } from './health.service.js';
import { listErrors, resolveError } from './errorLog.service.js';
import { queuesHealth } from './queueHealth.service.js';
import { partnerHealthScores } from './partnerHealth.service.js';
import { productActivity } from './productActivity.service.js';
import { storageHealth } from './storageHealth.service.js';
import { partnerDigest } from './partnerDigest.service.js';
import { errorLogQuerySchema, idParam } from './health.schemas.js';

const router = Router();

router.use(authenticate, authorize('main_admin'));

/**
 * @openapi
 * /api/main/system-health:
 *   get:
 *     tags: [Main Admin]
 *     summary: Настоящая проверка инфраструктуры — база, Redis, файловое хранилище
 *     description: >
 *       В отличие от публичного /health (отвечает 200, пока жив сам процесс),
 *       здесь три независимые проверки реальных сервисов с коротким таймаутом
 *       на каждую (4с) — деградация одного сервиса не топит проверку остальных.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Статус (ok:false — если хоть один сервис не отвечает; это не ошибка запроса)
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/system-health', asyncHandler(async (_req, res) => {
  res.json(await systemHealth());
}));

/**
 * @openapi
 * /api/main/queue-health:
 *   get:
 *     tags: [Main Admin]
 *     summary: Состояние очередей BullMQ (уведомления, просрочка, биллинг, AI-проверка...)
 *     description: >
 *       Счётчики waiting/active/delayed/failed по каждой из 7 очередей.
 *       Недоступность Redis отражается как ok:false per-очереди (уже
 *       покрыто отдельным critical-сигналом в Центре контроля — здесь
 *       для этого случая новый сигнал не заводится, чтобы не дублировать).
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Список очередей со счётчиками }
 */
router.get('/queue-health', asyncHandler(async (_req, res) => {
  res.json(await queuesHealth());
}));

/**
 * @openapi
 * /api/main/partner-health:
 *   get:
 *     tags: [Main Admin]
 *     summary: Health Score партнёров (0-100) — платёж/доступ + активность входов
 *     description: >
 *       Два фактора по 50 баллов: платёж/доступ (isOrgAccessBlocked + долг из
 *       /main/invoices/debt) и активность (users.last_login_at). Никакой новой
 *       телеметрии — только то, чему уже верит остальная платформа
 *       (Центр контроля, счета). Отсортировано от худшего к лучшему.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Список партнёров со Score }
 */
router.get('/partner-health', asyncHandler(async (_req, res) => {
  res.json({ items: await partnerHealthScores() });
}));

/**
 * @openapi
 * /api/main/product-activity:
 *   get:
 *     tags: [Main Admin]
 *     summary: Реальная активность в продукте (тесты, ДЗ, посещаемость, видео) — не сайт
 *     description: >
 *       Отличает «партнёр платит и работает» от «платит по инерции». Считает
 *       обе системы заданий (старую tests/homework и новую тематическую
 *       methodology_*) вместе — иначе партнёр на новой системе выглядел бы
 *       неактивным просто из-за не той таблицы.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, enum: [7, 30], default: 7 }
 *     responses:
 *       200: { description: Активность по каждому партнёру, тише всех — первыми }
 */
router.get('/product-activity', asyncHandler(async (req, res) => {
  res.json(await productActivity(req.query.days));
}));

/**
 * @openapi
 * /api/main/storage-health:
 *   get:
 *     tags: [Main Admin]
 *     summary: Реальный объём базы (Neon) и файлов (Storj)
 *     description: >
 *       Ни у Neon, ни у Storj нет подключённого API биллинга — только
 *       реальный объём. Лимит опционален (NEON_STORAGE_LIMIT_GB/
 *       STORJ_STORAGE_LIMIT_GB) — без него percent:null, без придуманной цифры.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Объём базы и файлового хранилища }
 */
router.get('/storage-health', asyncHandler(async (_req, res) => {
  res.json(await storageHealth());
}));

/**
 * @openapi
 * /api/main/partner-changes:
 *   get:
 *     tags: [Main Admin]
 *     summary: Свод «что изменилось» по партнёрам за период
 *     description: >
 *       Читает audit_log (organization_id IS NOT NULL) — статусы, платежи,
 *       бонусы, фичи, заявки на фичи, счета. Ничего нового не считает и не
 *       хранит отдельно; отсортировано по свежести последнего изменения.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, enum: [7, 30], default: 7 }
 *     responses:
 *       200: { description: Список партнёров с их недавними изменениями }
 */
router.get('/partner-changes', asyncHandler(async (req, res) => {
  res.json(await partnerDigest(req.query.days));
}));

/**
 * @openapi
 * /api/main/error-log:
 *   get:
 *     tags: [Main Admin]
 *     summary: Журнал ошибок бэкенда (сгруппированных по отпечатку)
 *     description: >
 *       Пишется из трёх мест: errorHandler.js (5xx из HTTP-запросов),
 *       server.js (unhandledRejection/uncaughtException — падения вне
 *       запроса). Одна и та же повторяющаяся ошибка — одна запись со
 *       счётчиком occurrence_count, а не поток дублей.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: resolved
 *         schema: { type: string, enum: [open, resolved, all], default: open }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200: { description: Список ошибок }
 */
router.get('/error-log', validate({ query: errorLogQuerySchema }), asyncHandler(async (req, res) => {
  res.json(await listErrors(req.query));
}));

/**
 * @openapi
 * /api/main/error-log/{id}/resolve:
 *   patch:
 *     tags: [Main Admin]
 *     summary: Пометить ошибку решённой
 *     description: >
 *       Если та же ошибка (по отпечатку) сработает снова, запись сама
 *       вернётся в открытые — пометка «решено» не защищает от рецидива.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Обновлено }
 *       404: { description: Запись не найдена }
 */
router.patch('/error-log/:id/resolve', validate({ params: idParam }), asyncHandler(async (req, res) => {
  res.json(await resolveError(req.params.id));
}));

export default router;
