import { Router } from 'express';
import { validate } from '../../../middlewares/validate.js';
import { z } from 'zod';
import * as ctrl from './groups.controller.js';

/**
 * Mentor — read-only обзор своих групп и их состава. Смонтирован под
 * /api/mentor/groups; authenticate + authorize навешаны в mentor.routes.js.
 * CRUD групп — зона Admin (/api/admin/groups).
 */
const router = Router();

const groupParam = z.object({ groupId: z.string().uuid('Invalid groupId') });

/**
 * @openapi
 * /api/mentor/groups:
 *   get:
 *     tags: [Mentor Groups]
 *     summary: List the mentor's own groups (dashboard + selectors for attendance/homework/tests/coins)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of groups
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Group' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/', ctrl.myGroups);

/**
 * @openapi
 * /api/mentor/groups/{groupId}/students:
 *   get:
 *     tags: [Mentor Groups]
 *     summary: Roster of a group's students (own group only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: groupId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Group roster
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       firstName: { type: string }
 *                       lastName: { type: string }
 *                       status: { type: string }
 *                       coinBalance: { type: integer }
 *                       joinedAt: { type: string, format: date-time }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404:
 *         description: Group not found (includes groups belonging to another mentor)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/:groupId/students', validate({ params: groupParam }), ctrl.groupRoster);

/**
 * @openapi
 * /api/mentor/groups/{groupId}/stats:
 *   get:
 *     tags: [Mentor Groups]
 *     summary: Group statistics with per-student comparison
 *     description: >
 *       One call instead of a submissions/results request per assignment per
 *       student. Returns the group averages, the spread of students across
 *       performance bands, and a per-student row ranked by an overall score
 *       (the mean of whichever of attendance / homework / tests that student
 *       actually has — a newcomer with no tests yet is not penalised for it).
 *       Scoped to the requesting mentor's own group; anything else answers 404.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Group statistics }
 *       404: { description: Group not found or belongs to another mentor }
 */
router.get('/:groupId/stats', validate({ params: groupParam }), ctrl.groupStats);

export default router;
