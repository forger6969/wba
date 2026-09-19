import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './finance.service.js';

const orgId = (req) => req.scope.organizationId;

export const listBranches = asyncHandler(async (req, res) => {
  res.json({ branches: await service.listBranches(orgId(req)) });
});

export const listIncome = asyncHandler(async (req, res) => {
  res.json(await service.listIncome(orgId(req), req.query));
});

export const listSalaries = asyncHandler(async (req, res) => {
  res.json(await service.listSalaries(orgId(req), req.query));
});
