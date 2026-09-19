import { Router } from 'express';
import { validate } from '../../../middlewares/validate.js';
import * as ctrl from './tests.controller.js';
import { testIdParamSchema, submitTestSchema } from './tests.schemas.js';

const router = Router();

/**
 * @openapi
 * /api/student/tests:
 *   get:
 *     tags: [Student]
 *     summary: List tests across the student's own groups (correct-answer indices stripped)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of tests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/TestForStudent' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       402:
 *         description: Payment overdue — access is blocked until paid
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/', ctrl.listTests);

/**
 * @openapi
 * /api/student/tests/{testId}:
 *   get:
 *     tags: [Student]
 *     summary: Get a test to take (correct-answer indices stripped, checks membership + availability window)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: testId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Test data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/TestForStudent' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       402:
 *         description: Payment overdue — access is blocked until paid
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Not a member of this group
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Test not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: Test is archived, not open yet, or closed
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/:testId', validate({ params: testIdParamSchema }), ctrl.getTest);

/**
 * @openapi
 * /api/student/tests/{testId}/start:
 *   post:
 *     tags: [Student]
 *     summary: Start a test attempt (records started_at; one attempt per student per test)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: testId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       201:
 *         description: Attempt started — timer data for the client
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     startedAt: { type: string, format: date-time }
 *                     durationMin: { type: integer }
 *                     endsAt: { type: string, format: date-time }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       402:
 *         description: Payment overdue — access is blocked until paid
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Not a member of this group
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Test not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: Test is archived, not open yet, closed, or attempt already started
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/:testId/start', validate({ params: testIdParamSchema }), ctrl.startTest);

/**
 * @openapi
 * /api/student/tests/{testId}/submit:
 *   post:
 *     tags: [Student]
 *     summary: Submit answers and get scored
 *     description: >
 *       Server enforces the timer (attempt start + durationMin, capped by the
 *       test's `endsAt`) — expired timer returns 409. Score is
 *       `round(correctCount/questionCount*100)`. If score >= 50 and the test has
 *       a nonzero coin reward, coins are granted immediately (not queued).
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: testId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [answers]
 *             properties:
 *               answers:
 *                 type: array
 *                 items: { type: integer }
 *                 minItems: 1
 *                 description: answers[i] = selected option index for question i (-1 = skipped)
 *     responses:
 *       200:
 *         description: Score
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties: { score: { type: integer } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       402:
 *         description: Payment overdue — access is blocked until paid
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Not a member of this group
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Test not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: Test is archived, attempt not started, already submitted, or time is up
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/:testId/submit',
  validate({ params: testIdParamSchema, body: submitTestSchema }),
  ctrl.submitTest,
);

export default router;
