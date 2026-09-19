import { Router } from 'express';
import { validate } from '../../../middlewares/validate.js';
import { archiveGuard } from '../../../middlewares/archiveGuard.js';
import * as ctrl from './homework.controller.js';
import {
  groupIdParamSchema,
  homeworkIdParamSchema,
  submissionIdParamSchema,
  createHomeworkBodySchema,
  gradeSubmissionBodySchema,
} from './homework.schemas.js';

const router = Router();

/**
 * @openapi
 * /api/mentor/homework/groups/{groupId}:
 *   post:
 *     tags: [Mentor Homework]
 *     summary: Create a homework assignment for a group (own group only)
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
 *           schema: { $ref: '#/components/schemas/CreateHomeworkRequest' }
 *     responses:
 *       201:
 *         description: Homework created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Homework' }
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
 *     tags: [Mentor Homework]
 *     summary: List homework assigned to a group, with submission/graded counts
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: groupId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List of homework
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
 *                       - { $ref: '#/components/schemas/Homework' }
 *                       - type: object
 *                         properties:
 *                           submissions_count: { type: integer }
 *                           graded_count: { type: integer }
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
  validate({ params: groupIdParamSchema, body: createHomeworkBodySchema }),
  archiveGuard('groups', 'groupId'),
  ctrl.createHomework,
);

router.get(
  '/groups/:groupId',
  validate({ params: groupIdParamSchema }),
  ctrl.listHomeworkForGroup,
);

/**
 * @openapi
 * /api/mentor/homework/{homeworkId}/submissions:
 *   get:
 *     tags: [Mentor Homework]
 *     summary: List student submissions for a homework assignment
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: homeworkId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List of submissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/HomeworkSubmission' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404:
 *         description: Homework not found, or its group belongs to another mentor
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get(
  '/:homeworkId/submissions',
  validate({ params: homeworkIdParamSchema }),
  ctrl.listSubmissions,
);

/**
 * @openapi
 * /api/mentor/homework/submissions/{submissionId}/grade:
 *   post:
 *     tags: [Mentor Homework]
 *     summary: Grade a homework submission
 *     description: >
 *       Idempotent — grading an already-graded submission returns 409. On
 *       success, awards `homework.coinReward` coins to the student (via
 *       `changeCoins`, in the same transaction as the grade) if the homework has
 *       a nonzero coin reward, then emits a coins-changed event after commit.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: submissionId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [score]
 *             properties:
 *               score: { type: integer, minimum: 0 }
 *     responses:
 *       200:
 *         description: Graded submission
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/HomeworkSubmission' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404:
 *         description: Submission not found, or its group belongs to another mentor
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: Submission is already graded
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422:
 *         description: Validation failed, or score outside 0..max_score
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post(
  '/submissions/:submissionId/grade',
  validate({ params: submissionIdParamSchema, body: gradeSubmissionBodySchema }),
  ctrl.gradeSubmission,
);

export default router;
