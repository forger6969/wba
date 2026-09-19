import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as service from './overview.service.js';

/** GET /children — список детей текущего родителя. */
export const listChildren = asyncHandler(async (req, res) => {
  const data = await service.listChildren(req.user.id);
  res.json({ success: true, data });
});

/** GET /children/:childId/overview — обзор конкретного ребёнка. */
export const getChildOverview = asyncHandler(async (req, res) => {
  const data = await service.getChildOverview(req.user.id, req.params.childId);
  res.json({ success: true, data });
});

/** GET /children/:childId/attendance — постраничная история посещаемости. */
export const getChildAttendance = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const data = await service.getChildAttendance(req.user.id, req.params.childId, page, limit);
  res.json({ success: true, data });
});

/** GET /children/:childId/grades — постраничные оценки (ДЗ или тесты). */
export const getChildGrades = asyncHandler(async (req, res) => {
  const { type, page, limit } = req.query;
  const data = await service.getChildGrades(req.user.id, req.params.childId, type, page, limit);
  res.json({ success: true, data });
});

export const getChildGroupRating = asyncHandler(async (req, res) => {
  const data = await service.getChildGroupRating(req.user.id, req.params.childId);
  res.json({ success: true, data });
});

export const getHomeworkDetail = asyncHandler(async (req, res) => {
  const data = await service.getHomeworkDetail(req.user.id, req.params.homeworkId);
  res.json({ success: true, data });
});

export const getTestDetail = asyncHandler(async (req, res) => {
  const data = await service.getTestDetail(req.user.id, req.params.testId);
  res.json({ success: true, data });
});
