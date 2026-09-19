import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as salaryService from './salary.service.js';

/** GET /api/mentor/salary/mentors/:mentorId?year= */
export const getMentorSalaries = asyncHandler(async (req, res) => {
  const { mentorId } = req.params;
  const { year } = req.query;
  const rows = await salaryService.getMentorSalaries({ requester: req.user, mentorId, year });
  res.json({ success: true, data: rows });
});

/** GET /api/mentor/salary/mentors/:mentorId/suggestion?month=YYYY-MM */
export const getSalarySuggestion = asyncHandler(async (req, res) => {
  const { mentorId } = req.params;
  const { month } = req.query;
  const suggestion = await salaryService.getSalarySuggestion({ requester: req.user, mentorId, month });
  res.json({ success: true, data: suggestion });
});

/** POST /api/mentor/salary — upsert записи (admin only). */
export const upsertSalary = asyncHandler(async (req, res) => {
  const record = await salaryService.upsertSalary({ requester: req.user, ...req.body });
  res.status(201).json({ success: true, data: record });
});

/** PATCH /api/mentor/salary/:id/status — смена статуса (admin only). */
export const updateStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const record = await salaryService.updateStatus({ requester: req.user, id, status });
  res.json({ success: true, data: record });
});
