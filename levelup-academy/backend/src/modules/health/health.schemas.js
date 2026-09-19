import { z } from 'zod';

export const errorLogQuerySchema = z.object({
  resolved: z.enum(['open', 'resolved', 'all']).default('open'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const idParam = z.object({ id: z.string().uuid('Invalid id') });
