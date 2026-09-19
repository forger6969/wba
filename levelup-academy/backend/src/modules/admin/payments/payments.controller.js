import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as service from './payments.service.js';

// authorize('admin') проставляет req.scope = { organizationId, branchId } — навешано в admin.routes.js
const branchId = (req) => req.scope.branchId;

export const listInvoices = asyncHandler(async (req, res) => {
  res.json(await service.listInvoices(branchId(req), req.query));
});

export const createAdHocPayment = asyncHandler(async (req, res) => {
  res.status(201).json(await service.createAdHocPayment(req.scope, req.user.id, req.body));
});

export const payInvoice = asyncHandler(async (req, res) => {
  res.json(await service.payInvoice(req.scope, req.user.id, req.params.id, req.body));
});

export const refundTransaction = asyncHandler(async (req, res) => {
  res.json(await service.refundTransaction(req.scope, req.params.id, req.body.reason));
});

export const voidTransaction = asyncHandler(async (req, res) => {
  res.json(await service.voidTransaction(req.scope, req.params.id, req.body.reason));
});

export const getReceiptUploadUrl = asyncHandler(async (req, res) => {
  res.json(await service.getReceiptUploadUrl(req.scope, req.params.id, req.query));
});

export const attachReceipt = asyncHandler(async (req, res) => {
  res.json(await service.attachReceipt(req.scope, req.params.id, req.body.receiptKey));
});
