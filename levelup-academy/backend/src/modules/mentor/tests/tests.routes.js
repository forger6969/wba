import { Router } from 'express';
import { validate } from '../../../middlewares/validate.js';
import { archiveGuard } from '../../../middlewares/archiveGuard.js';
import * as ctrl from './tests.controller.js';
import { groupIdParamSchema, testIdParamSchema, createTestBodySchema } from './tests.schemas.js';

const router = Router();

/**
 * @openapi
 * /api/mentor/tests/groups/{groupId}:
 *   post:
 *     tags: [Mentor Tests]
 *     summary: Create a test/exam for a group (own group only)
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
 *           schema: { $ref: '#/components/schemas/CreateTestRequest' }
 *     responses:
 *       201:
 *         description: Test created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Test' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403:
 *         description: Group is archived
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Group not found (includes groups belonging to another mentor)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *   get:
 *     tags: [Mentor Tests]
 *     summary: List tests of a group (mentor sees full data including correct-answer indices)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: groupId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
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
 *                   items:
 *                     allOf:
 *                       - { $ref: '#/components/schemas/Test' }
 *                       - type: object
 *                         properties: { attempts_count: { type: integer } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404:
 *         description: Group not found (includes groups belonging to another mentor)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/groups/:groupId',
  validate({ params: groupIdParamSchema, body: createTestBodySchema }),
  archiveGuard('groups', 'groupId'),
  ctrl.createTest,
);

router.get(
  '/groups/:groupId',
  validate({ params: groupIdParamSchema }),
  ctrl.listTestsForGroup,
);

/**
 * @openapi
 * /api/mentor/tests/{testId}/results:
 *   get:
 *     tags: [Mentor Tests]
 *     summary: List student results for a test
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: testId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List of results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/TestResult' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404:
 *         description: Test not found, or its group belongs to another mentor
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get(
  '/:testId/results',
  validate({ params: testIdParamSchema }),
  ctrl.listResults,
);

export default router;
