import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as service from './shop-admin.service.js';

const branchId = (req) => req.scope.branchId;

export const listBranchItems = asyncHandler(async (req, res) => {
  res.json({ items: await service.listItemsForBranch(branchId(req)) });
});

export const createBranchItem = asyncHandler(async (req, res) => {
  res.status(201).json({ item: await service.createItemForBranch(branchId(req), req.body) });
});

export const restockItem = asyncHandler(async (req, res) => {
  res.json({ item: await service.restockItem(branchId(req), req.params.id, req.body.stock) });
});

export const listOrders = asyncHandler(async (req, res) => {
  res.json(await service.listOrders(branchId(req), req.query));
});

export const fulfillOrder = asyncHandler(async (req, res) => {
  res.json({ order: await service.fulfillOrder(branchId(req), req.params.id) });
});

export const cancelOrder = asyncHandler(async (req, res) => {
  res.json({ order: await service.cancelOrder(branchId(req), req.params.id, req.user.id) });
});
