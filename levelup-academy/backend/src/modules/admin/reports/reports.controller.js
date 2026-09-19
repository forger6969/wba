import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as service from './reports.service.js';

export const branchReport = asyncHandler(async (req, res) => {
  res.json(await service.branchReport(req.scope.branchId, req.query));
});
