import { Router } from 'express';
import { validate } from '../../../middlewares/validate.js';
import * as ctrl from './salary.controller.js';
import {
  mentorIdParamSchema,
  salaryIdParamSchema,
  yearQuerySchema,
  monthQuerySchema,
  upsertSalaryBodySchema,
  updateStatusBodySchema,
} from './salary.schemas.js';

const router = Router();

// auth: authenticate + authorize('mentor','admin') навешаны в mentor.routes.js.
// Роль/владение дополнительно проверяются в salary.service.js:
//   mentor видит только свою запись; create/approve — только role === 'admin'.

/**
 * @openapi
 * /api/mentor/salary/mentors/{mentorId}/suggestion:
 *   get:
 *     tags: [Mentor Salary]
 *     summary: Decision-support salary suggestion for a month (pure calculation, writes nothing)
 *     description: >
 *       `groupRevenue = monthlyPrice × activeStudents` per group the mentor teaches
 *       during the month. Access: the mentor may only view their own suggestion;
 *       admin only for mentors in their own branch (404 if a foreign branch, to
 *       avoid disclosure); ceo/main_admin unrestricted.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: mentorId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: month
 *         in: query
 *         required: true
 *         schema: { type: string, pattern: '^\d{4}-(0[1-9]|1[0-2])$', example: '2026-07' }
 *     responses:
 *       200:
 *         description: Suggestion
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     groups:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           groupId: { type: string, format: uuid }
 *                           name: { type: string }
 *                           activeStudents: { type: integer }
 *                           monthlyPrice: { type: number }
 *                           groupRevenue: { type: number }
 *                     totalStudents: { type: integer }
 *                     totalRevenue: { type: number }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403:
 *         description: Not allowed to view this mentor's data (foreign mentor/branch)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Mentor not found (includes mentors of another branch, for admin requesters)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get(
  '/mentors/:mentorId/suggestion',
  validate({ params: mentorIdParamSchema, query: monthQuerySchema }),
  ctrl.getSalarySuggestion,
);

/**
 * @openapi
 * /api/mentor/salary/mentors/{mentorId}:
 *   get:
 *     tags: [Mentor Salary]
 *     summary: List a mentor's salary records for a year
 *     description: Same ownership rules as the suggestion endpoint (self, or admin/ceo/main_admin).
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: mentorId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: year
 *         in: query
 *         schema: { type: integer, minimum: 2000, maximum: 2100, default: current year }
 *     responses:
 *       200:
 *         description: List of salary records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/SalaryRecord' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403:
 *         description: Not allowed to view this mentor's data
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get(
  '/mentors/:mentorId',
  validate({ params: mentorIdParamSchema, query: yearQuerySchema }),
  ctrl.getMentorSalaries,
);

/**
 * @openapi
 * /api/mentor/salary:
 *   post:
 *     tags: [Mentor Salary]
 *     summary: Create or update a mentor's salary record for a period (admin only)
 *     description: >
 *       Only `req.user.role === 'admin'` may call this (checked in the service,
 *       not just via the router-level authorize). The target mentor must belong to
 *       the admin's own branch. Upsert is blocked with 409 if the existing record
 *       for that mentor+period is already `approved` or `paid`.
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpsertSalaryRequest' }
 *     responses:
 *       201:
 *         description: Salary record created/updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/SalaryRecord' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403:
 *         description: Only admin can manage mentor salaries, or mentor belongs to another branch
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Mentor not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: Salary record is already approved/paid and cannot be edited
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/', validate({ body: upsertSalaryBodySchema }), ctrl.upsertSalary);

/**
 * @openapi
 * /api/mentor/salary/{id}/status:
 *   patch:
 *     tags: [Mentor Salary]
 *     summary: Transition a salary record's status (admin only)
 *     description: >
 *       Allowed transitions: draft→approved, approved→paid, paid→approved
 *       (rollback of a mistaken payment mark). `paidAt` is set only while status
 *       is `paid`. Any other transition returns 409.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [approved, paid] }
 *     responses:
 *       200:
 *         description: Updated salary record
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/SalaryRecord' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403:
 *         description: Only admin can manage mentor salaries, or record belongs to another branch
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Salary record not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: Invalid status transition for the record's current status
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch(
  '/:id/status',
  validate({ params: salaryIdParamSchema, body: updateStatusBodySchema }),
  ctrl.updateStatus,
);

export default router;
