import { z } from 'zod';

export const mentorIdParamSchema = z.object({
  mentorId: z.string().uuid(),
});

export const salaryIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const yearQuerySchema = z.object({
  year: z.coerce
    .number()
    .int()
    .min(2000)
    .max(2100)
    .default(new Date().getUTCFullYear()),
});

export const monthQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must be in YYYY-MM format'),
});

// Принимаем как "YYYY-MM", так и полную дату — нормализуем к первому дню месяца,
// т.к. period_month в БД всегда хранит первое число (DATE).
const periodMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])(-\d{2})?$/, 'periodMonth must be YYYY-MM or YYYY-MM-DD')
  .transform((v) => `${v.slice(0, 7)}-01`);

export const upsertSalaryBodySchema = z.object({
  mentorId: z.string().uuid(),
  periodMonth: periodMonthSchema,
  baseAmount: z.coerce.number().nonnegative(),
  bonusAmount: z.coerce.number().nonnegative().default(0),
  note: z.string().max(2000).optional(),
});

export const updateStatusBodySchema = z.object({
  status: z.enum(['approved', 'paid']),
});
