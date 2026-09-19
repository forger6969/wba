import { z } from 'zod';

export const testIdParamSchema = z.object({
  testId: z.string().uuid(),
});

export const submitTestSchema = z.object({
  answers: z.array(z.number().int()).min(1),
});
