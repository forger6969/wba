import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { orgAccessGate } from '../../middlewares/orgAccessGate.js';
import * as ctrl from './coins.controller.js';
import { historyQuerySchema } from './coins.schemas.js';

const router = Router();

/**
 * @openapi
 * /api/coins/me:
 *   get:
 *     tags: [Coins]
 *     summary: Current student's coin balance + paginated history
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: page
 *         in: query
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Balance + history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     balance: { type: integer }
 *                     history:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/CoinHistoryEntry' }
 *                     meta: { $ref: '#/components/schemas/PageMeta' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Student profile not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get(
  '/me',
  authenticate,
  orgAccessGate,
  authorize('student'),
  validate({ query: historyQuerySchema }),
  ctrl.getMyCoins,
);

export default router;
