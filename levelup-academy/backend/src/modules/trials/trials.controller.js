import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import * as repo from './trials.repository.js';

const n = (v) => (v === undefined ? null : v);

export const list = asyncHandler(async (req, res) => {
  const rows = await repo.list({
    organizationId: req.scope.organizationId,
    branchId: req.scope.branchId,
    status: req.query.status,
  });
  res.json({ success: true, data: rows });
});

export const create = asyncHandler(async (req, res) => {
  const b = req.body;
  const id = await repo.create({
    organizationId: req.scope.organizationId,
    branchId: req.scope.branchId ?? null,
    studentName: b.studentName,
    phone: n(b.phone), subject: n(b.subject), trialDate: n(b.trialDate),
    mentorId: n(b.mentorId), status: n(b.status), notes: n(b.notes),
    createdBy: req.user.id,
  });
  res.status(201).json({ success: true, data: { id } });
});

export const update = asyncHandler(async (req, res) => {
  const b = req.body;
  const r = await repo.update(req.params.id, req.scope.organizationId, {
    studentName: n(b.studentName), phone: n(b.phone), subject: n(b.subject),
    trialDate: n(b.trialDate), mentorId: n(b.mentorId), status: n(b.status),
    reason: n(b.reason), followUpDate: n(b.followUpDate), notes: n(b.notes),
  });
  if (!r) throw new AppError(404, 'Probniy topilmadi');
  res.json({ success: true });
});

export const remove = asyncHandler(async (req, res) => {
  const ok = await repo.remove(req.params.id, req.scope.organizationId);
  if (!ok) throw new AppError(404, 'Probniy topilmadi');
  res.status(204).end();
});
