import { Router } from 'express';
import { validate } from '../../../middlewares/validate.js';
import { grantCoinsSchema, studentParam, historyQuery, groupParam } from './coins.schemas.js';
import * as ctrl from './coins.controller.js';

/**
 * Mentor/Admin — ручное начисление коинов. Смонтирован под /api/mentor/coins;
 * authenticate + authorize('mentor','admin') навешаны в mentor.routes.js.
 */
const router = Router();

/**
 * @openapi
 * /api/mentor/coins:
 *   post:
 *     tags: [Mentor Coins]
 *     summary: Manually grant (positive amount) or deduct (negative amount) coins from a student
 *     description: >
 *       Ownership check: a mentor may only act on students enrolled in one of
 *       their own groups; an admin may only act on students in their own branch.
 *       A student outside that scope returns 404 (existence not disclosed).
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/GrantCoinsRequest' }
 *     responses:
 *       201:
 *         description: Coins granted/deducted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     balanceAfter: { type: integer }
 *                     entry: { $ref: '#/components/schemas/CoinHistoryEntry' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404:
 *         description: Student not found (includes students outside actor's scope)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/', validate({ body: grantCoinsSchema }), ctrl.grantCoins);

/**
 * @openapi
 * /api/mentor/coins/groups/{groupId}/budget:
 *   get:
 *     tags: [Mentor Coins]
 *     summary: Remaining monthly coin allowance for a group
 *     description: >
 *       A mentor may hand out `coins_per_student × current group size` coins per
 *       calendar month, per group. Nothing is pre-allocated: the figure is
 *       derived on read, so enrolling a student raises the allowance
 *       immediately. Whatever is left over does not carry into the next month.
 *       Deductions made by the mentor within the same month return to the
 *       allowance; deductions of coins granted in an earlier month do not.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: groupId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Budget state for the current month
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     month: { type: string, example: '2026-07' }
 *                     coinsPerStudent: { type: integer, example: 10 }
 *                     students: { type: integer, example: 12 }
 *                     allocated: { type: integer, example: 120 }
 *                     spent: { type: integer, example: 45 }
 *                     remaining: { type: integer, example: 75 }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404:
 *         description: Not your group
 */
router.get('/groups/:groupId/budget', validate({ params: groupParam }), ctrl.groupBudget);

/**
 * @openapi
 * /api/mentor/coins/students/{studentId}:
 *   get:
 *     tags: [Mentor Coins]
 *     summary: Paginated coin history of a student (within actor's scope)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: studentId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - { $ref: '#/components/parameters/PageParam' }
 *       - { $ref: '#/components/parameters/LimitParam' }
 *     responses:
 *       200:
 *         description: Coin history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/CoinHistoryEntry' }
 *                     meta: { $ref: '#/components/schemas/PageMeta' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404:
 *         description: Student not found (includes students outside actor's scope)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get(
  '/students/:studentId',
  validate({ params: studentParam, query: historyQuery }),
  ctrl.studentHistory,
);

export default router;
