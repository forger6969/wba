import { z } from 'zod';

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export const listInvoicesQuery = z.object({
  organizationId: z.string().uuid().optional(),
  status: z.enum(['pending', 'partially_paid', 'paid', 'covered', 'overdue', 'cancelled']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const generateInvoicesSchema = z.object({
  periodCovered: z.string().regex(PERIOD_RE, 'Format: YYYY-MM').optional(),
});

export const cancelInvoiceSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const idParam = z.object({ id: z.string().uuid('Invalid id') });
