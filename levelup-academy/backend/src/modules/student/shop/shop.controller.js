import { asyncHandler } from '../../../utils/asyncHandler.js';
import { AppError } from '../../../utils/AppError.js';
import * as shopService from './shop.service.js';

const STAFF_ROLES = new Set(['admin', 'mentor']);

/** GET /shop/items — активные товары в наличии для филиала студента. */
export const listItems = asyncHandler(async (req, res) => {
  const data = await shopService.listItems(req.user.branchId);
  res.json({ success: true, data });
});

/** POST /shop/items/:itemId/purchase */
export const purchase = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const data = await shopService.purchaseItem({
    itemId,
    studentId: req.user.id,
    branchId: req.user.branchId,
  });
  res.status(201).json({ success: true, data });
});

/** GET /shop/orders — история покупок текущего студента. */
export const listOrders = asyncHandler(async (req, res) => {
  const data = await shopService.listOrders(req.user.id);
  res.json({ success: true, data });
});

/** POST /shop/items — управление ассортиментом (только admin/mentor). */
export const createItem = asyncHandler(async (req, res) => {
  if (!STAFF_ROLES.has(req.user.role)) throw new AppError(403, 'Forbidden');
  const data = await shopService.createItem(req.user.branchId, req.body);
  res.status(201).json({ success: true, data });
});

/** PATCH /shop/items/:itemId — управление ассортиментом (только admin/mentor своего филиала). */
export const updateItem = asyncHandler(async (req, res) => {
  if (!STAFF_ROLES.has(req.user.role)) throw new AppError(403, 'Forbidden');
  const data = await shopService.updateItem(req.params.itemId, req.user.branchId, req.body);
  res.json({ success: true, data });
});
