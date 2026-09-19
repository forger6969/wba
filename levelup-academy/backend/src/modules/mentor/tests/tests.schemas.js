import { z } from 'zod';

export const groupIdParamSchema = z.object({
  groupId: z.string().uuid(),
});

export const testIdParamSchema = z.object({
  testId: z.string().uuid(),
});

const questionSchema = z
  .object({
    q: z.string().min(1).max(1000),
    options: z.array(z.string().min(1).max(300)).min(2, 'At least 2 options are required'),
    correct: z.number().int().min(0),
  })
  .refine((question) => question.correct < question.options.length, {
    message: 'correct must be a valid index within options',
    path: ['correct'],
  });

export const createTestBodySchema = z
  .object({
    title: z.string().min(1).max(200),
    questions: z.array(questionSchema).min(1, 'At least one question is required'),
    durationMin: z.coerce.number().int().positive(),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
    coinReward: z.coerce.number().int().min(0).default(0),
  })
  .refine((body) => !body.startsAt || !body.endsAt || body.endsAt > body.startsAt, {
    message: 'endsAt must be after startsAt',
    path: ['endsAt'],
  });
