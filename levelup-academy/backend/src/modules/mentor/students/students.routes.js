import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../../middlewares/validate.js';
import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as service from './students.service.js';

const router = Router();

const studentParam = z.object({ studentId: z.string().uuid() });

/**
 * @swagger
 * /api/mentor/students/{studentId}/stats:
 *   get:
 *     tags: [Mentor]
 *     summary: Statistics for one student (attendance, homework, tests, coins)
 *     description: >
 *       Aggregated in a single call: every query is scoped to groups led by the
 *       requesting mentor, so a student from someone else's group answers 404 —
 *       indistinguishable from one that does not exist.
 *       Homework and tests are LEFT JOINed, so assignments the student never
 *       submitted are present in the list with state `missed` or `pending`.
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Student statistics
 *       404:
 *         description: Student is not in any of your groups
 */
router.get(
  '/:studentId/stats',
  validate({ params: studentParam }),
  asyncHandler(async (req, res) => {
    const data = await service.getStudentStats(req.params.studentId, req.user.id);
    res.json({ success: true, data });
  }),
);

export default router;
