import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import * as ctrl from './platformBilling.controller.js';
import { listInvoicesQuery, generateInvoicesSchema, cancelInvoiceSchema, idParam } from './platformBilling.schemas.js';

const router = Router();
router.use(authenticate, authorize('main_admin'));

/**
 * @openapi
 * /api/main/invoices:
 *   get:
 *     tags: [Main Admin]
 *     summary: Счета партнёров (платформа→партнёр)
 *     description: >
 *       Не путать с /api/admin/payments (K-PAY, ученик→школа) — другой домен.
 *       status здесь включает производное 'overdue' (due_date прошёл, счёт не
 *       закрыт) — оно нигде не хранится, вычисляется при чтении.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, partially_paid, paid, overdue, cancelled] }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200: { description: Список счетов }
 *   post:
 *     tags: [Main Admin]
 *     summary: Сформировать счета за период (идемпотентно)
 *     description: >
 *       Тариф и число пользователей — снимок на момент вызова, дальше не
 *       пересчитывается. Free-тариф пропускается. Повторный вызов за тот же
 *       период не создаёт дублей (UNIQUE на organization_id+period_covered).
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties: { periodCovered: { type: string, example: '2026-08' } }
 *     responses:
 *       201: { description: 'Создано N счетов' }
 */
router.get('/', validate({ query: listInvoicesQuery }), ctrl.listInvoices);
router.post('/', validate({ body: generateInvoicesSchema }), ctrl.generateInvoices);

/**
 * @openapi
 * /api/main/invoices/debt:
 *   get:
 *     tags: [Main Admin]
 *     summary: Сводка долгов по партнёрам (сумма неоплаченного по каждому)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Список организаций с долгом > 0 }
 */
router.get('/debt', ctrl.getOrgDebt);

/**
 * @openapi
 * /api/main/invoices/{id}/cancel:
 *   patch:
 *     tags: [Main Admin]
 *     summary: Отменить счёт (нельзя отменить уже полностью оплаченный)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties: { reason: { type: string } }
 *     responses:
 *       200: { description: Отменён }
 *       409: { description: Уже оплачен или не найден }
 */
router.patch('/:id/cancel', validate({ params: idParam, body: cancelInvoiceSchema }), ctrl.cancelInvoice);

export default router;
