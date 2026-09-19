import { asyncHandler } from '../../utils/asyncHandler.js';
import { recordAudit } from '../super/super.service.js';
import * as service from './discipline.service.js';

const issuerOf = (req) => ({ id: req.user.id, role: req.user.role, branchId: req.user.branchId });

function audit(req, { action, entityId, meta }) {
  return recordAudit({
    orgId: req.scope.organizationId,
    actorId: req.user?.id,
    actorRole: req.user?.role,
    action,
    entityType: 'discipline_rule',
    entityId,
    meta,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
}

// POST /penalties — выдать штраф или qora (super / admin, права в сервисе)
export const issuePenalty = asyncHandler(async (req, res) => {
  const result = await service.issuePenalty(issuerOf(req), req.scope, req.body);
  res.status(201).json({ success: true, data: result });
});

// GET /penalties — список (super: вся org; admin: выданные им)
export const listPenalties = asyncHandler(async (req, res) => {
  const items = await service.listPenalties(issuerOf(req), req.scope, req.query);
  res.json({ success: true, data: items });
});

// GET /me/penalties — свои штрафы (любой сотрудник)
export const myPenalties = asyncHandler(async (req, res) => {
  const items = await service.myPenalties(req.user.id);
  res.json({ success: true, data: items });
});

// POST /staff/:id/reactivate — вернуть уволенного (super only, guard в роуте)
export const reactivateStaff = asyncHandler(async (req, res) => {
  const result = await service.reactivateStaff(req.scope.organizationId, req.params.id);
  res.json({ success: true, data: result });
});

// GET /discipline-rules — каталог правил организации (super only, guard в роуте)
export const listRules = asyncHandler(async (req, res) => {
  const items = await service.listRules(req.scope.organizationId);
  res.json({ success: true, data: items });
});

// POST /discipline-rules — новое правило (super only, guard в роуте)
export const createRule = asyncHandler(async (req, res) => {
  const rule = await service.createRule(req.scope.organizationId, req.user.id, req.body);
  await audit(req, { action: 'discipline_rule.create', entityId: rule.id, meta: { type: rule.type } });
  res.status(201).json({ success: true, data: rule });
});

// DELETE /discipline-rules/:id — удалить правило (super only, guard в роуте)
export const deleteRule = asyncHandler(async (req, res) => {
  const result = await service.deleteRule(req.scope.organizationId, req.params.id);
  await audit(req, { action: 'discipline_rule.delete', entityId: req.params.id });
  res.json({ success: true, data: result });
});
