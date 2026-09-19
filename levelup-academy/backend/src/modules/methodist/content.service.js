import { AppError } from '../../utils/AppError.js';
import { buildObjectKey, getUploadUrl as getS3UploadUrl, getObjectSize } from '../../config/s3.js';
import { calcVideoCost } from '../../config/pricing.js';
import * as repo from './content.repository.js';

// ==================== ТИПЫ ОБУЧЕНИЯ ====================

/** AI-review — платная фича (Main Admin включает партнёру отдельно); методист
 * не может включить её сам, если она не куплена/не подключена организации. */
async function assertAiReviewPurchased(orgId) {
  if (!(await repo.isAiReviewEnabledForOrg(orgId))) {
    throw new AppError(403, 'AI-review is not enabled for your organization — ask the platform owner to turn it on');
  }
}

export async function createTrainingType(orgId, userId, payload) {
  if (payload.aiReviewEnabled) await assertAiReviewPurchased(orgId);
  return repo.insertTrainingType({ orgId, createdBy: userId, ...payload });
}

export async function listTrainingTypes(orgId) {
  return repo.listTrainingTypes(orgId);
}

export async function updateTrainingType(id, orgId, payload) {
  if (payload.aiReviewEnabled) await assertAiReviewPurchased(orgId);
  const item = await repo.updateTrainingType(id, orgId, payload);
  if (!item) throw new AppError(404, 'Training type not found');
  return item;
}

export async function archiveTrainingType(id, orgId) {
  await repo.archiveTrainingType(id, orgId);
}

// ==================== ТЕМЫ ====================
export async function createTopic(orgId, userId, payload) {
  const tt = await repo.findTrainingType(payload.trainingTypeId, orgId);
  if (!tt) throw new AppError(404, 'Training type not found');
  return repo.insertTopic({ createdBy: userId, ...payload });
}

export async function listTopics(trainingTypeId, orgId) {
  const tt = await repo.findTrainingType(trainingTypeId, orgId);
  if (!tt) throw new AppError(404, 'Training type not found');
  return repo.listTopics(trainingTypeId);
}

export async function updateTopic(id, orgId, payload) {
  const item = await repo.updateTopic(id, orgId, payload);
  if (!item) throw new AppError(404, 'Topic not found');
  return item;
}

export async function archiveTopic(id, orgId) {
  await repo.archiveTopic(id, orgId);
}

/** Presigned S3 PUT для видео-файла темы (альтернатива вставке ссылки на YouTube). */
export async function getTopicVideoUploadUrl(topicId, orgId, { filename, contentType }) {
  const topic = await repo.findTopicInOrg(topicId, orgId);
  if (!topic) throw new AppError(404, 'Topic not found');
  const fileKey = buildObjectKey(`topics/${topicId}/video`, filename);
  const uploadUrl = await getS3UploadUrl(fileKey, contentType);
  return { uploadUrl, fileKey };
}

/**
 * Регистрация видео-файла ПОСЛЕ успешной загрузки на uploadUrl. Размер —
 * не то, что прислал клиент, а реальный (HeadObject на Storj), иначе
 * методист мог бы занизить цифру и мы недосчитались бы стоимости.
 */
export async function confirmTopicVideo(topicId, orgId, { fileKey, durationSec }) {
  const topic = await repo.findTopicInOrg(topicId, orgId);
  if (!topic) throw new AppError(404, 'Topic not found');

  const sizeBytes = await getObjectSize(fileKey);
  const { storageCostUsdPerMonth, costPerViewUsd } = calcVideoCost(sizeBytes);

  const item = await repo.setTopicVideoFile(topicId, orgId, {
    fileKey,
    sizeBytes,
    durationSec,
    storageCostUsdPerMonth,
    costPerViewUsd,
  });
  if (!item) throw new AppError(404, 'Topic not found');
  return item;
}

export async function clearTopicVideoFile(topicId, orgId) {
  const item = await repo.clearTopicVideoFile(topicId, orgId);
  if (!item) throw new AppError(404, 'Topic not found');
  return item;
}

// ==================== УРОКИ ====================
export async function createLesson(orgId, userId, payload) {
  const topic = await repo.findTopicInOrg(payload.topicId, orgId);
  if (!topic) throw new AppError(404, 'Topic not found in your organization');
  return repo.insertLesson({ createdBy: userId, ...payload });
}

export async function listLessons(topicId, orgId) {
  const topic = await repo.findTopicInOrg(topicId, orgId);
  if (!topic) throw new AppError(404, 'Topic not found');
  return repo.listLessons(topicId);
}

export async function getLesson(lessonId, orgId) {
  const lesson = await repo.findLessonWithQuestions(lessonId, orgId);
  if (!lesson) throw new AppError(404, 'Lesson not found');
  return lesson;
}

/** description опускается в PATCH'e только когда его реально трогают —
 * lessonType в updateLessonSchema нет (тип урока после создания не меняется),
 * поэтому чтобы понять "практический ли это урок", нужен отдельный lookup,
 * но только если description вообще участвует в этом запросе. */
export async function updateLesson(id, orgId, payload) {
  if (payload.description !== undefined) {
    const current = await repo.findLessonInOrg(id, orgId);
    if (!current) throw new AppError(404, 'Lesson not found');
    const clearing = !payload.description || !payload.description.trim();
    if (current.lesson_type === 'practical' && clearing) {
      throw new AppError(422, "Amaliy (practical) dars uchun tavsif (description) majburiy — AI-tahlil shunga tayanadi");
    }
  }

  const item = await repo.updateLesson(id, orgId, payload);
  if (!item) throw new AppError(404, 'Lesson not found');
  return item;
}

export async function archiveLesson(id, orgId) {
  await repo.archiveLesson(id, orgId);
}

/**
 * Presigned S3 PUT url for a lesson's practical-task attachment.
 * Verifies the lesson belongs to the caller's organization first, then
 * returns { uploadUrl, fileKey } — the client PUTs the file to uploadUrl
 * and saves the key via updateLesson({ fileKey }).
 */
export async function getLessonUploadUrl(lessonId, orgId, { filename, contentType }) {
  const lesson = await repo.findLessonInOrg(lessonId, orgId);
  if (!lesson) throw new AppError(404, 'Lesson not found');
  const fileKey = buildObjectKey(`lessons/${lessonId}`, filename);
  const uploadUrl = await getS3UploadUrl(fileKey, contentType);
  return { uploadUrl, fileKey };
}

/** Копировать урок (тест/практику) в другую тему со всеми вопросами. */
export async function copyLesson(lessonId, orgId, userId, targetTopicId) {
  const lesson = await repo.findLessonInOrg(lessonId, orgId);
  if (!lesson) throw new AppError(404, 'Lesson not found');

  const topic = await repo.findTopicInOrg(targetTopicId, orgId);
  if (!topic) throw new AppError(404, 'Target topic not found');

  const questions = await repo.listQuestions(lessonId);

  const newLesson = await repo.insertLesson({
    topicId: targetTopicId,
    createdBy: userId,
    title: `${lesson.title} (копия)`,
    lessonType: lesson.lesson_type,
    description: lesson.description,
    instruction: lesson.instruction,
    coinReward: lesson.coin_reward,
  });

  if (questions.length > 0) {
    await repo.insertQuestionsBatch(
      questions.map((q) => ({
        lessonId: newLesson.id,
        questionText: q.question_text,
        optionA: q.option_a,
        optionB: q.option_b,
        optionC: q.option_c,
        optionD: q.option_d,
        correctAnswer: q.correct_answer,
      })),
    );
  }

  return repo.findLessonWithQuestions(newLesson.id, orgId);
}

// ==================== ВОПРОСЫ ====================
// Раньше create/update/delete/list ничего не проверяли по lessonId/orgId —
// методист мог создать/поменять/удалить вопрос в чужой организации, зная
// UUID. Добавлена та же проверка, что уже стоит на остальном контенте.
export async function createQuestion(orgId, payload) {
  const lesson = await repo.findLessonInOrgById(payload.lessonId, orgId);
  if (!lesson) throw new AppError(404, 'Lesson not found in your organization');
  return repo.insertQuestion(payload);
}

export async function createQuestionsBatch(orgId, questions) {
  const lessonIds = [...new Set(questions.map((q) => q.lessonId))];
  const found = await Promise.all(lessonIds.map((id) => repo.findLessonInOrgById(id, orgId)));
  if (found.some((l) => !l)) throw new AppError(404, 'Lesson not found in your organization');
  return repo.insertQuestionsBatch(questions);
}

export async function listQuestions(lessonId, orgId) {
  const lesson = await repo.findLessonInOrgById(lessonId, orgId);
  if (!lesson) throw new AppError(404, 'Lesson not found in your organization');
  return repo.listQuestions(lessonId);
}

export async function updateQuestion(id, orgId, payload) {
  const existing = await repo.findQuestionInOrg(id, orgId);
  if (!existing) throw new AppError(404, 'Question not found');
  const item = await repo.updateQuestion(id, payload);
  return item;
}

export async function deleteQuestion(id, orgId) {
  const existing = await repo.findQuestionInOrg(id, orgId);
  if (!existing) throw new AppError(404, 'Question not found');
  await repo.deleteQuestion(id);
}
