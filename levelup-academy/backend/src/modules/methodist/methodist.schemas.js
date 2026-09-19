import { z } from 'zod';

// Вопрос с поддержкой DOM/BOM структуры: разные типы вопросов
const baseQuestionSchema = z.object({
  q: z.string().min(1).max(1000),
  type: z.enum(['choice', 'multiple', 'text', 'match', 'order']).default('choice'),
});

const choiceQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('choice'),
  options: z.array(z.string().min(1).max(300)).min(2, 'At least 2 options'),
  correct: z.number().int().min(0),
});

const multipleQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('multiple'),
  options: z.array(z.string().min(1).max(300)).min(2, 'At least 2 options'),
  correct: z.array(z.number().int().min(0)).min(1, 'At least one correct answer'),
});

const textQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('text'),
  correctAnswer: z.string().min(1).max(500),
  caseSensitive: z.boolean().default(false),
});

const matchQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('match'),
  pairs: z.array(
    z.object({
      left: z.string().min(1).max(200),
      right: z.string().min(1).max(200),
    }),
  ).min(2, 'At least 2 pairs'),
});

const orderQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('order'),
  items: z.array(z.string().min(1).max(200)).min(2, 'At least 2 items'),
  correctOrder: z.array(z.number().int().min(0)).min(2),
});

const questionSchema = z.discriminatedUnion('type', [
  choiceQuestionSchema,
  multipleQuestionSchema,
  textQuestionSchema,
  matchQuestionSchema,
  orderQuestionSchema,
]).refine(
  (q) => {
    if (q.type === 'choice') return q.correct < q.options.length;
    if (q.type === 'multiple') return q.correct.every((c) => c < q.options.length);
    if (q.type === 'order') return q.correctOrder.length === q.items.length;
    return true;
  },
  { message: 'Invalid question structure' },
);

export const createTestSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  questions: z.array(questionSchema).min(1, 'At least one question required'),
  durationMin: z.coerce.number().int().positive(),
  coinReward: z.coerce.number().int().min(0).default(0),
  branchId: z.string().uuid().optional(),        // если не указана — все филиалы
  groupIds: z.array(z.string().uuid()).optional(), // если не указаны — все группы
});

export const updateTestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  questions: z.array(questionSchema).min(1).optional(),
  durationMin: z.coerce.number().int().positive().optional(),
  coinReward: z.coerce.number().int().min(0).optional(),
});

export const createHomeworkSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  maxScore: z.coerce.number().int().positive().default(100),
  coinReward: z.coerce.number().int().min(0).default(0),
  deadline: z.coerce.date(),
  branchId: z.string().uuid().optional(),
  groupIds: z.array(z.string().uuid()).optional(),
});

export const updateHomeworkSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(4000).optional(),
  maxScore: z.coerce.number().int().positive().optional(),
  coinReward: z.coerce.number().int().min(0).optional(),
  deadline: z.coerce.date().optional(),
});

export const idParam = z.object({ id: z.string().uuid('Invalid id') });
export const groupIdParam = z.object({ groupId: z.string().uuid('Invalid groupId') });
