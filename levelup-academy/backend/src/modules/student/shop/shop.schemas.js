import { z } from 'zod';

export const itemIdParamSchema = z.object({
  itemId: z.string().uuid(),
});

export const createItemSchema = z.object({
  name: z.string().min(1).max(160),
  imageKey: z.string().max(512).optional(),
  coinPrice: z.coerce.number().int().positive(),
  stock: z.coerce.number().int().min(0),
});

export const updateItemSchema = z
  .object({
    name: z.string().min(1).max(160).optional(),
    imageKey: z.string().max(512).optional(),
    coinPrice: z.coerce.number().int().positive().optional(),
    stock: z.coerce.number().int().min(0).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });
