import { Router } from 'express';
import { validate } from '../../../middlewares/validate.js';
import * as ctrl from './homework.controller.js';
import {
  homeworkIdParamSchema,
  uploadUrlQuerySchema,
  submitHomeworkSchema,
} from './homework.schemas.js';

const router = Router();

/**
 * @openapi
 * /api/student/homework:
 *   get:
 *     tags: [Student]
 *     summary: List homework across the student's own groups, with own submission status
 *     description: Blocked with 402 if the student has an unpaid overdue invoice.
 *     security: [{ bearerAuth: [] }]
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
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       group_id: { type: string, format: uuid }
 *                       title: { type: string }
 *                       description: { type: string, nullable: true }
 *                       attachment_key: { type: string, nullable: true }
 *                       max_score: { type: integer }
 *                       coin_reward: { type: integer }
 *                       deadline: { type: string, format: date-time }
 *                       created_at: { type: string, format: date-time }
 *                       submission_status: { type: string, nullable: true, enum: [submitted, late, graded, null] }
 *                       score: { type: integer, nullable: true }
 *                       submitted_at: { type: string, format: date-time, nullable: true }
 *                       file_key: { type: string, nullable: true }
 *                       text_answer: { type: string, nullable: true }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       402:
 *         description: Payment overdue — access is blocked until paid
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/', ctrl.listHomework);

/**
 * @openapi
 * /api/student/homework/{homeworkId}/upload-url:
 *   get:
 *     tags: [Student]
 *     summary: Get a presigned S3 upload URL for a homework solution file
 *     description: >
 *       Requires the student to be a member of the homework's group (403 if not)
 *       and the homework to not be archived (409 if archived).
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: homeworkId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: filename
 *         in: query
 *         required: true
 *         schema: { type: string, maxLength: 255 }
 *       - name: contentType
 *         in: query
 *         required: true
 *         schema: { type: string, maxLength: 120 }
 *     responses:
 *       200:
 *         description: Presigned upload URL + object key
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     uploadUrl: { type: string, format: uri }
 *                     fileKey: { type: string }
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
 *         description: Homework not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: Homework is archived
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get(
  '/:homeworkId/upload-url',
  validate({ params: homeworkIdParamSchema, query: uploadUrlQuerySchema }),
  ctrl.getUploadUrl,
);

/**
 * @openapi
 * /api/student/homework/{homeworkId}/submit:
 *   post:
 *     tags: [Student]
 *     summary: Submit (or resubmit, if not yet graded) a homework solution
 *     description: >
 *       At least one of `fileKey`/`textAnswer` is required. Status becomes `late`
 *       if submitted after the deadline, else `submitted`. Resubmitting after
 *       grading returns 409 (a DB guard prevents overwriting a graded submission).
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: homeworkId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fileKey: { type: string, maxLength: 512 }
 *               textAnswer: { type: string, maxLength: 10000 }
 *     responses:
 *       201:
 *         description: Submission recorded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/HomeworkSubmission' }
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
 *         description: Homework not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: Homework is already graded, or is archived
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/:homeworkId/submit',
  validate({ params: homeworkIdParamSchema, body: submitHomeworkSchema }),
  ctrl.submit,
);

export default router;
