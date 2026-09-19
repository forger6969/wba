import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as service from './groups.service.js';
import * as statsService from './group-stats.service.js';

/** GET /api/mentor/groups — мои группы. */
export const myGroups = asyncHandler(async (req, res) => {
  const data = await service.myGroups(req.user.id);
  res.json({ success: true, data });
});

/** GET /api/mentor/groups/:groupId/students — состав группы. */
export const groupRoster = asyncHandler(async (req, res) => {
  const data = await service.groupRoster(req.user.id, req.params.groupId);
  res.json({ success: true, data });
});

/** GET /api/mentor/groups/:groupId/stats — сводка группы и сравнение учеников. */
export const groupStats = asyncHandler(async (req, res) => {
  const data = await statsService.getGroupStats(req.params.groupId, req.user.id);
  res.json({ success: true, data });
});
