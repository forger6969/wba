import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as homeworkService from './homework.service.js';

/** POST /api/mentor/homework/groups/:groupId — создать ДЗ для своей группы. */
export const createHomework = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const homework = await homeworkService.createHomeworkForGroup({
    mentorId: req.user.id,
    groupId,
    payload: req.body,
  });
  res.status(201).json({ success: true, data: homework });
});

/** GET /api/mentor/homework/groups/:groupId — список ДЗ группы. */
export const listHomeworkForGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const items = await homeworkService.listHomeworkForGroup({ mentorId: req.user.id, groupId });
  res.json({ success: true, data: items });
});

/** GET /api/mentor/homework/:homeworkId/submissions — сдачи по ДЗ. */
export const listSubmissions = asyncHandler(async (req, res) => {
  const { homeworkId } = req.params;
  const items = await homeworkService.listSubmissions({ mentorId: req.user.id, homeworkId });
  res.json({ success: true, data: items });
});

/** POST /api/mentor/homework/submissions/:submissionId/grade — выставить оценку. */
export const gradeSubmission = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;
  const { score } = req.body;
  const submission = await homeworkService.gradeSubmission({
    mentorId: req.user.id,
    submissionId,
    score,
  });
  res.json({ success: true, data: submission });
});
