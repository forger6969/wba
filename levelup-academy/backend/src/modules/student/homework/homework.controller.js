import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as homeworkService from './homework.service.js';

/** GET /homework — ДЗ по группам текущего студента. */
export const listHomework = asyncHandler(async (req, res) => {
  const data = await homeworkService.listForStudent(req.user.id);
  res.json({ success: true, data });
});

/** GET /homework/:homeworkId/upload-url?filename=&contentType= */
export const getUploadUrl = asyncHandler(async (req, res) => {
  const { homeworkId } = req.params;
  const { filename, contentType } = req.query;
  const data = await homeworkService.getUploadUrl(req.user.id, homeworkId, { filename, contentType });
  res.json({ success: true, data });
});

/** POST /homework/:homeworkId/submit */
export const submit = asyncHandler(async (req, res) => {
  const { homeworkId } = req.params;
  const data = await homeworkService.submit(req.user.id, homeworkId, req.body);
  res.status(201).json({ success: true, data });
});
