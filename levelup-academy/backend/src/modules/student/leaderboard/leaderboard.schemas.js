import { z } from 'zod';

export const leaderboardQuerySchema = z.object({
  period: z.enum(['week', 'month']).default('week'),
  groupId: z.string().uuid().optional(),
});
