import { Router } from 'express';
import { validate } from '../../../middlewares/validate.js';
import * as ctrl from './lessons.controller.js';
import {
  lessonIdParamSchema,
  topicIdParamSchema,
  submitTestSchema,
  homeworkUploadUrlQuery,
  submitHomeworkSchema,
} from './lessons.schemas.js';

const router = Router();

/**
 * @openapi
 * /api/student/lessons:
 *   get:
 *     tags: [Student]
 *     summary: Topics + lessons of the student's courses (via group.training_type_id), with progress
 *     description: >
 *       Real methodology content (training_types → topics → methodology_lessons →
 *       methodology_questions), replacing what used to be a frontend mock. A student
 *       sees the union of every training_type their active groups are linked to.
 *       Progress fields (score/submissionStatus) are only populated when a real
 *       attempt/submission exists — never fabricated.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of topics, each with its lessons
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       402:
 *         description: Payment overdue — access is blocked until paid
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/', ctrl.listLessons);

/**
 * @openapi
 * /api/student/lessons/topics/{topicId}/video-url:
 *   get:
 *     tags: [Student]
 *     summary: Presigned GET url for a topic's video FILE (only when the topic has one — see hasVideoFile in the list)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: topicId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: 'Short-lived streaming url' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { description: Topic not found (outside student's courses) }
 *       409: { description: 'Topic has no video file (may use a YouTube link instead)' }
 */
router.get('/topics/:topicId/video-url', validate({ params: topicIdParamSchema }), ctrl.getTopicVideoUrl);

/**
 * @openapi
 * /api/student/lessons/topics/{topicId}/watched:
 *   post:
 *     tags: [Student]
 *     summary: Mark the topic's video as watched to the end — awards topic.coin_reward once (idempotent)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: topicId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: '{ watched: true, coinsAwarded: number } — coinsAwarded is 0 on repeat calls' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { description: Topic not found (outside student's courses) }
 */
router.post('/topics/:topicId/watched', validate({ params: topicIdParamSchema }), ctrl.markTopicVideoWatched);

/**
 * @openapi
 * /api/student/lessons/{lessonId}:
 *   get:
 *     tags: [Student]
 *     summary: Lesson detail (test-type includes attempt status, practical-type includes submission status)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Lesson detail }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404:
 *         description: Lesson not found (outside student's courses)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/:lessonId', validate({ params: lessonIdParamSchema }), ctrl.getLesson);

/**
 * @openapi
 * /api/student/lessons/{lessonId}/start:
 *   post:
 *     tags: [Student]
 *     summary: Start (or resume) a lesson test attempt
 *     description: >
 *       Idempotent while the attempt is unfinished — reloading the page just
 *       returns the same questions again, so an unlimited-time test survives
 *       a refresh. Only errors once the attempt is already submitted.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       201: { description: 'Attempt started or resumed — questions without correct answers' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { description: Lesson not found }
 *       409: { description: 'Not a test lesson, or already submitted' }
 */
router.post('/:lessonId/start', validate({ params: lessonIdParamSchema }), ctrl.startTest);

/**
 * @openapi
 * /api/student/lessons/{lessonId}/submit:
 *   post:
 *     tags: [Student]
 *     summary: Submit answers for a lesson test and get scored
 *     description: >
 *       Score >= 50 and a nonzero coin_reward grants coins immediately via the
 *       same changeCoins() path as group tests. answers is keyed by questionId.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: lessonId
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
 *                 type: object
 *                 additionalProperties: { type: string, description: "'A'-'D' for choice questions, free text for riddle/open" }
 *     responses:
 *       200: { description: Score }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { description: Lesson not found }
 *       409: { description: 'Not a test lesson, attempt not started, or already submitted' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/:lessonId/submit',
  validate({ params: lessonIdParamSchema, body: submitTestSchema }),
  ctrl.submitTest,
);

/**
 * @openapi
 * /api/student/lessons/{lessonId}/homework/upload-url:
 *   get:
 *     tags: [Student]
 *     summary: Presigned S3 upload url for a practical-lesson submission file
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - name: filename
 *         in: query
 *         required: true
 *         schema: { type: string }
 *       - name: contentType
 *         in: query
 *         required: false
 *         schema: { type: string }
 *     responses:
 *       200: { description: Presigned upload URL + fileKey }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { description: Lesson not found }
 *       409: { description: Not a practical lesson }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get(
  '/:lessonId/homework/upload-url',
  validate({ params: lessonIdParamSchema, query: homeworkUploadUrlQuery }),
  ctrl.getHomeworkUploadUrl,
);

/**
 * @openapi
 * /api/student/lessons/{lessonId}/homework:
 *   post:
 *     tags: [Student]
 *     summary: Submit a practical-lesson homework (file and/or text answer)
 *     description: >
 *       No grading endpoint exists yet for this — submission is recorded as
 *       'submitted', mentor/methodist grading is a follow-up piece of work.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: lessonId
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
 *               fileKey: { type: string }
 *               textAnswer: { type: string }
 *     responses:
 *       200: { description: Submission recorded }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { description: Lesson not found }
 *       409: { description: 'Not a practical lesson, or already graded' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post(
  '/:lessonId/homework',
  validate({ params: lessonIdParamSchema, body: submitHomeworkSchema }),
  ctrl.submitHomework,
);

export default router;
