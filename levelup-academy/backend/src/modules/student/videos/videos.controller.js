import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as videosService from './videos.service.js';

/** GET /videos — видео по группам текущего студента. */
export const listVideos = asyncHandler(async (req, res) => {
  const data = await videosService.listForStudent(req.user.id);
  res.json({ success: true, data });
});

/** GET /videos/:videoId/stream-url */
export const getStreamUrl = asyncHandler(async (req, res) => {
  const data = await videosService.getStreamUrl(req.user.id, req.params.videoId);
  res.json({ success: true, data });
});
