import { z } from 'zod';

export const homeworkIdParamSchema = z.object({
  homeworkId: z.string().uuid(),
});

export const uploadUrlQuerySchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(120),
});

export const submitHomeworkSchema = z
  .object({
    fileKey: z.string().max(512).optional(),
    textAnswer: z.string().max(10_000).optional(),
  })
  .refine((v) => Boolean(v.fileKey || v.textAnswer), {
    message: 'fileKey or textAnswer is required',
  });
