import { z } from 'zod';

export const roomIdParam = z.object({ id: z.string().uuid('Invalid id') });

export const createRoomSchema = z.object({
  name: z.string().trim().min(1).max(60),
  capacity: z.coerce.number().int().positive().optional(),
});

export const updateRoomSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    capacity: z.coerce.number().int().positive().nullable(),
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field is required' });
