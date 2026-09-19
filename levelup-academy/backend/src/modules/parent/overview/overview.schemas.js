import { z } from 'zod';

export const childIdParamSchema = z.object({
  childId: z.string().uuid(),
});

export const homeworkIdParamSchema = z.object({
  homeworkId: z.string().uuid(),
});

export const testIdParamSchema = z.object({
  testId: z.string().uuid(),
});

export const pageQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const gradesQuerySchema = pageQuerySchema.extend({
  type: z.enum(['homework', 'tests']).default('homework'),
});
