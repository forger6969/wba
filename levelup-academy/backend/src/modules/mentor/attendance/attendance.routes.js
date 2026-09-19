import { Router } from 'express';
import { validate } from '../../../middlewares/validate.js';
import { archiveGuard } from '../../../middlewares/archiveGuard.js';
import * as ctrl from './attendance.controller.js';
import {
  groupIdParamSchema,
  markAttendanceBodySchema,
  listAttendanceQuerySchema,
} from './attendance.schemas.js';

const router = Router();

/**
 * @openapi
 * /api/mentor/attendance/groups/{groupId}:
 *   post:
 *     tags: [Mentor Attendance]
 *     summary: Bulk mark/update attendance for a lesson date (own group only)
 *     description: >
 *       Upserts one row per student for the given `lessonDate` (unique on
 *       group_id+student_id+lesson_date — resubmitting the same date updates
 *       existing marks). A foreign group returns 404 (existence not disclosed to
 *       non-owning mentors). Blocked with 403 if the group is archived
 *       (archiveGuard). Duplicate `studentId` within one request is rejected by
 *       zod (422) before it can break the batch upsert.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: groupId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/MarkAttendanceRequest' }
 *     responses:
 *       200:
 *         description: Upserted attendance rows
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/AttendanceRecord' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403:
 *         description: Not this mentor's group's admin scope, or the group is archived
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Group not found (includes groups belonging to another mentor)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/groups/:groupId',
  validate({ params: groupIdParamSchema, body: markAttendanceBodySchema }),
  archiveGuard('groups', 'groupId'),
  ctrl.markAttendance,
);

/**
 * @openapi
 * /api/mentor/attendance/groups/{groupId}:
 *   get:
 *     tags: [Mentor Attendance]
 *     summary: Read attendance for a group — either a single date or a date range
 *     description: Query must provide either `date`, or both `from` and `to` (validated by zod refine).
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: groupId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: date
 *         in: query
 *         schema: { type: string, pattern: '^\d{4}-\d{2}-\d{2}$' }
 *       - name: from
 *         in: query
 *         schema: { type: string, pattern: '^\d{4}-\d{2}-\d{2}$' }
 *       - name: to
 *         in: query
 *         schema: { type: string, pattern: '^\d{4}-\d{2}-\d{2}$' }
 *     responses:
 *       200:
 *         description: Attendance rows (joined with student first/last name)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - { $ref: '#/components/schemas/AttendanceRecord' }
 *                       - type: object
 *                         properties:
 *                           first_name: { type: string }
 *                           last_name: { type: string }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404:
 *         description: Group not found (includes groups belonging to another mentor)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get(
  '/groups/:groupId',
  validate({ params: groupIdParamSchema, query: listAttendanceQuerySchema }),
  ctrl.getGroupAttendance,
);

export default router;
