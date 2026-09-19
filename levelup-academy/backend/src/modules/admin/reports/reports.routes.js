import { Router } from 'express';
import { validate } from '../../../middlewares/validate.js';
import * as ctrl from './reports.controller.js';
import { reportQuery } from './reports.schemas.js';

/**
 * K-PAY reports — выручка + долги по группам филиала. Смонтирован в
 * admin.routes.js под /reports; authenticate + authorize('admin') от родителя.
 */
const router = Router();

/**
 * @openapi
 * /api/admin/reports:
 *   get:
 *     tags: [Admin Reports]
 *     summary: Branch revenue + debt report, optionally scoped to a date range, broken down by group
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: from
 *         in: query
 *         schema: { type: string, format: date-time }
 *       - name: to
 *         in: query
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Report data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 period:
 *                   type: object
 *                   properties:
 *                     from: { type: string, format: date-time, nullable: true }
 *                     to: { type: string, format: date-time, nullable: true }
 *                 totals:
 *                   type: object
 *                   properties:
 *                     revenue: { type: number }
 *                     debt: { type: number }
 *                     currency: { type: string, example: UZS }
 *                 byGroup:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       groupId: { type: string, format: uuid }
 *                       groupName: { type: string }
 *                       revenue: { type: number }
 *                       debt: { type: number }
 *                       students: { type: integer }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/', validate({ query: reportQuery }), ctrl.branchReport);

export default router;
