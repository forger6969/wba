import { Router } from 'express';
import { validate } from '../../../middlewares/validate.js';
import * as ctrl from './home.controller.js';
import { setLanguageSchema } from './home.schemas.js';

const router = Router();

/**
 * @openapi
 * /api/student/home:
 *   get:
 *     tags: [Student]
 *     summary: Student dashboard — coin balance, debt, weekly rank, groups, upcoming homework
 *     description: >
 *       Blocked with 402 (via `blockIfOverdue`) if the student has an unpaid
 *       overdue invoice. `upcomingHomework` is the top 5 non-graded assignments
 *       sorted by nearest deadline (deadlines already in the future).
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     coins: { type: integer }
 *                     totalDebt: { type: number }
 *                     rank:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         rank: { type: integer, nullable: true }
 *                         coins: { type: integer }
 *                     groups:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string, format: uuid }
 *                           name: { type: string }
 *                           subject: { type: string }
 *                           mentorName: { type: string }
 *                     upcomingHomework:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Homework' }
 *                     topicStats:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           topicId: { type: string, format: uuid }
 *                           name: { type: string }
 *                           pct: { type: number }
 *                     review:
 *                       type: object
 *                       nullable: true
 *                       description: Latest AI code-review (Aqlli tahlil), if any
 *                     streak:
 *                       type: integer
 *                       description: Consecutive attended lesson-dates ending at the most recent one
 *                     longestStreak:
 *                       type: integer
 *                       description: Longest such streak on record
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       402:
 *         description: Payment overdue — access is blocked until paid
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/', ctrl.getDashboard);

/**
 * @openapi
 * /api/student/home/language:
 *   patch:
 *     tags: [Student]
 *     summary: Save the student's cabinet language on the backend (XOB, 12.08.2026)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [language]
 *             properties:
 *               language: { type: string, enum: [ru, uz] }
 *     responses:
 *       200:
 *         description: Saved
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch('/language', validate({ body: setLanguageSchema }), ctrl.patchLanguage);

export default router;
