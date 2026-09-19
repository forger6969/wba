import { z } from 'zod';

export const setLanguageSchema = z.object({
  language: z.enum(['ru', 'uz']),
});
