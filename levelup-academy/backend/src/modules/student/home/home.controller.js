import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as homeService from './home.service.js';

/** GET /home — дашборд текущего студента. */
export const getDashboard = asyncHandler(async (req, res) => {
  const data = await homeService.getDashboard(req.user);
  res.json({ success: true, data });
});

/** PATCH /home/language — сохранить язык кабинета студента на бэкенде. */
export const patchLanguage = asyncHandler(async (req, res) => {
  const data = await homeService.setPreferredLanguage(req.user.id, req.body.language);
  res.json({ success: true, data });
});
