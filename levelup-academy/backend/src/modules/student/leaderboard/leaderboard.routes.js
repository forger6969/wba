import { Router } from 'express';
import { validate } from '../../../middlewares/validate.js';
import * as ctrl from './leaderboard.controller.js';
import { leaderboardQuerySchema } from './leaderboard.schemas.js';

const router = Router();

/**
 * @openapi
 * /api/student/leaderboard:
 *   get:
 *     tags: [Student]
 *     summary: Branch leaderboard (top 20) for the current week or month, plus own rank
 *     description: >
 *       Backed by a Redis ZSET incremented on positive coin changes
 *       (`coins.service.emitCoinsChanged`); resets naturally when the period key
 *       rolls over.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: period
 *         in: query
 *         schema: { type: string, enum: [week, month], default: week }
 *       - name: groupId
 *         in: query
 *         description: Own group's leaderboard instead of the branch-wide one (403 if not a member)
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Leaderboard
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Leaderboard' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       402:
 *         description: Payment overdue — access is blocked until paid
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/', validate({ query: leaderboardQuerySchema }), ctrl.getMyLeaderboard);

export default router;
