import { asyncHandler } from '../../utils/asyncHandler.js';
import { recordPlatformAudit } from '../main/main.service.js';
import * as service from './platformBilling.service.js';

function audit(req, { action, orgId = null, entityId, entityLabel, before, after, reason }) {
  return recordPlatformAudit({
    orgId,
    actorId: req.user?.id,
    actorRole: req.user?.role,
    action,
    entityType: 'platform_invoice',
    entityId,
    entityLabel,
    before,
    after,
    reason,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
}

export const listInvoices = asyncHandler(async (req, res) => {
  res.json(await service.listInvoices(req.query));
});

export const getOrgDebt = asyncHandler(async (_req, res) => {
  res.json({ items: await service.getOrgDebt() });
});

export const generateInvoices = asyncHandler(async (req, res) => {
  const period = req.body.periodCovered ?? service.currentPeriod();
  const created = await service.generateInvoices(period);
  await audit(req, {
    action: 'platform_invoice.generated',
    entityLabel: `${period}: ${created.length} счетов`,
    after: { periodCovered: period, count: created.length },
  });
  res.status(201).json({ periodCovered: period, created: created.length });
});

export const cancelInvoice = asyncHandler(async (req, res) => {
  const invoice = await service.cancelInvoice(req.params.id, req.body.reason);
  await audit(req, {
    action: 'platform_invoice.cancelled',
    orgId: invoice.organizationId,
    entityId: invoice.id,
    entityLabel: `${invoice.organizationName ?? invoice.organizationId} · ${invoice.periodCovered}`,
    reason: req.body.reason,
  });
  res.json({ invoice });
});
