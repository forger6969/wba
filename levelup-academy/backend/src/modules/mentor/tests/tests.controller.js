import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as testsService from './tests.service.js';

/** POST /api/mentor/tests/groups/:groupId — создать тест для своей группы. */
export const createTest = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const test = await testsService.createTestForGroup({
    mentorId: req.user.id,
    groupId,
    payload: req.body,
  });
  res.status(201).json({ success: true, data: test });
});

/** GET /api/mentor/tests/groups/:groupId — список тестов группы. */
export const listTestsForGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const items = await testsService.listTestsForGroup({ mentorId: req.user.id, groupId });
  res.json({ success: true, data: items });
});

/** GET /api/mentor/tests/:testId/results — результаты студентов по тесту. */
export const listResults = asyncHandler(async (req, res) => {
  const { testId } = req.params;
  const items = await testsService.listResults({ mentorId: req.user.id, testId });
  res.json({ success: true, data: items });
});
