import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as service from './notifications.service.js';

/**
 * GET /notifications — лента уведомлений (оценки/посещаемость/платежи) по всем детям родителя.
 * FE-PARENT-PAGINATION: ?before=<ISO createdAt> — курсор для "загрузить ещё".
 */
export const list = asyncHandler(async (req, res) => {
  const before = typeof req.query.before === 'string' ? req.query.before : null;
  const data = await service.listForParent(req.user.id, before);
  res.json({ success: true, data });
});
