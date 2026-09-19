import { asyncHandler } from '../../../utils/asyncHandler.js';
import { recordAudit } from '../super.service.js';
import * as service from './reminders.service.js';

const orgId = (req) => req.scope.organizationId;

function audit(req, { action, entityId }) {
  return recordAudit({
    orgId: orgId(req),
    actorId: req.user?.id,
    actorRole: req.user?.role,
    action,
    entityType: 'reminder',
    entityId,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
}

export const list = asyncHandler(async (req, res) => {
  res.json(await service.listReminders(orgId(req)));
});

export const resend = asyncHandler(async (req, res) => {
  const result = await service.resendReminder(orgId(req), req.params.id);
  await audit(req, { action: 'reminder.resend', entityId: req.params.id });
  res.json(result);
});

export const remove = asyncHandler(async (req, res) => {
  const result = await service.deleteReminder(orgId(req), req.params.id);
  await audit(req, { action: 'reminder.delete', entityId: req.params.id });
  res.json(result);
});
