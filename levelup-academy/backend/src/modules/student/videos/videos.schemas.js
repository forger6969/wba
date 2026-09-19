import { z } from 'zod';

export const videoIdParamSchema = z.object({
  videoId: z.string().uuid(),
});
