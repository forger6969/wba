import { z } from 'zod';

export const groupIdParam = z.object({
  groupId: z.string().uuid(),
});

export const videoUploadUrlQuery = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.string().trim().max(150).optional(),
});

export const createVideoBody = z.object({
  title: z.string().trim().min(1).max(200),
  videoKey: z.string().min(1),
  durationSec: z.coerce.number().int().positive().optional(),
});
