import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { archiveGuard } from '../../middlewares/archiveGuard.js';
import { orgAccessGate } from '../../middlewares/orgAccessGate.js';
import {
  createTestSchema,
  updateTestSchema,
  createHomeworkSchema,
  updateHomeworkSchema,
  idParam,
} from './methodist.schemas.js';
import {
  createTrainingTypeSchema,
  updateTrainingTypeSchema,
  createTopicSchema,
  updateTopicSchema,
  createLessonSchema,
  updateLessonSchema,
  createQuestionSchema,
  updateQuestionSchema,
  createQuestionsBatchSchema,
  copyLessonSchema,
  lessonUploadUrlQuery,
  topicVideoUploadUrlQuery,
  confirmTopicVideoSchema,
  trainingTypeIdParam,
  topicIdParam,
  lessonIdParam,
} from './content.schemas.js';
import { groupIdParam, videoUploadUrlQuery, createVideoBody } from './videos.schemas.js';
import * as ctrl from './methodist.controller.js';

/**
 * METHODIST — создаёт методики, тесты, задания.
 * Видит все филиалы, группы, студентов в своей организации.
 * НЕ видит финансовую информацию (выручка, долги, зарплаты).
 */
const router = Router();

router.use(authenticate, orgAccessGate, authorize('methodist'));

// NOTE (docs gap): methodist.controller.js also exports createTest/listTests/getTest/
// updateTest/archiveTest and createHomework/listHomework/updateHomework/archiveHomework
// (using createTestSchema/updateTestSchema/createHomeworkSchema/updateHomeworkSchema,
// imported above), but none of them are wired to a router.METHOD() call below — they
// are unreachable dead code from the HTTP API's perspective and are intentionally left
// undocumented here (no route exists to document).

/**
 * @openapi
 * /api/methodist/training-types:
 *   post:
 *     tags: [Methodist]
 *     summary: Create a training type (organization-level content root)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateTrainingTypeRequest' }
 *     responses:
 *       201:
 *         description: Training type created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/TrainingType' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *   get:
 *     tags: [Methodist]
 *     summary: List training types of the organization (with topic counts)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of training types
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
 *                       - { $ref: '#/components/schemas/TrainingType' }
 *                       - type: object
 *                         properties: { topics_count: { type: integer } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.post('/training-types', validate({ body: createTrainingTypeSchema }), ctrl.createTrainingType);
router.get('/training-types', ctrl.listTrainingTypes);

/**
 * @openapi
 * /api/methodist/training-types/{id}:
 *   patch:
 *     tags: [Methodist]
 *     summary: Update a training type (partial)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateTrainingTypeRequest' }
 *     responses:
 *       200:
 *         description: Updated training type
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/TrainingType' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Training type not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch('/training-types/:id', validate({ params: idParam, body: updateTrainingTypeSchema }), ctrl.updateTrainingType);

/**
 * @openapi
 * /api/methodist/training-types/{id}/archive:
 *   post:
 *     tags: [Methodist]
 *     summary: Archive a training type
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     responses:
 *       200:
 *         description: Archived (no data payload)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { success: { type: boolean, example: true } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/training-types/:id/archive', validate({ params: idParam }), ctrl.archiveTrainingType);

/**
 * @openapi
 * /api/methodist/topics:
 *   post:
 *     tags: [Methodist]
 *     summary: Create a topic inside a training type
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateTopicRequest' }
 *     responses:
 *       201:
 *         description: Topic created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Topic' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Training type not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/topics', validate({ body: createTopicSchema }), ctrl.createTopic);

/**
 * @openapi
 * /api/methodist/training-types/{id}/topics:
 *   get:
 *     tags: [Methodist]
 *     summary: List topics of a training type (with lesson counts)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: trainingTypeId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List of topics
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
 *                       - { $ref: '#/components/schemas/Topic' }
 *                       - type: object
 *                         properties: { lessons_count: { type: integer } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Training type not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/training-types/:trainingTypeId/topics', validate({ params: trainingTypeIdParam }), ctrl.listTopics);

/**
 * @openapi
 * /api/methodist/topics/{id}:
 *   patch:
 *     tags: [Methodist]
 *     summary: Update a topic (partial)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateTopicRequest' }
 *     responses:
 *       200:
 *         description: Updated topic
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Topic' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Topic not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch('/topics/:id', validate({ params: idParam, body: updateTopicSchema }), ctrl.updateTopic);

/**
 * @openapi
 * /api/methodist/topics/{id}/archive:
 *   post:
 *     tags: [Methodist]
 *     summary: Archive a topic
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     responses:
 *       200:
 *         description: Archived (no data payload)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { success: { type: boolean, example: true } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/topics/:id/archive', validate({ params: idParam }), ctrl.archiveTopic);

/**
 * @openapi
 * /api/methodist/topics/{id}/video/upload-url:
 *   get:
 *     tags: [Methodist]
 *     summary: Presigned S3 upload url for a topic's video FILE (alternative to a YouTube videoUrl)
 *     description: >
 *       Возвращает presigned PUT url + fileKey. Клиент грузит файл на uploadUrl,
 *       затем регистрирует его через POST /topics/{id}/video { fileKey, durationSec? }.
 *       Ссылка и файл взаимоисключающие — регистрация файла чистит videoUrl темы.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *       - in: query
 *         name: filename
 *         required: true
 *         schema: { type: string, maxLength: 255 }
 *       - in: query
 *         name: contentType
 *         required: false
 *         schema: { type: string, maxLength: 150 }
 *     responses:
 *       200:
 *         description: Presigned upload url
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
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get(
  '/topics/:id/video/upload-url',
  validate({ params: idParam, query: topicVideoUploadUrlQuery }),
  ctrl.getTopicVideoUploadUrl,
);

/**
 * @openapi
 * /api/methodist/topics/{id}/video:
 *   post:
 *     tags: [Methodist]
 *     summary: Register an uploaded video file for a topic (call AFTER the presigned PUT succeeds)
 *     description: >
 *       Размер файла определяется на сервере (HeadObject на Storj), не по тому,
 *       что прислал клиент. Стоимость хранения/просмотра считается тут же, но
 *       НЕ возвращается в ответе — эта цифра видна только Main Admin.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fileKey]
 *             properties:
 *               fileKey: { type: string }
 *               durationSec: { type: integer }
 *     responses:
 *       200:
 *         description: Topic with the video file registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Topic' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *   delete:
 *     tags: [Methodist]
 *     summary: Remove the topic's video file (does not touch videoUrl, which is already null while a file is set)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     responses:
 *       200:
 *         description: Topic with the video file cleared
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Topic' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
router.post(
  '/topics/:id/video',
  validate({ params: idParam, body: confirmTopicVideoSchema }),
  ctrl.confirmTopicVideo,
);
router.delete('/topics/:id/video', validate({ params: idParam }), ctrl.clearTopicVideoFile);

/**
 * @openapi
 * /api/methodist/lessons:
 *   post:
 *     tags: [Methodist]
 *     summary: Create a lesson (test or practical) inside a topic
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateLessonRequest' }
 *     responses:
 *       201:
 *         description: Lesson created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Lesson' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Topic not found in your organization
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/lessons', validate({ body: createLessonSchema }), ctrl.createLesson);

/**
 * @openapi
 * /api/methodist/topics/{id}/lessons:
 *   get:
 *     tags: [Methodist]
 *     summary: List lessons of a topic (with question counts)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: topicId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List of lessons
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
 *                       - { $ref: '#/components/schemas/Lesson' }
 *                       - type: object
 *                         properties: { questions_count: { type: integer } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Topic not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/topics/:topicId/lessons', validate({ params: topicIdParam }), ctrl.listLessons);

/**
 * @openapi
 * /api/methodist/lessons/{id}:
 *   get:
 *     tags: [Methodist]
 *     summary: Get a lesson with its full question list
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     responses:
 *       200:
 *         description: Lesson with questions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/LessonWithQuestions' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Lesson not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *   patch:
 *     tags: [Methodist]
 *     summary: Update a lesson (partial)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateLessonRequest' }
 *     responses:
 *       200:
 *         description: Updated lesson
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Lesson' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Lesson not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/lessons/:id', validate({ params: idParam }), ctrl.getLesson);
router.patch('/lessons/:id', validate({ params: idParam, body: updateLessonSchema }), ctrl.updateLesson);

/**
 * @openapi
 * /api/methodist/lessons/{id}/upload-url:
 *   get:
 *     tags: [Methodist]
 *     summary: Presigned S3 upload url for a lesson's practical-task attachment
 *     description: >
 *       Возвращает presigned PUT url + fileKey. Клиент грузит файл на uploadUrl,
 *       затем сохраняет ключ через PATCH /lessons/{id} { fileKey }.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *       - in: query
 *         name: filename
 *         required: true
 *         schema: { type: string, maxLength: 255 }
 *       - in: query
 *         name: contentType
 *         required: false
 *         schema: { type: string, maxLength: 150 }
 *     responses:
 *       200:
 *         description: Presigned upload url
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/LessonUploadUrl' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get(
  '/lessons/:id/upload-url',
  validate({ params: idParam, query: lessonUploadUrlQuery }),
  ctrl.getLessonUploadUrl,
);

/**
 * @openapi
 * /api/methodist/lessons/{id}/archive:
 *   post:
 *     tags: [Methodist]
 *     summary: Archive a lesson
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     responses:
 *       200:
 *         description: Archived (no data payload)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties: { success: { type: boolean, example: true } }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/lessons/:id/archive', validate({ params: idParam }), ctrl.archiveLesson);

/**
 * @openapi
 * /api/methodist/lessons/{id}/copy:
 *   post:
 *     tags: [Methodist]
 *     summary: Copy a lesson (and all its questions) into another topic
 *     description: New lesson's title is suffixed with " (копия)". Target topic must belong to the same organization.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [targetTopicId]
 *             properties: { targetTopicId: { type: string, format: uuid } }
 *     responses:
 *       201:
 *         description: New lesson with copied questions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/LessonWithQuestions' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Lesson or target topic not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/lessons/:id/copy', validate({ params: idParam, body: copyLessonSchema }), ctrl.copyLesson);

/**
 * @openapi
 * /api/methodist/questions:
 *   post:
 *     tags: [Methodist]
 *     summary: Create a question for a lesson (choice / riddle / open — see CreateQuestionRequest)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateQuestionRequest' }
 *     responses:
 *       201:
 *         description: Question created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Question' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/questions', validate({ body: createQuestionSchema }), ctrl.createQuestion);

/**
 * @openapi
 * /api/methodist/questions/batch:
 *   post:
 *     tags: [Methodist]
 *     summary: Create multiple A/B/C/D questions for one or more lessons in a single insert
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [questions]
 *             properties:
 *               questions:
 *                 type: array
 *                 minItems: 1
 *                 items: { $ref: '#/components/schemas/CreateQuestionRequest' }
 *     responses:
 *       201:
 *         description: Questions created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Question' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.post('/questions/batch', validate({ body: createQuestionsBatchSchema }), ctrl.createQuestionsBatch);

/**
 * @openapi
 * /api/methodist/lessons/{lessonId}/questions:
 *   get:
 *     tags: [Methodist]
 *     summary: List questions of a lesson
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: lessonId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List of questions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Question' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/lessons/:lessonId/questions', validate({ params: lessonIdParam }), ctrl.listQuestions);

/**
 * @openapi
 * /api/methodist/questions/{id}:
 *   patch:
 *     tags: [Methodist]
 *     summary: Update a question (partial)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateQuestionRequest' }
 *     responses:
 *       200:
 *         description: Updated question
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/Question' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404:
 *         description: Question not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *   delete:
 *     tags: [Methodist]
 *     summary: Delete a question (hard delete)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: '#/components/parameters/IdParam' }
 *     responses:
 *       204: { description: Question deleted }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.patch('/questions/:id', validate({ params: idParam, body: updateQuestionSchema }), ctrl.updateQuestion);
router.delete('/questions/:id', validate({ params: idParam }), ctrl.deleteQuestion);

/**
 * @openapi
 * /api/methodist/students:
 *   get:
 *     tags: [Methodist]
 *     summary: List all students in the organization with their groups (no financial data)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of students
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
 *                     description: Raw row shape from listStudentsWithGroups (organization-wide, all branches)
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/students', ctrl.getStudents);

/**
 * @openapi
 * /api/methodist/groups:
 *   get:
 *     tags: [Methodist]
 *     summary: List all groups in the organization (all branches)
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
 *                   items:
 *                     type: object
 *                     description: Raw row shape from listGroupsByOrg (organization-wide, all branches)
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/groups', ctrl.getGroups);

/**
 * @openapi
 * /api/methodist/difficulty:
 *   get:
 *     tags: [Methodist]
 *     summary: Difficulty analytics report — test and homework score stats across the organization
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Difficulty report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     tests:
 *                       type: array
 *                       items: { type: object, description: 'Row shape from testDifficultyStats' }
 *                     homework:
 *                       type: array
 *                       items: { type: object, description: 'Row shape from homeworkStats' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/difficulty', ctrl.getDifficultyReport);

/**
 * @openapi
 * /api/methodist/videos/groups/{groupId}/upload-url:
 *   get:
 *     tags: [Methodist]
 *     summary: Presigned S3 upload url for a group video
 *     description: >
 *       Возвращает presigned PUT url + videoKey. Клиент грузит файл на uploadUrl,
 *       затем регистрирует его через POST /videos/groups/{groupId} { videoKey }.
 *       Методист не привязан к конкретной группе как ментор — доступна любая
 *       группа своей организации.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: groupId
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
 *       200:
 *         description: Presigned upload URL + the key to reference in the create call
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
 *                     videoKey: { type: string }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404:
 *         description: Group not found (outside methodist's organization)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get(
  '/videos/groups/:groupId/upload-url',
  validate({ params: groupIdParam, query: videoUploadUrlQuery }),
  ctrl.getVideoUploadUrl,
);

/**
 * @openapi
 * /api/methodist/videos/groups/{groupId}:
 *   post:
 *     tags: [Methodist]
 *     summary: Register an uploaded video for a group
 *     description: Call this AFTER successfully PUTting the file to the presigned uploadUrl.
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
 *           schema:
 *             type: object
 *             required: [title, videoKey]
 *             properties:
 *               title: { type: string }
 *               videoKey: { type: string, description: 'The videoKey returned by the upload-url call' }
 *               durationSec: { type: integer }
 *     responses:
 *       201:
 *         description: Video registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     group_id: { type: string, format: uuid }
 *                     title: { type: string }
 *                     duration_sec: { type: integer, nullable: true }
 *                     is_archived: { type: boolean }
 *                     created_at: { type: string, format: date-time }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404:
 *         description: Group not found (outside methodist's organization)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 *   get:
 *     tags: [Methodist]
 *     summary: List videos of a group (includes archived)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: groupId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List of videos
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
 *                       duration_sec: { type: integer, nullable: true }
 *                       is_archived: { type: boolean }
 *                       created_at: { type: string, format: date-time }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404:
 *         description: Group not found (outside methodist's organization)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post(
  '/videos/groups/:groupId',
  validate({ params: groupIdParam, body: createVideoBody }),
  archiveGuard('groups', 'groupId'),
  ctrl.createVideo,
);

router.get(
  '/videos/groups/:groupId',
  validate({ params: groupIdParam }),
  ctrl.listVideosForGroup,
);

export default router;
