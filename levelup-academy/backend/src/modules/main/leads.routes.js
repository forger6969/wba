import { Router } from 'express';
import { createRateLimiter } from '../../middlewares/rateLimiter.js';
import { validate } from '../../middlewares/validate.js';
import { leadSubmitSchema } from './main.schemas.js';
import * as ctrl from './main.controller.js';

const router = Router();

// ПУБЛИЧНЫЙ приём заявки с лендинга — без токена, поэтому жёсткий rate-limit
// (защита от спама формы): 5 заявок в минуту с одного адреса.
const submitLimiter = createRateLimiter({ keyPrefix: 'rl:leads', points: 5, duration: 60 });

/**
 * @openapi
 * /api/leads:
 *   post:
 *     tags: [Leads]
 *     summary: Submit a landing-page lead (public, no auth)
 *     description: >
 *       Public form submission from the marketing landing page. Rate-limited to
 *       5 requests/min per IP (route-specific bucket) in addition to the global
 *       limiter. Only `{ id }` of the created lead is returned (no internal fields
 *       leaked).
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LeadSubmitRequest' }
 *     responses:
 *       201:
 *         description: Lead recorded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string, format: uuid }
 *       422:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationErrorResponse' }
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/', submitLimiter, validate({ body: leadSubmitSchema }), ctrl.submitLead);

export default router;
