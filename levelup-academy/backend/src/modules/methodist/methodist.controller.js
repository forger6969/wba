import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './methodist.service.js';
import * as contentService from './content.service.js';
import * as videosService from './videos.service.js';

const orgId = (req) => req.scope.organizationId;

// ==================== ТЕСТЫ (старые) ====================

export const createTest = asyncHandler(async (req, res) => {
  const test = await service.createTest(orgId(req), req.user.id, req.body);
  res.status(201).json({ success: true, data: test });
});

export const listTests = asyncHandler(async (req, res) => {
  const tests = await service.listTests(orgId(req));
  res.json({ success: true, data: tests });
});

export const getTest = asyncHandler(async (req, res) => {
  const test = await service.getTest(req.params.id);
  res.json({ success: true, data: test });
});

export const updateTest = asyncHandler(async (req, res) => {
  const test = await service.updateTest(req.params.id, req.user.id, req.body);
  res.json({ success: true, data: test });
});

export const archiveTest = asyncHandler(async (req, res) => {
  const result = await service.archiveTest(req.params.id, req.user.id);
  res.json({ success: true, data: result });
});

// ==================== ДОМАШНИЕ ЗАДАНИЯ ====================

export const createHomework = asyncHandler(async (req, res) => {
  const hw = await service.createHomework(orgId(req), req.user.id, req.body);
  res.status(201).json({ success: true, data: hw });
});

export const listHomework = asyncHandler(async (req, res) => {
  const items = await service.listHomework(orgId(req));
  res.json({ success: true, data: items });
});

export const updateHomework = asyncHandler(async (req, res) => {
  const hw = await service.updateHomework(req.params.id, req.user.id, req.body);
  res.json({ success: true, data: hw });
});

export const archiveHomework = asyncHandler(async (req, res) => {
  const result = await service.archiveHomework(req.params.id, req.user.id);
  res.json({ success: true, data: result });
});

// ==================== АНАЛИТИКА ====================

export const getStudents = asyncHandler(async (req, res) => {
  const students = await service.getStudents(orgId(req));
  res.json({ success: true, data: students });
});

export const getGroups = asyncHandler(async (req, res) => {
  const groups = await service.getGroups(orgId(req));
  res.json({ success: true, data: groups });
});

export const getDifficultyReport = asyncHandler(async (req, res) => {
  const report = await service.getDifficultyReport(orgId(req));
  res.json({ success: true, data: report });
});

// ==================== КОНТЕНТ (Типы обучения, Темы, Уроки, Вопросы) ====================

export const createTrainingType = asyncHandler(async (req, res) => {
  const item = await contentService.createTrainingType(orgId(req), req.user.id, req.body);
  res.status(201).json({ success: true, data: item });
});

export const listTrainingTypes = asyncHandler(async (req, res) => {
  const items = await contentService.listTrainingTypes(orgId(req));
  res.json({ success: true, data: items });
});

export const updateTrainingType = asyncHandler(async (req, res) => {
  const item = await contentService.updateTrainingType(req.params.id, orgId(req), req.body);
  res.json({ success: true, data: item });
});

export const archiveTrainingType = asyncHandler(async (req, res) => {
  await contentService.archiveTrainingType(req.params.id, orgId(req));
  res.json({ success: true });
});

export const createTopic = asyncHandler(async (req, res) => {
  const item = await contentService.createTopic(orgId(req), req.user.id, req.body);
  res.status(201).json({ success: true, data: item });
});

export const listTopics = asyncHandler(async (req, res) => {
  const items = await contentService.listTopics(req.params.trainingTypeId, orgId(req));
  res.json({ success: true, data: items });
});

export const updateTopic = asyncHandler(async (req, res) => {
  const item = await contentService.updateTopic(req.params.id, orgId(req), req.body);
  res.json({ success: true, data: item });
});

export const archiveTopic = asyncHandler(async (req, res) => {
  await contentService.archiveTopic(req.params.id, orgId(req));
  res.json({ success: true });
});

export const getTopicVideoUploadUrl = asyncHandler(async (req, res) => {
  const { filename, contentType } = req.query;
  const data = await contentService.getTopicVideoUploadUrl(req.params.id, orgId(req), { filename, contentType });
  res.json({ success: true, data });
});

export const confirmTopicVideo = asyncHandler(async (req, res) => {
  const data = await contentService.confirmTopicVideo(req.params.id, orgId(req), req.body);
  res.json({ success: true, data });
});

export const clearTopicVideoFile = asyncHandler(async (req, res) => {
  const data = await contentService.clearTopicVideoFile(req.params.id, orgId(req));
  res.json({ success: true, data });
});

export const createLesson = asyncHandler(async (req, res) => {
  const item = await contentService.createLesson(orgId(req), req.user.id, req.body);
  res.status(201).json({ success: true, data: item });
});

export const listLessons = asyncHandler(async (req, res) => {
  const items = await contentService.listLessons(req.params.topicId, orgId(req));
  res.json({ success: true, data: items });
});

export const getLesson = asyncHandler(async (req, res) => {
  const item = await contentService.getLesson(req.params.id, orgId(req));
  res.json({ success: true, data: item });
});

export const updateLesson = asyncHandler(async (req, res) => {
  const item = await contentService.updateLesson(req.params.id, orgId(req), req.body);
  res.json({ success: true, data: item });
});

export const archiveLesson = asyncHandler(async (req, res) => {
  await contentService.archiveLesson(req.params.id, orgId(req));
  res.json({ success: true });
});

// GET /lessons/:id/upload-url?filename=&contentType= — presigned S3 PUT for attachment
export const getLessonUploadUrl = asyncHandler(async (req, res) => {
  const { filename, contentType } = req.query;
  const data = await contentService.getLessonUploadUrl(req.params.id, orgId(req), { filename, contentType });
  res.json({ success: true, data });
});

export const copyLesson = asyncHandler(async (req, res) => {
  const item = await contentService.copyLesson(req.params.id, orgId(req), req.user.id, req.body.targetTopicId);
  res.status(201).json({ success: true, data: item });
});

export const createQuestion = asyncHandler(async (req, res) => {
  const item = await contentService.createQuestion(orgId(req), req.body);
  res.status(201).json({ success: true, data: item });
});

export const createQuestionsBatch = asyncHandler(async (req, res) => {
  const items = await contentService.createQuestionsBatch(orgId(req), req.body.questions);
  res.status(201).json({ success: true, data: items });
});

export const listQuestions = asyncHandler(async (req, res) => {
  const items = await contentService.listQuestions(req.params.lessonId, orgId(req));
  res.json({ success: true, data: items });
});

export const updateQuestion = asyncHandler(async (req, res) => {
  const item = await contentService.updateQuestion(req.params.id, orgId(req), req.body);
  res.json({ success: true, data: item });
});

export const deleteQuestion = asyncHandler(async (req, res) => {
  await contentService.deleteQuestion(req.params.id, orgId(req));
  res.status(204).end();
});

// ==================== ВИДЕО (учебные материалы группы) ====================

// GET /videos/groups/:groupId/upload-url?filename=&contentType= — presigned S3 PUT
export const getVideoUploadUrl = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { filename, contentType } = req.query;
  const data = await videosService.getVideoUploadUrl(orgId(req), groupId, { filename, contentType });
  res.json({ success: true, data });
});

export const createVideo = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const video = await videosService.createVideo(orgId(req), req.user.id, groupId, req.body);
  res.status(201).json({ success: true, data: video });
});

export const listVideosForGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const items = await videosService.listVideosForGroup(orgId(req), groupId);
  res.json({ success: true, data: items });
});
