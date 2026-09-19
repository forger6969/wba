import { Router } from 'express';
import * as ctrl from './notifications.controller.js';

const router = Router();

/**
 * @openapi
 * /api/parent/notifications:
 *   get:
 *     tags: [Parent]
 *     summary: Notification feed (grades, attendance, payments) across all of the parent's children
 *     description: >
 *       No dedicated notifications table — the feed is synthesized on read from
 *       existing data (graded homework/tests, absences/lateness, received payments,
 *       overdue invoices), scoped to this parent's children and sorted by date desc
 *       (top 30 per page). `read` is always `false` — the frontend does not yet call a
 *       mark-as-read mutation. FE-PARENT-PAGINATION: pass `before` (nextCursor from the
 *       previous page) to load older events — a plain offset does not work here since
 *       the feed is re-merged from 5 sources on every read.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: before
 *         in: query
 *         required: false
 *         schema: { type: string, format: date-time }
 *         description: Load events strictly older than this timestamp (nextCursor of the previous page)
 *     responses:
 *       200:
 *         description: Notification feed page
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
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           type: { type: string, enum: [grade, attendance, payment] }
 *                           title: { type: string }
 *                           body: { type: string }
 *                           createdAt: { type: string, format: date-time }
 *                           read: { type: boolean, example: false }
 *                     nextCursor: { type: string, format: date-time, nullable: true }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/notifications', ctrl.list);

export default router;
