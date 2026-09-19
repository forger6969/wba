import { z } from 'zod';

// ---------- Типы обучения ----------
export const createTrainingTypeSchema = z.object({
  name: z.string().trim().min(1, 'Название обязательно').max(160),
  description: z.string().trim().max(1000).optional(),
  icon: z.string().trim().max(60).optional(),
  // Aqlli tahlil: включать только там, где практика — реальный читаемый код
  // (HTML/CSS/JS), не для курсов с большим числом файлов (React и т.п.)
  aiReviewEnabled: z.coerce.boolean().default(false),
});

export const updateTrainingTypeSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(1000).optional(),
  icon: z.string().trim().max(60).optional(),
  aiReviewEnabled: z.coerce.boolean().optional(),
});

// ---------- Темы ----------
export const createTopicSchema = z.object({
  trainingTypeId: z.string().uuid(),
  name: z.string().trim().min(1, 'Название обязательно').max(200),
  description: z.string().trim().max(2000).optional(),
  videoUrl: z.string().trim().max(500).optional(),
  coinReward: z.coerce.number().int().min(0).default(0),
});

export const updateTopicSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  videoUrl: z.string().trim().max(500).optional(),
  coinReward: z.coerce.number().int().min(0).optional(),
});

// Presigned upload для видео-файла темы (альтернатива videoUrl — см. topics.service.js)
export const topicVideoUploadUrlQuery = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.string().trim().max(150).optional(),
});

export const confirmTopicVideoSchema = z.object({
  fileKey: z.string().trim().min(1).max(500),
  durationSec: z.coerce.number().int().min(0).optional(),
});

// ---------- Уроки (тест / практика) ----------
export const createLessonSchema = z
  .object({
    topicId: z.string().uuid(),
    title: z.string().trim().min(1, 'Название обязательно').max(200),
    lessonType: z.enum(['test', 'practical']),
    description: z.string().trim().max(4000).optional(),
    instruction: z.string().trim().max(2000).optional(),
    coinReward: z.coerce.number().int().min(0).default(0),
    videoUrl: z.string().trim().url('Некорректная ссылка').max(2000).or(z.literal('')).optional(),
  })
  // practical → Aqlli tahlil (Groq) shu description'ga qarab tekshiradi —
  // bo'sh bo'lsa AI vazifa nima ekanini bilmay, faqat kodning umumiy
  // sifatini baholaydi (10.08.2026 xato — 70 ball vs to'g'ri 20 ball,
  // aynan shu sabab tekshirilgan edi). Test-turdagi darsda o'z savollari
  // bor, tavsif shart emas.
  .refine((v) => v.lessonType !== 'practical' || Boolean(v.description?.trim()), {
    message: "Amaliy (practical) dars uchun tavsif (description) majburiy — AI-tahlil shunga tayanadi",
    path: ['description'],
  });

export const updateLessonSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(4000).optional(),
  instruction: z.string().trim().max(2000).optional(),
  coinReward: z.coerce.number().int().min(0).optional(),
  videoUrl: z.string().trim().url('Некорректная ссылка').max(2000).or(z.literal('')).optional(),
  fileKey: z.string().trim().max(500).or(z.literal('')).optional(),
});

// Presigned upload for a lesson's practical-task attachment
export const lessonUploadUrlQuery = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.string().trim().max(150).optional(),
});

// ---------- Вопросы: 3 формата ----------
// 'choice' — классический A/B/C/D. 'riddle'/'open' технически одно и то же
// (свободный текстовый ответ, сверяется без учёта регистра при проверке) —
// разные значения оставлены для UI/аналитики методиста, а не потому что
// логика проверки отличается (см. lessons.service.js student-стороны).
const questionText = z.string().trim().min(1, 'Текст вопроса обязателен').max(1000);
const optionField = z.string().trim().min(1).max(300);
const textAnswerField = z.string().trim().min(1, 'Правильный ответ обязателен').max(300);

const choiceQuestionBody = {
  questionType: z.literal('choice'),
  questionText,
  optionA: optionField,
  optionB: optionField,
  optionC: optionField,
  optionD: optionField,
  correctAnswer: z.enum(['A', 'B', 'C', 'D']),
};
const riddleQuestionBody = { questionType: z.literal('riddle'), questionText, correctTextAnswer: textAnswerField };
const openQuestionBody = { questionType: z.literal('open'), questionText, correctTextAnswer: textAnswerField };

export const createQuestionSchema = z.discriminatedUnion('questionType', [
  z.object({ lessonId: z.string().uuid(), ...choiceQuestionBody }),
  z.object({ lessonId: z.string().uuid(), ...riddleQuestionBody }),
  z.object({ lessonId: z.string().uuid(), ...openQuestionBody }),
]);

// Полная замена вопроса (тот же приём, что уже использовал фронт для
// реордера — своп двух вопросов целиком через два PATCH), включая смену
// формата — поэтому не partial-патч, а тот же discriminated union.
export const updateQuestionSchema = z.discriminatedUnion('questionType', [
  z.object(choiceQuestionBody),
  z.object(riddleQuestionBody),
  z.object(openQuestionBody),
]);

// Пакетное создание вопросов
export const createQuestionsBatchSchema = z.object({
  questions: z.array(createQuestionSchema).min(1, 'Хотя бы один вопрос'),
});

// Копировать урок (тест/практику) в тему
export const copyLessonSchema = z.object({
  targetTopicId: z.string().uuid(),
});

export const idParam = z.object({ id: z.string().uuid('Invalid id') });
export const trainingTypeIdParam = z.object({ trainingTypeId: z.string().uuid('Invalid trainingTypeId') });
export const topicIdParam = z.object({ topicId: z.string().uuid('Invalid topicId') });
export const lessonIdParam = z.object({ lessonId: z.string().uuid('Invalid lessonId') });
