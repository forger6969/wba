import { z } from 'zod';

/** Список поступлений (transactions) организации, опционально по филиалу/периоду. */
export const listIncomeSchema = z.object({
  branchId: z.string().uuid('Invalid branchId').optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

/** Ведомость зарплат (mentor_salaries) организации за один месяц. */
export const listSalariesSchema = z.object({
  branchId: z.string().uuid('Invalid branchId').optional(),
  // 'YYYY-MM' — period_month в БД хранится как date (первое число месяца),
  // сюда приходит именно текстовый ключ месяца, приводим к date в репозитории.
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/, 'Expected YYYY-MM').optional(),
});
