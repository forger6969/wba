import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as service from './coins.service.js';

const actorOf = (req) => ({ id: req.user.id, role: req.user.role, branchId: req.user.branchId });

/** POST /api/mentor/coins — начислить/списать коины ученику с причиной. */
export const grantCoins = asyncHandler(async (req, res) => {
  const data = await service.grantCoins(actorOf(req), req.body);
  res.status(201).json({ success: true, data });
});

/** GET /api/mentor/coins/groups/:groupId/budget — остаток месячного лимита. */
export const groupBudget = asyncHandler(async (req, res) => {
  const data = await service.groupBudget(actorOf(req), req.params.groupId);
  res.json({ success: true, data });
});

/** GET /api/mentor/coins/students/:studentId — история коинов ученика. */
export const studentHistory = asyncHandler(async (req, res) => {
  const data = await service.studentHistory(actorOf(req), req.params.studentId, req.query);
  res.json({ success: true, data });
});
