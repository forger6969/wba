import { z } from 'zod';

export const lessonIdParamSchema = z.object({
  lessonId: z.string().uuid(),
});

export const topicIdParamSchema = z.object({
  topicId: z.string().uuid(),
});

// answers: { [questionId]: string } — 'A'|'B'|'C'|'D' для choice-вопросов,
// свободный текст для riddle/open (сверяется в lessons.service.js без учёта
// регистра). Схема не знает тип конкретного вопроса, поэтому просто строка —
// не то, что прислали для choice, никак не проверить на этом уровне, но
// неверная буква/лишний текст просто не совпадёт при проверке.
export const submitTestSchema = z.object({
  answers: z.record(z.string().uuid(), z.string().trim().min(1).max(500)),
});

export const homeworkUploadUrlQuery = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.string().trim().max(150).optional(),
});

export const submitHomeworkSchema = z
  .object({
    fileKey: z.string().min(1).optional(),
    textAnswer: z.string().trim().min(1).max(5000).optional(),
  })
  .refine((v) => v.fileKey || v.textAnswer, { message: 'fileKey or textAnswer is required' });
