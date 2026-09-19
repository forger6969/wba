import { Router } from 'express';
import { validate } from '../../../middlewares/validate.js';
import * as ctrl from './videos.controller.js';
import { videoIdParamSchema } from './videos.schemas.js';

const router = Router();

/**
 * @openapi
 * /api/student/videos:
 *   get:
 *     tags: [Student]
 *     summary: List videos across the student's own groups (non-archived)
 *     security: [{ bearerAuth: [] }]
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
 *                       duration_sec: { type: integer }
 *                       created_at: { type: string, format: date-time }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       402:
 *         description: Payment overdue — access is blocked until paid
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
router.get('/', ctrl.listVideos);

/**
 * @openapi
 * /api/student/videos/{videoId}/stream-url:
 *   get:
 *     tags: [Student]
 *     summary: Get a presigned S3 GET URL to stream a video
 *     description: Requires the student to be a member of the video's group (403 if not).
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: videoId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Presigned stream URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties: { streamUrl: { type: string, format: uri } }
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
 *         description: Video not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       422: { $ref: '#/components/responses/ValidationError' }
 */
router.get('/:videoId/stream-url', validate({ params: videoIdParamSchema }), ctrl.getStreamUrl);

export default router;
