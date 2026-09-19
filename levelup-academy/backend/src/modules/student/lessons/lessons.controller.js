import { asyncHandler } from '../../../utils/asyncHandler.js';
import * as service from './lessons.service.js';

/** GET /lessons — темы+уроки методики курсов студента, с прогрессом. */
export const listLessons = asyncHandler(async (req, res) => {
  const data = await service.listForStudent(req.user.id);
  res.json({ success: true, data });
});

/** GET /lessons/topics/:topicId/video-url — только для тем с файловым видео. */
export const getTopicVideoUrl = asyncHandler(async (req, res) => {
  const data = await service.getTopicVideoStreamUrl(req.user.id, req.params.topicId);
  res.json({ success: true, data });
});

/** POST /lessons/topics/:topicId/watched — вызывать один раз при реальном ENDED. */
export const markTopicVideoWatched = asyncHandler(async (req, res) => {
  const data = await service.markTopicVideoWatched(req.user.id, req.params.topicId);
  res.json({ success: true, data });
});

/** GET /lessons/:lessonId */
export const getLesson = asyncHandler(async (req, res) => {
  const data = await service.getLessonDetail(req.user.id, req.params.lessonId);
  res.json({ success: true, data });
});

/** POST /lessons/:lessonId/start — только для lesson_type = 'test'. */
export const startTest = asyncHandler(async (req, res) => {
  const data = await service.startTest(req.user.id, req.params.lessonId);
  res.status(201).json({ success: true, data });
});

/** POST /lessons/:lessonId/submit */
export const submitTest = asyncHandler(async (req, res) => {
  const data = await service.submitTest(req.user.id, req.params.lessonId, req.body.answers, req.user.branchId);
  res.json({ success: true, data });
});

/** GET /lessons/:lessonId/homework/upload-url?filename=&contentType= — только для 'practical'. */
export const getHomeworkUploadUrl = asyncHandler(async (req, res) => {
  const { filename, contentType } = req.query;
  const data = await service.getHomeworkUploadUrl(req.user.id, req.params.lessonId, { filename, contentType });
  res.json({ success: true, data });
});

/** POST /lessons/:lessonId/homework — { fileKey?, textAnswer? } */
export const submitHomework = asyncHandler(async (req, res) => {
  const data = await service.submitHomework(req.user.id, req.user.organizationId, req.params.lessonId, req.body);
  res.json({ success: true, data });
});
