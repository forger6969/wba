import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as testsService from './tests.service.js';

/** GET /tests — тесты по группам студента (без correct). */
export const listTests = asyncHandler(async (req, res) => {
  const data = await testsService.listForStudent(req.user.id);
  res.json({ success: true, data });
});

/** GET /tests/:testId — тест для прохождения (без correct). */
export const getTest = asyncHandler(async (req, res) => {
  const data = await testsService.getTestToTake(req.user.id, req.params.testId);
  res.json({ success: true, data });
});

/** POST /tests/:testId/start */
export const startTest = asyncHandler(async (req, res) => {
  const data = await testsService.startAttempt(req.user.id, req.params.testId);
  res.status(201).json({ success: true, data });
});

/** POST /tests/:testId/submit */
export const submitTest = asyncHandler(async (req, res) => {
  const data = await testsService.submitAttempt(req.user.id, req.params.testId, req.body.answers);
  res.json({ success: true, data });
});
