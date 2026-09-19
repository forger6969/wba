import { z } from 'zod';

export const itemIdParam = z.object({ id: z.string().uuid('Invalid id') });
export const orderIdParam = z.object({ id: z.string().uuid('Invalid id') });

export const createShopItemSchema = z.object({
  branchId: z.string().uuid('Invalid branchId'),
  name: z.string().trim().min(1).max(160),
  imageKey: z.string().trim().max(512).optional(),
  coinPrice: z.coerce.number().int().positive(),
  stock: z.coerce.number().int().min(0).optional(),
});

export const updateShopItemSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    imageKey: z.string().trim().max(512),
    coinPrice: z.coerce.number().int().positive(),
    stock: z.coerce.number().int().min(0),
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field is required' });

export const restockItemSchema = z.object({
  stock: z.coerce.number().int().min(0),
});

export const createBranchShopItemSchema = z.object({
  name: z.string().trim().min(1).max(160),
  imageKey: z.string().trim().max(512).optional(),
  coinPrice: z.coerce.number().int().positive(),
  stock: z.coerce.number().int().min(0).default(0),
});

export const listOrdersQuery = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.enum(['pending', 'fulfilled', 'cancelled']).optional(),
});
