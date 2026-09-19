import { z } from 'zod';

export const groupIdParamSchema = z.object({
  groupId: z.string().uuid(),
});

export const homeworkIdParamSchema = z.object({
  homeworkId: z.string().uuid(),
});

export const submissionIdParamSchema = z.object({
  submissionId: z.string().uuid(),
});

export const createHomeworkBodySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  attachmentKey: z.string().max(512).optional(),
  maxScore: z.coerce.number().int().positive().default(100),
  coinReward: z.coerce.number().int().min(0).default(0),
  deadline: z.coerce.date(),
});

export const gradeSubmissionBodySchema = z.object({
  score: z.coerce.number().int().min(0),
});
